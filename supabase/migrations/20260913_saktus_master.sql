-- ============================================================
-- SAKTUS MASTER SCHEMA V3.1 (AGENT BUILD DIRECTIVES SPECIFICATION)
-- ============================================================

-- 1. Profiles username
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 2. Follows (One-way graph; mutual follow derived)
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    followee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, followee_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON public.follows(followee_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follows"
ON public.follows FOR SELECT
USING (true);

CREATE POLICY "Users can follow others"
ON public.follows FOR INSERT
WITH CHECK (auth.uid() = follower_id AND follower_id <> followee_id);

CREATE POLICY "Users can unfollow"
ON public.follows FOR DELETE
USING (auth.uid() = follower_id);

-- 3. Streaks Table (Server-side managed)
CREATE TABLE IF NOT EXISTS public.streaks (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    freezes_available INTEGER DEFAULT 1,
    freezes_used_total INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view streaks"
ON public.streaks FOR SELECT
USING (true);

-- 4. Flashcards Multi-Type & Tags
ALTER TABLE public.flashcards
ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'standard' CHECK (card_type IN ('standard', 'true_false', 'multiple_choice')),
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS correct_answer TEXT;

ALTER TABLE public.flashcard_decks
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];

-- 5. Tasks course link
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_course ON public.tasks(user_id, course_id);

-- 6. Study Rooms (Delta-resilient with pause support)
CREATE TABLE IF NOT EXISTS public.study_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    duration_seconds INTEGER DEFAULT 1500, -- 25m
    elapsed_seconds_at_pause INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    last_resumed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_room_members (
    room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    completed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY(room_id, user_id)
);

ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict study room visibility"
ON public.study_rooms FOR SELECT
USING (
    auth.uid() = host_id
    OR EXISTS (
        SELECT 1 FROM public.study_room_members srm
        WHERE srm.room_id = study_rooms.id AND srm.user_id = auth.uid()
    )
    OR (
        EXISTS (
            SELECT 1 FROM public.follows f1
            WHERE f1.follower_id = auth.uid() AND f1.followee_id = study_rooms.host_id
        )
        AND EXISTS (
            SELECT 1 FROM public.follows f2
            WHERE f2.follower_id = study_rooms.host_id AND f2.followee_id = auth.uid()
        )
    )
    OR EXISTS (
        SELECT 1 FROM public.squad_members sm1
        JOIN public.squad_members sm2 ON sm1.squad_id = sm2.squad_id
        WHERE sm1.user_id = auth.uid() AND sm2.user_id = study_rooms.host_id
    )
);

CREATE POLICY "Hosts can manage their rooms"
ON public.study_rooms FOR ALL
USING (auth.uid() = host_id);

CREATE POLICY "Room members manage their membership"
ON public.study_room_members FOR ALL
USING (auth.uid() = user_id);

-- 7. Notifications (Client can only SELECT, UPDATE read status, and DELETE)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deadline', 'class', 'streak', 'social', 'system')),
    read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notification read status"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- 8. Server-side streak update function
CREATE OR REPLACE FUNCTION public.record_study_activity(
    p_user_id UUID,
    p_activity_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_streak RECORD;
    v_new_streak INTEGER;
    v_new_longest INTEGER;
    v_freezes INTEGER;
BEGIN
    SELECT * INTO v_streak FROM public.streaks WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_active_date, freezes_available)
        VALUES (p_user_id, 1, 1, v_today, 1)
        RETURNING * INTO v_streak;
        RETURN jsonb_build_object('current_streak', 1, 'streak_updated', true);
    END IF;

    IF v_streak.last_active_date = v_today THEN
        RETURN jsonb_build_object('current_streak', v_streak.current_streak, 'streak_updated', false);
    END IF;

    IF v_streak.last_active_date = v_today - 1 THEN
        v_new_streak := v_streak.current_streak + 1;
        v_new_longest := GREATEST(v_streak.longest_streak, v_new_streak);
        
        v_freezes := v_streak.freezes_available;
        IF v_new_streak % 7 = 0 AND v_freezes < 3 THEN
            v_freezes := v_freezes + 1;
        END IF;

        UPDATE public.streaks
        SET current_streak = v_new_streak,
            longest_streak = v_new_longest,
            last_active_date = v_today,
            freezes_available = v_freezes,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        UPDATE public.profiles
        SET study_streak_days = v_new_streak,
            longest_streak_days = v_new_longest,
            last_study_date = v_today,
            streak_freezes_available = v_freezes
        WHERE id = p_user_id;

        RETURN jsonb_build_object('current_streak', v_new_streak, 'streak_updated', true);
    ELSE
        IF v_streak.freezes_available > 0 AND v_streak.last_active_date >= v_today - 2 THEN
            v_new_streak := v_streak.current_streak + 1;
            v_new_longest := GREATEST(v_streak.longest_streak, v_new_streak);

            UPDATE public.streaks
            SET current_streak = v_new_streak,
                longest_streak = v_new_longest,
                last_active_date = v_today,
                freezes_available = v_streak.freezes_available - 1,
                freezes_used_total = v_streak.freezes_used_total + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;

            UPDATE public.profiles
            SET study_streak_days = v_new_streak,
                longest_streak_days = v_new_longest,
                last_study_date = v_today,
                streak_freezes_available = v_streak.freezes_available - 1
            WHERE id = p_user_id;

            RETURN jsonb_build_object('current_streak', v_new_streak, 'freeze_used', true, 'streak_updated', true);
        ELSE
            UPDATE public.streaks
            SET current_streak = 1,
                last_active_date = v_today,
                updated_at = NOW()
            WHERE user_id = p_user_id;

            UPDATE public.profiles
            SET study_streak_days = 1,
                last_study_date = v_today
            WHERE id = p_user_id;

            RETURN jsonb_build_object('current_streak', 1, 'streak_reset', true, 'streak_updated', true);
        END IF;
    END IF;
END;
$$;

-- 9. Notification trigger for follows
CREATE OR REPLACE FUNCTION public.notify_on_new_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_follower_name TEXT;
BEGIN
    SELECT COALESCE(full_name, username, 'A student') INTO v_follower_name
    FROM public.profiles WHERE id = NEW.follower_id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
        NEW.followee_id,
        'New Follower',
        v_follower_name || ' started following your academic activity.',
        'social',
        '/friends'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_follow ON public.follows;
CREATE TRIGGER trg_notify_on_new_follow
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_follow();
