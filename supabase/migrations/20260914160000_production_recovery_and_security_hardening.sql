-- Migration: 20260914_production_recovery_and_security_hardening.sql
-- Description: Production security RLS fixes, atomic review procedure, unstudied cards cockpit due-count reconciliation, and public deck saving repair.

BEGIN;

-- ============================================================================
-- 1. DECK_VIEWS RLS HARDENING
-- ============================================================================
DROP POLICY IF EXISTS deck_views_all ON public.deck_views;
DROP POLICY IF EXISTS deck_views_select ON public.deck_views;
DROP POLICY IF EXISTS deck_views_insert ON public.deck_views;
DROP POLICY IF EXISTS deck_views_delete ON public.deck_views;
DROP POLICY IF EXISTS deck_views_update ON public.deck_views;

CREATE POLICY deck_views_select ON public.deck_views FOR SELECT USING (true);
CREATE POLICY deck_views_insert ON public.deck_views FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY deck_views_delete ON public.deck_views FOR DELETE USING (user_id = (SELECT auth.uid()));
CREATE POLICY deck_views_update ON public.deck_views FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 2. FLASHCARD_DECKS UPDATE & SELECT RLS HARDENING
-- ============================================================================
DROP POLICY IF EXISTS flashcard_decks_update ON public.flashcard_decks;
CREATE POLICY flashcard_decks_update ON public.flashcard_decks FOR UPDATE
USING (
  (user_id = (SELECT auth.uid())) OR 
  check_is_deck_member(id, (SELECT auth.uid()), 'editor'::text)
)
WITH CHECK (
  user_id = (SELECT d.user_id FROM public.flashcard_decks d WHERE d.id = flashcard_decks.id)
);

DROP POLICY IF EXISTS flashcard_decks_select ON public.flashcard_decks;
CREATE POLICY flashcard_decks_select ON public.flashcard_decks FOR SELECT
USING (
  (user_id = (SELECT auth.uid())) 
  OR (visibility = 'public') 
  OR (
    (visibility = 'friends') AND (
      EXISTS (
        SELECT 1 FROM public.friendships
        WHERE status = 'accepted'
          AND (((user_id = flashcard_decks.user_id) AND (friend_id = (SELECT auth.uid())))
            OR ((user_id = (SELECT auth.uid())) AND (friend_id = flashcard_decks.user_id)))
      )
      OR EXISTS (
        SELECT 1 FROM public.follows f1
        JOIN public.follows f2 ON f1.follower_id = f2.followee_id AND f1.followee_id = f2.follower_id
        WHERE f1.follower_id = (SELECT auth.uid()) AND f1.followee_id = flashcard_decks.user_id
      )
    )
  )
  OR check_is_deck_member(id, (SELECT auth.uid()))
);

-- ============================================================================
-- 3. FLASHCARDS SELECT RLS HARDENING (FRIENDS & MUTUAL FOLLOWS)
-- ============================================================================
DROP POLICY IF EXISTS flashcards_select ON public.flashcards;
CREATE POLICY flashcards_select ON public.flashcards FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.flashcard_decks d
    WHERE d.id = flashcards.deck_id
      AND (
        (d.user_id = (SELECT auth.uid()))
        OR (d.visibility = 'public')
        OR (
          (d.visibility = 'friends') AND (
            EXISTS (
              SELECT 1 FROM public.friendships
              WHERE status = 'accepted'
                AND (((user_id = d.user_id) AND (friend_id = (SELECT auth.uid())))
                  OR ((user_id = (SELECT auth.uid())) AND (friend_id = d.user_id)))
            )
            OR EXISTS (
              SELECT 1 FROM public.follows f1
              JOIN public.follows f2 ON f1.follower_id = f2.followee_id AND f1.followee_id = f2.follower_id
              WHERE f1.follower_id = (SELECT auth.uid()) AND f1.followee_id = d.user_id
            )
          )
        )
        OR check_is_deck_member(d.id, (SELECT auth.uid()))
      )
  )
);

-- ============================================================================
-- 4. FRIENDSHIPS RLS FIX
-- ============================================================================
DROP POLICY IF EXISTS "Users view their friendships" ON public.friendships;
DROP POLICY IF EXISTS friendships_select ON public.friendships;
DROP POLICY IF EXISTS friendships_insert ON public.friendships;
DROP POLICY IF EXISTS friendships_update ON public.friendships;
DROP POLICY IF EXISTS friendships_delete ON public.friendships;

CREATE POLICY friendships_select ON public.friendships FOR SELECT
USING (((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) = friend_id));

CREATE POLICY friendships_insert ON public.friendships FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY friendships_update ON public.friendships FOR UPDATE
USING (((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) = friend_id))
WITH CHECK (((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) = friend_id));

CREATE POLICY friendships_delete ON public.friendships FOR DELETE
USING (((SELECT auth.uid()) = user_id) OR ((SELECT auth.uid()) = friend_id));

-- ============================================================================
-- 5. COURSES RLS REPAIR (ALLOW ACCESS ON PUBLIC/SHARED DECKS)
-- ============================================================================
DROP POLICY IF EXISTS "Users manage their own courses" ON public.courses;
DROP POLICY IF EXISTS courses_owner_manage ON public.courses;
DROP POLICY IF EXISTS courses_shared_select ON public.courses;

CREATE POLICY courses_owner_manage ON public.courses FOR ALL
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY courses_shared_select ON public.courses FOR SELECT
USING (
  (user_id = (SELECT auth.uid())) OR
  EXISTS (
    SELECT 1 FROM public.flashcard_decks d
    WHERE d.course_id = courses.id
      AND (
        d.visibility = 'public'
        OR check_is_deck_member(d.id, (SELECT auth.uid()))
      )
  )
);

-- ============================================================================
-- 6. SAVE_PUBLIC_DECK PARAMETER FLEXIBILITY
-- ============================================================================
CREATE OR REPLACE FUNCTION public.save_public_deck(
    p_source_deck_id UUID DEFAULT NULL,
    p_deck_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_target_id UUID := COALESCE(p_source_deck_id, p_deck_id);
    v_user_id UUID := auth.uid();
    v_new_deck_id UUID;
    v_source RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Sign in required';
    END IF;

    IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Deck ID is required';
    END IF;

    SELECT d.*, p.username INTO v_source
    FROM public.flashcard_decks d
    LEFT JOIN public.profiles p ON p.id = d.user_id
    WHERE d.id = v_target_id 
      AND (d.visibility = 'public' OR d.user_id = v_user_id);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Deck not available to save';
    END IF;

    INSERT INTO public.flashcard_decks (
        user_id, course_id, title, description, visibility, tags, 
        source_deck_id, source_creator_username
    ) VALUES (
        v_user_id, NULL, v_source.title, v_source.description, 'private', v_source.tags,
        v_target_id, v_source.username
    ) RETURNING id INTO v_new_deck_id;

    INSERT INTO public.flashcards (
        deck_id, user_id, position, card_type, options, correct_answer, 
        front_content, back_content, front_text, back_text
    )
    SELECT 
        v_new_deck_id, v_user_id, position, card_type, options, correct_answer, 
        front_content, back_content, front_text, back_text
    FROM public.flashcards
    WHERE deck_id = v_target_id;

    INSERT INTO public.deck_saves (deck_id, user_id, source_deck_id)
    VALUES (v_new_deck_id, v_user_id, v_target_id)
    ON CONFLICT DO NOTHING;

    RETURN v_new_deck_id;
END;
$$;

-- ============================================================================
-- 7. ATOMIC SUBMIT_FLASHCARD_REVIEW PROCEDURE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_flashcard_review(
    p_card_id UUID,
    p_rating TEXT,
    p_response_time_ms INTEGER DEFAULT NULL,
    p_client_tz TEXT DEFAULT 'Africa/Johannesburg',
    p_study_mode TEXT DEFAULT 'standard',
    p_deck_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deck_id UUID;
    v_deck_visibility TEXT;
    v_deck_owner UUID;
    v_card RECORD;
    v_state RECORD;
    v_local_date DATE;
    v_quality INTEGER;
    v_rep INTEGER;
    v_interval INTEGER;
    v_ease NUMERIC(4,2);
    v_next_due DATE;
    v_requeue BOOLEAN := false;
    v_new_state JSONB;
    v_streak_res JSONB;
    v_reviews_today INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Sign in required';
    END IF;

    SELECT c.id, c.deck_id, d.visibility, d.user_id AS deck_owner
    INTO v_card
    FROM public.flashcards c
    JOIN public.flashcard_decks d ON d.id = c.deck_id
    WHERE c.id = p_card_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Card does not exist';
    END IF;

    v_deck_id := v_card.deck_id;

    IF v_card.deck_owner != v_user_id 
       AND v_card.visibility != 'public' 
       AND NOT EXISTS (
           SELECT 1 FROM public.deck_members 
           WHERE deck_id = v_deck_id AND user_id = v_user_id
       ) 
       AND NOT (
           v_card.visibility = 'friends' AND (
               EXISTS (SELECT 1 FROM public.friendships WHERE status = 'accepted' AND ((user_id = v_card.deck_owner AND friend_id = v_user_id) OR (user_id = v_user_id AND friend_id = v_card.deck_owner)))
               OR EXISTS (SELECT 1 FROM public.follows f1 JOIN public.follows f2 ON f1.follower_id = f2.followee_id AND f1.followee_id = f2.follower_id WHERE f1.follower_id = v_user_id AND f1.followee_id = v_card.deck_owner)
           )
       )
    THEN
        RAISE EXCEPTION 'FORBIDDEN: You do not have access to study this card';
    END IF;

    BEGIN
        v_local_date := (NOW() AT TIME ZONE p_client_tz)::DATE;
    EXCEPTION WHEN OTHERS THEN
        v_local_date := CURRENT_DATE;
    END;

    IF p_rating IN ('retry', 'again') THEN
        v_quality := 0;
    ELSIF p_rating = 'hard' THEN
        v_quality := 2;
    ELSIF p_rating = 'good' THEN
        v_quality := 4;
    ELSIF p_rating = 'easy' THEN
        v_quality := 5;
    ELSE
        v_quality := 4;
    END IF;

    SELECT * INTO v_state
    FROM public.flashcard_review_states
    WHERE user_id = v_user_id AND card_id = p_card_id;

    IF NOT FOUND THEN
        v_rep := 0;
        v_interval := 0;
        v_ease := 2.50;
    ELSE
        v_rep := COALESCE(v_state.repetition_number, 0);
        v_interval := COALESCE(v_state.interval_days, 0);
        v_ease := COALESCE(v_state.ease_factor, 2.50);
    END IF;

    IF v_quality < 2 THEN
        v_rep := 0;
        v_interval := 1;
        v_ease := GREATEST(1.30, v_ease - 0.20);
        v_next_due := v_local_date;
        v_requeue := true;
    ELSE
        IF v_quality = 2 THEN
            v_ease := GREATEST(1.30, v_ease - 0.15);
            IF v_rep = 0 THEN
                v_interval := 1;
            ELSE
                v_interval := GREATEST(1, FLOOR(v_interval * 1.2));
            END IF;
        ELSIF v_quality = 4 THEN
            IF v_rep = 0 THEN
                v_interval := 1;
            ELSIF v_rep = 1 THEN
                v_interval := 6;
            ELSE
                v_interval := ROUND(v_interval * v_ease);
            END IF;
        ELSIF v_quality = 5 THEN
            v_ease := LEAST(3.00, v_ease + 0.15);
            IF v_rep = 0 THEN
                v_interval := 4;
            ELSIF v_rep = 1 THEN
                v_interval := 10;
            ELSE
                v_interval := ROUND(v_interval * v_ease * 1.3);
            END IF;
        END IF;

        v_rep := v_rep + 1;
        v_interval := LEAST(180, GREATEST(1, v_interval));
        v_next_due := v_local_date + v_interval;
        v_requeue := false;
    END IF;

    INSERT INTO public.flashcard_review_events (
        user_id, card_id, deck_id, rating, study_mode, response_time_ms, reviewed_at
    ) VALUES (
        v_user_id, p_card_id, v_deck_id, 
        CASE WHEN p_rating = 'again' THEN 'retry' ELSE p_rating END,
        COALESCE(p_study_mode, 'standard'),
        p_response_time_ms,
        NOW()
    );

    IF COALESCE(p_study_mode, 'standard') = 'standard' OR p_study_mode = 'srs' THEN
        INSERT INTO public.flashcard_review_states (
            user_id, card_id, repetition_number, interval_days, ease_factor, due_date, last_reviewed_at, updated_at
        ) VALUES (
            v_user_id, p_card_id, v_rep, v_interval, v_ease, v_next_due, NOW(), NOW()
        )
        ON CONFLICT (user_id, card_id) DO UPDATE SET
            repetition_number = EXCLUDED.repetition_number,
            interval_days = EXCLUDED.interval_days,
            ease_factor = EXCLUDED.ease_factor,
            due_date = EXCLUDED.due_date,
            last_reviewed_at = NOW(),
            updated_at = NOW()
        RETURNING jsonb_build_object(
            'card_id', card_id,
            'repetition_number', repetition_number,
            'interval_days', interval_days,
            'ease_factor', ease_factor,
            'due_date', due_date,
            'last_reviewed_at', last_reviewed_at
        ) INTO v_new_state;
    ELSE
        v_new_state := jsonb_build_object(
            'card_id', p_card_id,
            'repetition_number', v_rep,
            'interval_days', v_interval,
            'ease_factor', v_ease,
            'due_date', v_next_due
        );
    END IF;

    SELECT COUNT(*) INTO v_reviews_today
    FROM public.flashcard_review_events
    WHERE user_id = v_user_id AND (reviewed_at AT TIME ZONE p_client_tz)::DATE = v_local_date;

    IF v_reviews_today >= 15 THEN
        BEGIN
            v_streak_res := public.record_study_activity(v_user_id, 'flashcards');
        EXCEPTION WHEN OTHERS THEN
            v_streak_res := NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'requeue', v_requeue,
        'in_session_requeue', v_requeue,
        'next_review_date', v_next_due,
        'repetition_number', v_rep,
        'interval_days', v_interval,
        'ease_factor', v_ease,
        'reviews_today', v_reviews_today,
        'streak_info', v_streak_res,
        'new_streak', COALESCE((v_streak_res->>'current_streak')::INTEGER, 0),
        'streak_incremented', COALESCE((v_streak_res->>'streak_updated')::BOOLEAN, false),
        'review_state', v_new_state
    );
END;
$$;

DROP POLICY IF EXISTS deck_reports_select ON public.deck_reports;
CREATE POLICY deck_reports_select ON public.deck_reports FOR SELECT
USING (reporter_id = (SELECT auth.uid()));

-- ============================================================================
-- 8. GET_STUDENT_HOME_COCKPIT (UNSTUDIED CARDS COUNTED AS DUE)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_student_home_cockpit(p_timezone text DEFAULT 'Africa/Johannesburg')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_local_date DATE;
    v_cards_due INTEGER;
    v_mastery_avg INTEGER;
    v_study_mins_today INTEGER;
    v_weekly_data JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Sign in required';
    END IF;

    BEGIN
        v_local_date := (NOW() AT TIME ZONE p_timezone)::DATE;
    EXCEPTION WHEN OTHERS THEN
        v_local_date := CURRENT_DATE;
    END;

    SELECT COUNT(DISTINCT c.id) INTO v_cards_due
    FROM public.flashcards c
    JOIN public.flashcard_decks d ON d.id = c.deck_id
    LEFT JOIN public.flashcard_review_states rs ON rs.card_id = c.id AND rs.user_id = v_user_id
    WHERE (d.user_id = v_user_id OR check_is_deck_member(d.id, v_user_id))
      AND (rs.due_date IS NULL OR rs.due_date <= v_local_date);

    SELECT COALESCE(ROUND(AVG(
        CASE WHEN total_cards > 0 THEN (mastered_cards::FLOAT / total_cards * 100) ELSE 0 END
    )), 0) INTO v_mastery_avg
    FROM (
        SELECT 
            d.id,
            COUNT(c.id) AS total_cards,
            COUNT(rs.id) FILTER (WHERE rs.interval_days >= 21) AS mastered_cards
        FROM public.flashcard_decks d
        LEFT JOIN public.flashcards c ON c.deck_id = d.id
        LEFT JOIN public.flashcard_review_states rs ON rs.card_id = c.id AND rs.user_id = v_user_id
        WHERE d.user_id = v_user_id
        GROUP BY d.id
    ) sub;

    SELECT COALESCE(SUM(duration_seconds) / 60, 0) INTO v_study_mins_today
    FROM public.study_sessions
    WHERE user_id = v_user_id AND (completed_at AT TIME ZONE p_timezone)::DATE = v_local_date;

    SELECT jsonb_agg(daily_min) INTO v_weekly_data
    FROM (
        SELECT 
            d::DATE AS study_date,
            COALESCE(SUM(ss.duration_seconds) / 60, 0) AS minutes
        FROM generate_series(v_local_date - INTERVAL '6 days', v_local_date, INTERVAL '1 day') AS d
        LEFT JOIN public.study_sessions ss 
            ON ss.user_id = v_user_id 
            AND (ss.completed_at AT TIME ZONE p_timezone)::DATE = d::DATE
        GROUP BY d::DATE
        ORDER BY d::DATE ASC
    ) daily_min;

    RETURN jsonb_build_object(
        'cards_due_today', v_cards_due,
        'decks_mastery_avg', v_mastery_avg,
        'study_minutes_today', v_study_mins_today,
        'weekly_study_minutes', v_weekly_data,
        'resolved_study_date', v_local_date
    );
END;
$$;

COMMIT;
