-- Migration: 20260914_database_integrity_and_performance.sql
-- Description: Fix column nullability constraints, foreign key indexes, RLS initplans, security invoker functions, and alias views.

-- 1. Schema nullability adjustments & defaults
ALTER TABLE public.flashcard_decks ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.timetable_classes ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.assessments ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- 2. Create alias view for classes -> timetable_classes with security invoker
CREATE OR REPLACE VIEW public.classes WITH (security_invoker = true) AS SELECT * FROM public.timetable_classes;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO anon;

-- 3. Unindexed Foreign Keys (Covering Indexes)
CREATE INDEX IF NOT EXISTS idx_assessments_course_id ON public.assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON public.assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_course_id ON public.flashcard_decks(course_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_id ON public.flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_user_id ON public.squad_members(user_id);
CREATE INDEX IF NOT EXISTS idx_squads_created_by ON public.squads(created_by);
CREATE INDEX IF NOT EXISTS idx_study_room_members_user_id ON public.study_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_course_id ON public.study_rooms(course_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_host_id ON public.study_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_course_id ON public.study_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_course_id ON public.tasks(course_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_classes_course_id ON public.timetable_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_timetable_classes_user_id ON public.timetable_classes(user_id);

-- 4. Function Search Path & Execution Privileges (Security Hardening)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_new_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE EXECUTE ON FUNCTION public.notify_on_new_follow() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public, anon, authenticated;

-- Streaks RLS
CREATE POLICY "Users can insert own streaks" ON public.streaks
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own streaks" ON public.streaks
    FOR UPDATE USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.record_study_activity(p_user_id uuid, p_activity_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_streak RECORD;
    v_new_streak INTEGER;
    v_new_longest INTEGER;
    v_freezes INTEGER;
BEGIN
    IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Cannot record activity for another user';
    END IF;

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
                streak_freezes_available = v_freezes - 1
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

REVOKE EXECUTE ON FUNCTION public.record_study_activity(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.record_study_activity(uuid, text) TO authenticated;

-- 5. Optimize RLS Policies with (select auth.uid()) for InitPlan O(1) performance
DROP POLICY IF EXISTS "Users can view and edit their own profiles" ON public.profiles;
CREATE POLICY "Users can view and edit their own profiles" ON public.profiles
    FOR ALL USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users manage their own courses" ON public.courses;
CREATE POLICY "Users manage their own courses" ON public.courses
    FOR ALL USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage their own timetable" ON public.timetable_classes;
CREATE POLICY "Users manage their own timetable" ON public.timetable_classes
    FOR ALL USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage their own assessments" ON public.assessments;
CREATE POLICY "Users manage their own assessments" ON public.assessments
    FOR ALL USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage their own decks" ON public.flashcard_decks;
CREATE POLICY "Users manage their own decks" ON public.flashcard_decks
    FOR ALL USING (((select auth.uid()) = user_id) OR (is_public = true))
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage their own flashcards" ON public.flashcards;
CREATE POLICY "Users manage their own flashcards" ON public.flashcards
    FOR ALL USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage their study sessions" ON public.study_sessions;
CREATE POLICY "Users manage their study sessions" ON public.study_sessions
    FOR ALL USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users view their friendships" ON public.friendships;
CREATE POLICY "Users view their friendships" ON public.friendships
    FOR ALL USING (((select auth.uid()) = user_id) OR ((select auth.uid()) = friend_id))
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage squads" ON public.squads;
CREATE POLICY "Users manage squads" ON public.squads
    FOR ALL USING ((select auth.uid()) = created_by)
    WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Members view their squad" ON public.squad_members;
CREATE POLICY "Members view their squad" ON public.squad_members
    FOR ALL USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "own_sessions" ON public.sessions;
CREATE POLICY "own_sessions" ON public.sessions
    FOR ALL USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "own_stats" ON public.stats;
CREATE POLICY "own_stats" ON public.stats
    FOR ALL USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "own_tasks" ON public.tasks;
CREATE POLICY "own_tasks" ON public.tasks
    FOR ALL USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others" ON public.follows
    FOR INSERT WITH CHECK (((select auth.uid()) = follower_id) AND (follower_id <> followee_id));

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" ON public.follows
    FOR DELETE USING ((select auth.uid()) = follower_id);

DROP POLICY IF EXISTS "Room members manage their membership" ON public.study_room_members;
CREATE POLICY "Room members manage their membership" ON public.study_room_members
    FOR ALL USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own notification read status" ON public.notifications;
CREATE POLICY "Users update own notification read status" ON public.notifications
    FOR UPDATE USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications" ON public.notifications
    FOR DELETE USING ((select auth.uid()) = user_id);

-- 6. Resolve Multiple Permissive Policies on study_rooms:
DROP POLICY IF EXISTS "Hosts can manage their rooms" ON public.study_rooms;
DROP POLICY IF EXISTS "Strict study room visibility" ON public.study_rooms;

CREATE POLICY "Strict study room visibility" ON public.study_rooms
    FOR SELECT USING (
        ((select auth.uid()) = host_id)
        OR EXISTS (
            SELECT 1 FROM public.study_room_members srm
            WHERE srm.room_id = study_rooms.id AND srm.user_id = (select auth.uid())
        )
        OR (
            EXISTS (
                SELECT 1 FROM public.follows f1
                WHERE f1.follower_id = (select auth.uid()) AND f1.followee_id = study_rooms.host_id
            )
            AND EXISTS (
                SELECT 1 FROM public.follows f2
                WHERE f2.follower_id = study_rooms.host_id AND f2.followee_id = (select auth.uid())
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.squad_members sm1
            JOIN public.squad_members sm2 ON sm1.squad_id = sm2.squad_id
            WHERE sm1.user_id = (select auth.uid()) AND sm2.user_id = study_rooms.host_id
        )
    );

CREATE POLICY "Hosts can insert rooms" ON public.study_rooms
    FOR INSERT WITH CHECK ((select auth.uid()) = host_id);

CREATE POLICY "Hosts can update their rooms" ON public.study_rooms
    FOR UPDATE USING ((select auth.uid()) = host_id)
    WITH CHECK ((select auth.uid()) = host_id);

CREATE POLICY "Hosts can delete their rooms" ON public.study_rooms
    FOR DELETE USING ((select auth.uid()) = host_id);
