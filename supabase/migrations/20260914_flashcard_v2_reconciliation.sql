-- Migration: 20260914_flashcard_v2_reconciliation.sql
-- Description: Flashcard V2 Schema Reconciliation, Zero-Downtime Dual-Write Triggers, Hardened RLS, and Stored Procedures

BEGIN;

-- ============================================================================
-- 1. EXTEND EXISTING TABLES
-- ============================================================================

-- 1.1 flashcard_decks
ALTER TABLE public.flashcard_decks
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' 
    CHECK (visibility IN ('private', 'friends', 'public')),
  ADD COLUMN IF NOT EXISTS revision INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS source_deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_creator_username TEXT;

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_visibility ON public.flashcard_decks(visibility);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_source_deck_id ON public.flashcard_decks(source_deck_id);

-- 1.2 flashcards
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS front_content JSONB DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS back_content JSONB DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL;

CREATE INDEX IF NOT EXISTS idx_flashcards_deck_position ON public.flashcards(deck_id, position);

-- ============================================================================
-- 2. CREATE NEW FLASHCARD ARCHITECTURE TABLES
-- ============================================================================

-- 2.1 Per-User SRS State
CREATE TABLE IF NOT EXISTS public.flashcard_review_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    card_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE NOT NULL,
    repetition_number INTEGER DEFAULT 0 NOT NULL,
    interval_days INTEGER DEFAULT 0 NOT NULL,
    ease_factor NUMERIC(4, 2) DEFAULT 2.50 NOT NULL,
    due_date DATE DEFAULT CURRENT_DATE NOT NULL,
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_user_card_review UNIQUE (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_review_states_lookup 
ON public.flashcard_review_states(user_id, due_date);

CREATE INDEX IF NOT EXISTS idx_review_states_card 
ON public.flashcard_review_states(card_id);

-- 2.2 Review Audit & Analytics Events
CREATE TABLE IF NOT EXISTS public.flashcard_review_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key UUID UNIQUE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    card_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE NOT NULL,
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    rating TEXT CHECK (rating IN ('retry', 'hard', 'good', 'easy')) NOT NULL,
    study_mode TEXT DEFAULT 'standard' CHECK (study_mode IN ('standard', 'cram', 'mcq', 'true_false', 'match')) NOT NULL,
    response_time_ms INTEGER,
    reviewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_events_user_time 
ON public.flashcard_review_events(user_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_events_deck 
ON public.flashcard_review_events(deck_id);

-- 2.3 Collaborators (Ownership invariant: flashcard_decks.user_id is owner)
CREATE TABLE IF NOT EXISTS public.deck_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('editor', 'viewer')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_deck_member UNIQUE (deck_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_deck_members_user 
ON public.deck_members(user_id);

CREATE INDEX IF NOT EXISTS idx_deck_members_deck 
ON public.deck_members(deck_id);

-- 2.4 Deck Saves (Attribution & Fork Lineage)
CREATE TABLE IF NOT EXISTS public.deck_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    source_deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_deck_save UNIQUE (user_id, deck_id)
);

-- 2.5 Deduplicated Daily Views
CREATE TABLE IF NOT EXISTS public.deck_views (
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    viewed_date DATE DEFAULT CURRENT_DATE NOT NULL,
    PRIMARY KEY (deck_id, user_id, viewed_date)
);

-- 2.6 Ratings (1-5 stars)
CREATE TABLE IF NOT EXISTS public.deck_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_deck_user_rating UNIQUE (deck_id, user_id)
);

-- 2.7 Content Moderation Reports
CREATE TABLE IF NOT EXISTS public.deck_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT CHECK (reason IN ('academic_dishonesty', 'inappropriate', 'copyright', 'spam')) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 3. BIDIRECTIONAL COMPATIBILITY TRIGGERS
-- ============================================================================

-- 3.1 Visibility Compatibility Trigger
CREATE OR REPLACE FUNCTION public.sync_flashcard_deck_visibility()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.visibility IS NOT NULL THEN
      NEW.is_public := (NEW.visibility = 'public');
    ELSIF NEW.is_public IS NOT NULL THEN
      NEW.visibility := CASE WHEN NEW.is_public = true THEN 'public' ELSE 'private' END;
    ELSE
      NEW.visibility := 'private';
      NEW.is_public := false;
    END IF;
  ELSE
    IF NEW.visibility IS DISTINCT FROM OLD.visibility THEN
      NEW.is_public := (NEW.visibility = 'public');
    ELSIF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
      NEW.visibility := CASE WHEN NEW.is_public = true THEN 'public' ELSE 'private' END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_deck_visibility ON public.flashcard_decks;
CREATE TRIGGER trg_sync_deck_visibility
BEFORE INSERT OR UPDATE ON public.flashcard_decks
FOR EACH ROW EXECUTE FUNCTION public.sync_flashcard_deck_visibility();

-- 3.2 Sync New Review States to Legacy Flashcards
CREATE OR REPLACE FUNCTION public.sync_review_state_to_legacy_flashcard()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.flashcards
  SET 
    repetition_number = NEW.repetition_number,
    interval_days = NEW.interval_days,
    ease_factor = NEW.ease_factor,
    due_date = NEW.due_date,
    updated_at = NEW.updated_at
  WHERE id = NEW.card_id AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_sync_review_state_to_legacy ON public.flashcard_review_states;
CREATE TRIGGER trg_sync_review_state_to_legacy
AFTER INSERT OR UPDATE ON public.flashcard_review_states
FOR EACH ROW EXECUTE FUNCTION public.sync_review_state_to_legacy_flashcard();

-- 3.3 Sync Legacy Flashcard Updates to New Review States
CREATE OR REPLACE FUNCTION public.sync_legacy_flashcard_to_review_state()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') AND (
     (NEW.repetition_number IS DISTINCT FROM OLD.repetition_number) OR
     (NEW.interval_days IS DISTINCT FROM OLD.interval_days) OR
     (NEW.ease_factor IS DISTINCT FROM OLD.ease_factor) OR
     (NEW.due_date IS DISTINCT FROM OLD.due_date)
  ) THEN
    INSERT INTO public.flashcard_review_states (
      user_id, card_id, repetition_number, interval_days, ease_factor, due_date, updated_at
    ) VALUES (
      NEW.user_id, NEW.id, 
      COALESCE(NEW.repetition_number, 0), 
      COALESCE(NEW.interval_days, 0), 
      COALESCE(NEW.ease_factor, 2.50), 
      COALESCE(NEW.due_date, CURRENT_DATE), 
      NOW()
    )
    ON CONFLICT (user_id, card_id) DO UPDATE SET
      repetition_number = EXCLUDED.repetition_number,
      interval_days = EXCLUDED.interval_days,
      ease_factor = EXCLUDED.ease_factor,
      due_date = EXCLUDED.due_date,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_sync_legacy_flashcard_to_review ON public.flashcards;
CREATE TRIGGER trg_sync_legacy_flashcard_to_review
AFTER UPDATE ON public.flashcards
FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_flashcard_to_review_state();

-- ============================================================================
-- 4. IDEMPOTENT BACKFILL
-- ============================================================================

-- Backfill visibility
UPDATE public.flashcard_decks
SET visibility = CASE WHEN is_public = true THEN 'public' ELSE 'private' END
WHERE visibility IS NULL;

-- Backfill positions sequentially
WITH numbered_cards AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY deck_id ORDER BY created_at ASC) - 1 AS new_pos
  FROM public.flashcards
)
UPDATE public.flashcards f
SET position = nc.new_pos
FROM numbered_cards nc
WHERE f.id = nc.id AND (f.position IS NULL OR f.position = 0);

-- Backfill AST content from text
UPDATE public.flashcards
SET front_content = jsonb_build_object(
  'type', 'doc',
  'content', jsonb_build_array(
    jsonb_build_object(
      'type', 'paragraph',
      'content', jsonb_build_array(
        jsonb_build_object('type', 'text', 'text', COALESCE(front_text, ''))
      )
    )
  )
)
WHERE front_content IS NULL OR front_content = '{"type":"doc","content":[]}'::jsonb;

UPDATE public.flashcards
SET back_content = jsonb_build_object(
  'type', 'doc',
  'content', jsonb_build_array(
    jsonb_build_object(
      'type', 'paragraph',
      'content', jsonb_build_array(
        jsonb_build_object('type', 'text', 'text', COALESCE(back_text, ''))
      )
    )
  )
)
WHERE back_content IS NULL OR back_content = '{"type":"doc","content":[]}'::jsonb;

-- Backfill initial review states
INSERT INTO public.flashcard_review_states (
  user_id, card_id, repetition_number, interval_days, ease_factor, due_date, updated_at
)
SELECT 
  user_id, 
  id, 
  COALESCE(repetition_number, 0), 
  COALESCE(interval_days, 0), 
  COALESCE(ease_factor, 2.50), 
  COALESCE(due_date, CURRENT_DATE), 
  COALESCE(updated_at, NOW())
FROM public.flashcards
ON CONFLICT (user_id, card_id) DO NOTHING;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- 5.1 flashcard_decks RLS
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "flashcard_decks_select" ON public.flashcard_decks;
DROP POLICY IF EXISTS "flashcard_decks_insert" ON public.flashcard_decks;
DROP POLICY IF EXISTS "flashcard_decks_update" ON public.flashcard_decks;
DROP POLICY IF EXISTS "flashcard_decks_delete" ON public.flashcard_decks;

CREATE POLICY "flashcard_decks_select" ON public.flashcard_decks
FOR SELECT USING (
  user_id = (SELECT auth.uid())
  OR visibility = 'public'
  OR (visibility = 'friends' AND EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((user_id = flashcard_decks.user_id AND friend_id = (SELECT auth.uid()))
        OR (user_id = (SELECT auth.uid()) AND friend_id = flashcard_decks.user_id))
  ))
  OR EXISTS (
    SELECT 1 FROM public.deck_members
    WHERE deck_id = flashcard_decks.id AND user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "flashcard_decks_insert" ON public.flashcard_decks
FOR INSERT WITH CHECK (
  user_id = (SELECT auth.uid())
);

CREATE POLICY "flashcard_decks_update" ON public.flashcard_decks
FOR UPDATE USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.deck_members
    WHERE deck_id = flashcard_decks.id AND user_id = (SELECT auth.uid()) AND role = 'editor'
  )
) WITH CHECK (
  user_id = flashcard_decks.user_id
);

CREATE POLICY "flashcard_decks_delete" ON public.flashcard_decks
FOR DELETE USING (
  user_id = (SELECT auth.uid())
);

-- 5.2 flashcards RLS
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_select" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_insert" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_update" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_delete" ON public.flashcards;

CREATE POLICY "flashcards_select" ON public.flashcards
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.flashcard_decks d
    WHERE d.id = flashcards.deck_id
      AND (
        d.user_id = (SELECT auth.uid())
        OR d.visibility = 'public'
        OR (d.visibility = 'friends' AND EXISTS (
          SELECT 1 FROM public.friendships
          WHERE status = 'accepted'
            AND ((user_id = d.user_id AND friend_id = (SELECT auth.uid()))
              OR (user_id = (SELECT auth.uid()) AND friend_id = d.user_id))
        ))
        OR EXISTS (
          SELECT 1 FROM public.deck_members dm
          WHERE dm.deck_id = d.id AND dm.user_id = (SELECT auth.uid())
        )
      )
  )
);

CREATE POLICY "flashcards_insert" ON public.flashcards
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.flashcard_decks d
    WHERE d.id = flashcards.deck_id
      AND (
        d.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.deck_members dm
          WHERE dm.deck_id = d.id AND dm.user_id = (SELECT auth.uid()) AND dm.role = 'editor'
        )
      )
  )
);

CREATE POLICY "flashcards_update" ON public.flashcards
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.flashcard_decks d
    WHERE d.id = flashcards.deck_id
      AND (
        d.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.deck_members dm
          WHERE dm.deck_id = d.id AND dm.user_id = (SELECT auth.uid()) AND dm.role = 'editor'
        )
      )
  )
);

CREATE POLICY "flashcards_delete" ON public.flashcards
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.flashcard_decks d
    WHERE d.id = flashcards.deck_id
      AND (
        d.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.deck_members dm
          WHERE dm.deck_id = d.id AND dm.user_id = (SELECT auth.uid()) AND dm.role = 'editor'
        )
      )
  )
);

-- 5.3 flashcard_review_states RLS
ALTER TABLE public.flashcard_review_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_states_isolation" ON public.flashcard_review_states;
CREATE POLICY "review_states_isolation" ON public.flashcard_review_states
FOR ALL USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- 5.4 flashcard_review_events RLS
ALTER TABLE public.flashcard_review_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_events_isolation" ON public.flashcard_review_events;
CREATE POLICY "review_events_isolation" ON public.flashcard_review_events
FOR ALL USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- 5.5 deck_members RLS
ALTER TABLE public.deck_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deck_members_select" ON public.deck_members;
DROP POLICY IF EXISTS "deck_members_manage" ON public.deck_members;

CREATE POLICY "deck_members_select" ON public.deck_members
FOR SELECT USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.flashcard_decks d
    WHERE d.id = deck_members.deck_id AND d.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "deck_members_manage" ON public.deck_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.flashcard_decks d
    WHERE d.id = deck_members.deck_id AND d.user_id = (SELECT auth.uid())
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.flashcard_decks d
    WHERE d.id = deck_members.deck_id AND d.user_id = (SELECT auth.uid())
  )
);

-- 5.6 deck_saves RLS
ALTER TABLE public.deck_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deck_saves_isolation" ON public.deck_saves;
CREATE POLICY "deck_saves_isolation" ON public.deck_saves
FOR ALL USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- 5.7 deck_views RLS
ALTER TABLE public.deck_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deck_views_all" ON public.deck_views;
CREATE POLICY "deck_views_all" ON public.deck_views
FOR ALL USING (true)
WITH CHECK (user_id = (SELECT auth.uid()));

-- 5.8 deck_ratings RLS
ALTER TABLE public.deck_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deck_ratings_select" ON public.deck_ratings;
DROP POLICY IF EXISTS "deck_ratings_manage" ON public.deck_ratings;

CREATE POLICY "deck_ratings_select" ON public.deck_ratings
FOR SELECT USING (true);

CREATE POLICY "deck_ratings_manage" ON public.deck_ratings
FOR ALL USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- 5.9 deck_reports RLS
ALTER TABLE public.deck_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deck_reports_insert" ON public.deck_reports;
CREATE POLICY "deck_reports_insert" ON public.deck_reports
FOR INSERT WITH CHECK (reporter_id = (SELECT auth.uid()));

-- ============================================================================
-- 6. HARDENED STORED PROCEDURES & RPCS
-- ============================================================================

-- 6.1 Atomic Reorder with Revision Check
CREATE OR REPLACE FUNCTION public.reorder_flashcards(
    p_deck_id UUID,
    p_card_ids UUID[],
    p_expected_revision INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_owner_id UUID;
    v_current_rev INTEGER;
    v_card_count INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Sign in required';
    END IF;

    SELECT user_id, revision INTO v_owner_id, v_current_rev
    FROM public.flashcard_decks
    WHERE id = p_deck_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Deck does not exist';
    END IF;

    IF v_owner_id != v_user_id AND NOT EXISTS (
        SELECT 1 FROM public.deck_members 
        WHERE deck_id = p_deck_id AND user_id = v_user_id AND role = 'editor'
    ) THEN
        RAISE EXCEPTION 'FORBIDDEN: Insufficient permissions to reorder cards';
    END IF;

    IF v_current_rev != p_expected_revision THEN
        RAISE EXCEPTION 'CONCURRENT_MODIFICATION: Deck was modified by another user. Reload and retry.';
    END IF;

    SELECT COUNT(*) INTO v_card_count FROM public.flashcards WHERE deck_id = p_deck_id;
    IF array_length(p_card_ids, 1) != v_card_count THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Reorder array must contain all cards in the deck';
    END IF;

    UPDATE public.flashcards AS f
    SET position = ord.pos - 1
    FROM unnest(p_card_ids) WITH ORDINALITY AS ord(id, pos)
    WHERE f.id = ord.id AND f.deck_id = p_deck_id;

    UPDATE public.flashcard_decks
    SET revision = revision + 1, updated_at = NOW()
    WHERE id = p_deck_id;

    RETURN v_current_rev + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6.2 Atomic Bulk Card Import
CREATE OR REPLACE FUNCTION public.import_deck_cards(
    p_deck_id UUID,
    p_cards JSONB
)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_owner_id UUID;
    v_inserted_count INTEGER := 0;
    v_current_max_pos INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Sign in required';
    END IF;

    IF jsonb_array_length(p_cards) > 1000 THEN
        RAISE EXCEPTION 'PAYLOAD_TOO_LARGE: Maximum 1000 cards per import batch';
    END IF;

    SELECT user_id INTO v_owner_id FROM public.flashcard_decks WHERE id = p_deck_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Deck does not exist';
    END IF;

    IF v_owner_id != v_user_id AND NOT EXISTS (
        SELECT 1 FROM public.deck_members 
        WHERE deck_id = p_deck_id AND user_id = v_user_id AND role = 'editor'
    ) THEN
        RAISE EXCEPTION 'FORBIDDEN: Insufficient permissions to edit this deck';
    END IF;

    SELECT COALESCE(MAX(position), -1) INTO v_current_max_pos 
    FROM public.flashcards WHERE deck_id = p_deck_id;

    WITH inserted AS (
        INSERT INTO public.flashcards (
            deck_id, user_id, position, front_text, back_text, front_content, back_content
        )
        SELECT 
            p_deck_id,
            v_user_id,
            v_current_max_pos + ord.pos,
            card->>'front',
            card->>'back',
            jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
                jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'text', card->>'front')
                ))
            )),
            jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
                jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'text', card->>'back')
                ))
            ))
        FROM jsonb_array_elements(p_cards) WITH ORDINALITY AS ord(card, pos)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_inserted_count FROM inserted;

    UPDATE public.flashcard_decks 
    SET revision = revision + 1, updated_at = NOW() 
    WHERE id = p_deck_id;

    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6.3 Server-Side Fork & Save Public Deck
CREATE OR REPLACE FUNCTION public.save_public_deck(p_source_deck_id UUID)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_new_deck_id UUID;
    v_source RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Sign in required';
    END IF;

    SELECT d.*, p.username INTO v_source
    FROM public.flashcard_decks d
    LEFT JOIN public.profiles p ON p.id = d.user_id
    WHERE d.id = p_source_deck_id 
      AND (d.visibility = 'public' OR d.user_id = v_user_id);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Deck not available to save';
    END IF;

    -- Create duplicate deck owned by saver
    INSERT INTO public.flashcard_decks (
        user_id, course_id, title, description, visibility, tags, 
        source_deck_id, source_creator_username
    ) VALUES (
        v_user_id, NULL, v_source.title, v_source.description, 'private', v_source.tags,
        p_source_deck_id, v_source.username
    ) RETURNING id INTO v_new_deck_id;

    -- Duplicate cards with fresh IDs and clean SRS state
    INSERT INTO public.flashcards (
        deck_id, user_id, position, card_type, options, correct_answer, 
        front_content, back_content, front_text, back_text
    )
    SELECT 
        v_new_deck_id, v_user_id, position, card_type, options, correct_answer, 
        front_content, back_content, front_text, back_text
    FROM public.flashcards
    WHERE deck_id = p_source_deck_id;

    -- Log attribution
    INSERT INTO public.deck_saves (deck_id, user_id, source_deck_id)
    VALUES (v_new_deck_id, v_user_id, p_source_deck_id)
    ON CONFLICT DO NOTHING;

    RETURN v_new_deck_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6.4 Account Deletion Transaction Workflow
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_deck RECORD;
    v_oldest_editor UUID;
BEGIN
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED: You can only delete your own account';
    END IF;

    FOR v_deck IN SELECT id FROM public.flashcard_decks WHERE user_id = p_user_id LOOP
        SELECT user_id INTO v_oldest_editor
        FROM public.deck_members
        WHERE deck_id = v_deck.id AND role = 'editor'
        ORDER BY created_at ASC LIMIT 1;

        IF v_oldest_editor IS NOT NULL THEN
            UPDATE public.flashcard_decks
            SET user_id = v_oldest_editor, updated_at = NOW()
            WHERE id = v_deck.id;

            DELETE FROM public.deck_members
            WHERE deck_id = v_deck.id AND user_id = v_oldest_editor;
        ELSE
            DELETE FROM public.flashcard_decks WHERE id = v_deck.id;
        END IF;
    END LOOP;

    DELETE FROM public.flashcard_review_states WHERE user_id = p_user_id;
    DELETE FROM public.flashcard_review_events WHERE user_id = p_user_id;
    DELETE FROM public.deck_members WHERE user_id = p_user_id;
    DELETE FROM public.deck_saves WHERE user_id = p_user_id;
    DELETE FROM public.friendships WHERE user_id = p_user_id OR friend_id = p_user_id;
    DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6.5 Offline Review Batch Sync
CREATE OR REPLACE FUNCTION public.sync_offline_reviews(
    p_events JSONB,
    p_timezone TEXT DEFAULT 'UTC'
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_event RECORD;
    v_processed_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_local_date DATE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Sign in required';
    END IF;

    v_local_date := (NOW() AT TIME ZONE p_timezone)::DATE;

    FOR v_event IN SELECT * FROM jsonb_to_recordset(p_events) AS x(
        idempotency_key UUID,
        card_id UUID,
        deck_id UUID,
        rating TEXT,
        study_mode TEXT,
        response_time_ms INTEGER,
        client_timestamp TIMESTAMPTZ
    ) LOOP
        INSERT INTO public.flashcard_review_events (
            idempotency_key, user_id, card_id, deck_id, rating, study_mode, response_time_ms, reviewed_at
        ) VALUES (
            v_event.idempotency_key, v_user_id, v_event.card_id, v_event.deck_id, 
            v_event.rating, COALESCE(v_event.study_mode, 'standard'), v_event.response_time_ms, 
            COALESCE(v_event.client_timestamp, NOW())
        ) ON CONFLICT (idempotency_key) DO NOTHING;

        IF NOT FOUND THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        IF COALESCE(v_event.study_mode, 'standard') = 'standard' THEN
            INSERT INTO public.flashcard_review_states (
                user_id, card_id, repetition_number, interval_days, ease_factor, due_date, last_reviewed_at, updated_at
            ) VALUES (
                v_user_id, v_event.card_id, 1, 1, 2.50, v_local_date + 1, NOW(), NOW()
            )
            ON CONFLICT (user_id, card_id) DO UPDATE SET
                last_reviewed_at = NOW(),
                updated_at = NOW();
        END IF;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN jsonb_build_object('processed', v_processed_count, 'deduplicated', v_skipped_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6.6 Single-Roundtrip Home Cockpit RPC
CREATE OR REPLACE FUNCTION public.get_student_home_cockpit(p_timezone TEXT DEFAULT 'UTC')
RETURNS JSONB AS $$
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

    v_local_date := (NOW() AT TIME ZONE p_timezone)::DATE;

    -- Cards Due Today
    SELECT COUNT(*) INTO v_cards_due
    FROM public.flashcard_review_states 
    WHERE user_id = v_user_id AND due_date <= v_local_date;

    -- Overall Decks Mastery
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

    -- Today's Study Minutes
    SELECT COALESCE(SUM(duration_seconds) / 60, 0) INTO v_study_mins_today
    FROM public.study_sessions
    WHERE user_id = v_user_id AND (completed_at AT TIME ZONE p_timezone)::DATE = v_local_date;

    -- 7-Day Weekly Mini-Graph
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

COMMIT;
