-- ============================================================
-- SAKTUS MIGRATION: User Onboarding, Timezones, Tier & POPIA Security
-- ============================================================

-- 1. Extend Profiles with Timezone, Onboarding, Goal, and Tier
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Johannesburg',
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS daily_study_goal_minutes INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS email_notifications_opt_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'standard', 'pro'));

CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(tier);

-- 2. Update handle_new_user() to capture client timezone & seed streaks
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_timezone TEXT := COALESCE(new.raw_user_meta_data->>'timezone', 'Africa/Johannesburg');
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    timezone,
    has_completed_onboarding,
    daily_study_goal_minutes,
    email_notifications_opt_in,
    tier
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    v_timezone,
    FALSE,
    120,
    FALSE,
    'free'
  )
  ON CONFLICT (id) DO UPDATE
  SET timezone = EXCLUDED.timezone;

  -- Ensure streak record is initialized immediately
  INSERT INTO public.streaks (user_id, current_streak, longest_streak, freezes_available)
  VALUES (new.id, 0, 0, 1)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Timezone-Aware Streak Maintenance Engine
CREATE OR REPLACE FUNCTION public.record_study_activity(
    p_user_id UUID,
    p_activity_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_timezone TEXT;
    v_today DATE;
    v_streak RECORD;
    v_new_streak INTEGER;
    v_new_longest INTEGER;
    v_freezes INTEGER;
BEGIN
    -- Resolve user's actual IANA local timezone
    SELECT COALESCE(timezone, 'Africa/Johannesburg') INTO v_user_timezone
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_user_timezone IS NULL THEN
        v_user_timezone := 'Africa/Johannesburg';
    END IF;

    -- Calculate today's date strictly relative to the user's local clock
    v_today := (NOW() AT TIME ZONE v_user_timezone)::DATE;

    SELECT * INTO v_streak FROM public.streaks WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_active_date, freezes_available)
        VALUES (p_user_id, 1, 1, v_today, 1)
        RETURNING * INTO v_streak;

        UPDATE public.profiles
        SET study_streak_days = 1,
            longest_streak_days = 1,
            last_study_date = v_today,
            streak_freezes_available = 1
        WHERE id = p_user_id;

        RETURN jsonb_build_object('current_streak', 1, 'streak_updated', true);
    END IF;

    -- Already studied today; maintain current streak
    IF v_streak.last_active_date = v_today THEN
        RETURN jsonb_build_object('current_streak', v_streak.current_streak, 'streak_updated', false);
    END IF;

    -- Studied yesterday (consecutive day)
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
        -- Missed 1 day: if freeze available, use freeze to protect streak
        IF v_streak.freezes_available > 0 AND v_streak.last_active_date >= v_today - 2 THEN
            v_new_streak := v_streak.current_streak + 1;
            v_new_longest := GREATEST(v_streak.longest_streak, v_new_streak);
            v_freezes := v_streak.freezes_available - 1;

            -- Check if completing today earns a milestone freeze
            IF v_new_streak % 7 = 0 AND v_freezes < 3 THEN
                v_freezes := v_freezes + 1;
            END IF;

            UPDATE public.streaks
            SET current_streak = v_new_streak,
                longest_streak = v_new_longest,
                last_active_date = v_today,
                freezes_available = v_freezes,
                freezes_used_total = v_streak.freezes_used_total + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;

            UPDATE public.profiles
            SET study_streak_days = v_new_streak,
                longest_streak_days = v_new_longest,
                last_study_date = v_today,
                streak_freezes_available = v_freezes
            WHERE id = p_user_id;

            RETURN jsonb_build_object('current_streak', v_new_streak, 'freeze_used', true, 'streak_updated', true);
        ELSE
            -- Streak broken; study session today starts new 1-day streak
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

-- 4. Fix Profile RLS: Allow authenticated users to browse student profiles
DROP POLICY IF EXISTS "Users can view and edit their own profiles" ON public.profiles;

CREATE POLICY "Users can view student profiles"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. POPIA / GDPR Self-Service Account & Data Deletion
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deleting from auth.users cascades to public.profiles, courses, timetable, etc.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
