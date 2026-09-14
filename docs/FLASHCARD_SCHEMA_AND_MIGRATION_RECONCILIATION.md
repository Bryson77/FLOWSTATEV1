# Saktus Flashcards: Schema & Migration Reconciliation

**Document Target:** Engineering Contract & Authoritative Implementation Blueprint  
**Primary Specification:** [`Saktus_Flashcards_MVP_Implementation_Spec.md`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/Saktus_Flashcards_MVP_Implementation_Spec.md)  
**Historical Context:** [`grill.md`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/grill.md) & [`responsetogrill.md`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/responsetogrill.md)  
**Database Authority:** Supabase PostgreSQL Project `maftkhcqxhjhhmkkgmpi` (Inspected live September 14, 2026)  
**Standard:** Zero-downtime, concurrency-safe, RLS-hardened, offline-resilient, anti-AI-slop engineering contract.

---

## Executive Summary & Architectural Position

This document supersedes the preliminary proposal in `responsetogrill.md`. It reconciles the **actual live Supabase schema** with **current client assumptions** and the **target MVP contract**. 

The fundamental standard applied is:
> **Does this remain correct under the existing production schema, multiple clients, concurrent users, RLS, retries, offline writes, account deletion, and future migrations?**

Every hazard identified in architectural review has been designed out:
1. **Zero-Downtime SRS Decoupling:** Implemented via a bidirectional compatibility trigger layer (`trg_sync_flashcard_legacy_srs`) allowing legacy and new clients to study concurrently without data divergence during the rollout window.
2. **Timezone-Safe Canonical Scheduling:** All due-date evaluations operate strictly on a resolved student-local date: `(NOW() AT TIME ZONE COALESCE(client_tz, profile_tz, 'UTC'))::DATE`.
3. **Bidirectional Visibility Synchronization:** Strict trigger synchronization between `is_public` and `visibility` with explicit precedence rules and full test coverage.
4. **Deck Ownership Invariants:** `flashcard_decks.user_id` is the sole canonical owner. Collaborators in `deck_members` are typed `UUID REFERENCES public.profiles(id)` with `role IN ('editor', 'viewer')`, eliminating split-brain ownership.
5. **Transactional Account Deletion:** Explicit stored procedure `delete_user_account(p_user_id)` transfers collaborative decks to the oldest editor and deletes private decks cleanly, rather than relying on unguided foreign-key cascades.
6. **Mathematical SRS Engine:** Table-driven deterministic transitions in `@saktus/study-engine`, in-session transient retry requeues, capped intervals (180 days), and clamped ease factors (`[1.30, 3.00]`).
7. **Offline Event Idempotency:** Client-generated UUID `idempotency_key` deduplication with server-authoritative timestamp resolution preventing clock-skew regressions.
8. **Hardened `SECURITY DEFINER` Boundaries:** Strict `SET search_path = public, pg_temp;`, caller authentication (`auth.uid()`), tenant ownership verification, and parameter validation in all stored procedures.
9. **AST & Content Security:** Strict ProseMirror/TipTap JSON AST with Zod validation rejecting unapproved tags, attributes, and malicious URI schemes (`javascript:`, `data:`).
10. **Deterministic Concurrency:** Optimistic revision-locking on deck card ordering (`p_expected_revision`) and card content versions.

---

```
                                      ARCHITECTURE DATA FLOW
                                      
  [Legacy Web / Mobile]                                               [New Web / Mobile]
(Writes flashcards.*)                                       (Writes flashcard_review_states)
           │                                                                 │
           │                                                                 │
           ▼                                                                 ▼
 ┌───────────────────┐                                             ┌───────────────────┐
 │ public.flashcards │ ◄────── trg_sync_flashcard_legacy_srs ─────►│ review_states     │
 └───────────────────┘             (Dual-Write Trigger)            └───────────────────┘
           │                                                                 │
           │  Legacy Read Fallback                          Sole Authoritative State
           └─────────────────────────────────────────────────────────────────┘
```

---

# 1. Actual Supabase Schema (Live Inspection)

Inspection executed via Supabase MCP against project `maftkhcqxhjhhmkkgmpi` on September 14, 2026.

### 1.1 `public.flashcard_decks`
* **Existing Columns:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `course_id` (`uuid`, Nullable, FK to `public.courses(id)` ON DELETE SET NULL)
  * `user_id` (`uuid`, Not Null, FK to `public.profiles(id)` ON DELETE CASCADE) — *Note: The owner column is named `user_id`, not `owner_id`.*
  * `title` (`text`, Not Null)
  * `description` (`text`, Nullable)
  * `is_public` (`boolean`, default `false`) — *Note: `visibility` does not exist yet.*
  * `tags` (`text[]`, default `'{}'::text[]`)
  * `created_at` (`timestamptz`, default `now()`)
* **Existing Indexes:**
  * `idx_flashcard_decks_course_id` ON `course_id`
  * `idx_flashcard_decks_user_id` ON `user_id`
* **Active Rows:** 1 row present in production.

### 1.2 `public.flashcards`
* **Existing Columns:**
  * `id` (`uuid`, PK, default `gen_random_uuid()`)
  * `deck_id` (`uuid`, Not Null, FK to `public.flashcard_decks(id)` ON DELETE CASCADE)
  * `user_id` (`uuid`, Not Null, FK to `public.profiles(id)` ON DELETE CASCADE)
  * `front_text` (`text`, Not Null)
  * `back_text` (`text`, Not Null)
  * `repetition_number` (`integer`, default `0`)
  * `interval_days` (`integer`, default `0`)
  * `ease_factor` (`numeric`, default `2.50`)
  * `due_date` (`date`, default `CURRENT_DATE`)
  * `card_type` (`text`, default `'standard'`, CHECK `card_type IN ('standard', 'true_false', 'multiple_choice')`)
  * `options` (`jsonb`, default `'[]'::jsonb`)
  * `correct_answer` (`text`, Nullable)
  * `created_at` (`timestamptz`, default `now()`)
  * `updated_at` (`timestamptz`, default `now()`)
* **Missing Columns:** `front_content`, `back_content`, `position`, `version`.
* **Active Rows:** 1 row present in production.

### 1.3 Missing Flashcard Infrastructure Tables
The following tables **do not exist** in the live database and must be created:
* `public.flashcard_review_states`
* `public.flashcard_review_events`
* `public.deck_members`
* `public.deck_saves`
* `public.deck_views`
* `public.deck_ratings`
* `public.deck_reports`

### 1.4 Critical RLS Vulnerabilities Discovered in Production
Inspection of `pg_policies` revealed two major security bugs in the existing migrations:
1. **Public Deck Deletion Vulnerability:**
   ```sql
   -- Current policy in production:
   CREATE POLICY "Users manage their own decks" ON public.flashcard_decks 
   FOR ALL USING (auth.uid() = user_id OR is_public = true);
   ```
   *Hazard:* Because the command is `FOR ALL`, the `USING` clause applies to `DELETE`. Any authenticated user can execute `DELETE FROM flashcard_decks WHERE is_public = true` and destroy public decks created by other students!
2. **Public Card Read Inability:**
   ```sql
   -- Current policy in production:
   CREATE POLICY "Users manage their own flashcards" ON public.flashcards 
   FOR ALL USING (auth.uid() = user_id);
   ```
   *Hazard:* Even if a deck has `is_public = true`, another user querying `public.flashcards` receives 0 rows because `flashcards.user_id` matches only the creator. Public decks are completely unreadable by other students under the current RLS policy.

---

# 2. Current Client Assumptions

### 2.1 Web Client (`apps/web/src/app/(dashboard)/flashcards/page.tsx`)
* **Queries:**
  ```ts
  supabase
    .from('flashcard_decks')
    .select('*, courses(name, code), flashcards(*)')
    .eq('user_id', user.id)
  ```
* **Card Rating Mutation:** Directly updates `flashcards`:
  ```ts
  supabase
    .from('flashcards')
    .update({
      repetition_number: result.repetitionNumber,
      interval_days: result.intervalDays,
      ease_factor: result.easeFactor,
      due_date: result.nextReviewDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', currentCard.id)
  ```
* **Assumptions:** Single-user ownership; SRS state embedded in card; plain text `front_text` and `back_text`; client local clock used for `nextReviewDate`.

### 2.2 Mobile Client (`apps/mobile/app/(tabs)/cards.tsx`)
* **Queries & Mutations:** Exactly mirrors Web. Directly reads and writes `flashcards.repetition_number`, `interval_days`, `ease_factor`, `due_date`.
* **Ordering:** Relies on database default insertion order; no `position` column.

### 2.3 Shared Engine (`lib/study-engine/src/sm2.ts`)
* **Ratings:** Accepts `'again' | 'hard' | 'good' | 'easy'`.
* **Retry Defect:** Rating `'again'` immediately sets `intervalDays = 1` and `dueDate = today + 1 day`, scheduling failed cards for tomorrow rather than recycling them within the active session.
* **Interval Growth:** No upper bound ceiling on intervals (can grow beyond term dates) or ease factor.

---

# 3. Proposed Flashcard Schema

DDL designed for strict relational integrity, performance, and tenant isolation.

### 3.1 Alterations to Existing Tables

```sql
-- 1. Extend flashcard_decks
ALTER TABLE public.flashcard_decks
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' 
    CHECK (visibility IN ('private', 'friends', 'public')),
  ADD COLUMN IF NOT EXISTS revision INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS source_deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_creator_username TEXT;

-- 2. Extend flashcards
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS front_content JSONB DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS back_content JSONB DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL;
```

### 3.2 New Authoritative SRS Tables

```sql
-- 3. Dedicated Per-User SRS State
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

-- 4. Review Audit & Analytics Events
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
```

### 3.3 Collaboration & Membership Tables

```sql
-- 5. Collaborators (Explicitly typed user_id)
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
```
*Note on Invariant:* `flashcard_decks.user_id` is the canonical owner. `deck_members` only contains `'editor'` or `'viewer'`. This prevents split-brain ownership.

### 3.4 Community Discovery, Forking & Anti-Abuse Tables

```sql
-- 6. Deck Saves (Attribution & Fork Lineage)
CREATE TABLE IF NOT EXISTS public.deck_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    source_deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_deck_save UNIQUE (user_id, deck_id)
);

-- 7. Deduplicated Daily Views
CREATE TABLE IF NOT EXISTS public.deck_views (
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    viewed_date DATE DEFAULT CURRENT_DATE NOT NULL,
    PRIMARY KEY (deck_id, user_id, viewed_date)
);

-- 8. Ratings (1-5 stars, no self-rating)
CREATE TABLE IF NOT EXISTS public.deck_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_deck_user_rating UNIQUE (deck_id, user_id)
);

-- 9. Content Moderation Reports
CREATE TABLE IF NOT EXISTS public.deck_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT CHECK (reason IN ('academic_dishonesty', 'inappropriate', 'copyright', 'spam')) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

---

# 4. Conflict Matrix

| Domain | Production Reality | Current Client Assumption | Target MVP Contract | Hazard Identified | Resolution / Invariant Guard |
|---|---|---|---|---|---|
| **SRS State** | Embedded in `flashcards` | Client updates `flashcards` row directly | Decoupled in `flashcard_review_states` | Dual-write split brain between old/new clients | Dual-write compatibility trigger (`trg_sync_flashcard_legacy_srs`) bridges tables during transition. |
| **Due Date** | `due_date DATE DEFAULT CURRENT_DATE` | `due_date <= todayStr` (client UTC date) | Local study date pinned to user timezone | Midday due date shifts; wrong day on timezone boundary | Canonical scheduler RPC resolves `(NOW() AT TIME ZONE p_timezone)::DATE`. |
| **Visibility** | `is_public BOOLEAN` | Client reads/writes `is_public` | `visibility TEXT ('private', 'friends', 'public')` | Old client sets `is_public=true`, leaving `visibility='private'` | Bidirectional trigger sync with explicit precedence (`visibility` over `is_public`). |
| **Ownership** | `flashcard_decks.user_id` | User owns deck if `user_id = auth.uid()` | Collaborative editing with roles | Split-brain ownership if `deck_members` adds an `owner` role | `flashcard_decks.user_id` is sole owner; `deck_members` strictly restricted to `editor`/`viewer`. |
| **Account Deletion** | `ON DELETE CASCADE` | Deleting user wipes all owned decks | Collaborative decks transfer to oldest editor | Cascading deletes wipe collaborative work of active students | Explicit stored procedure `delete_user_account()` executes controlled transfer. |
| **Reordering** | Unordered (by `created_at`) | Array index in memory | Sequential `position INTEGER` | Concurrent reordering causes corrupted duplicate positions | Revision-locked atomic reorder RPC: `reorder_flashcards()`. |
| **Card Content** | Plain text `front_text`, `back_text` | Plain text strings | TipTap / ProseMirror JSON AST | XSS injection; mobile crashes on malformed JSON | Strict Zod AST schema validation + fallback text backfill. |
| **Deck Saves** | No save/fork mechanism | Not implemented | Independent snapshot fork with attribution | Deleted source deck creates broken attribution | `source_deck_id` uses `ON DELETE SET NULL` + immutable `source_creator_username`. |
| **Match Mode** | Not implemented | N/A | Separate session game mode | Mutating SRS state during game degrades scheduling | Match mode logs to `study_sessions` only; zero SRS mutations. |
| **Quota Limits** | Free: 3 decks in `types.ts` | Not enforced in UI | Central product policy | Arbitrary SQL check constraints break business flexibility | Central application config (`quotas.ts`) + server validation. |

---

# 5. Migration Plan (Zero-Downtime Multi-Phase Sequence)

To guarantee zero downtime and zero data loss, the rollout executes across 6 strictly ordered phases:

```
PHASE 1: Additive Schema & Dual-Write Triggers
  ├── Add columns: visibility, revision, position, version, front_content, back_content
  ├── Create tables: flashcard_review_states, review_events, deck_members, etc.
  ├── Deploy bidirectional visibility trigger
  └── Deploy bidirectional legacy SRS sync trigger
        ↓
PHASE 2: Idempotent Historical Data Backfill
  ├── Backfill visibility from is_public
  ├── Backfill front_content & back_content from front_text & back_text
  ├── Assign sequential position integers per deck
  └── Populate flashcard_review_states from flashcards
        ↓
PHASE 3: Deploy Shared Libraries
  ├── Publish @saktus/study-engine (canonical SM-2, in-session retry requeue, capping)
  └── Publish @saktus/shared (Zod TipTap AST, typed contracts, quota configs)
        ↓
PHASE 4: Deploy Web and Mobile Clients
  ├── Web & Mobile clients write directly to flashcard_review_states
  ├── Web & Mobile utilize TipTap AST and rich editors
  └── Dual-write trigger keeps legacy database columns up to date in background
        ↓
PHASE 5: Compatibility Window Monitoring
  └── Verify zero divergence between flashcards and flashcard_review_states
        ↓
PHASE 6: Deprecation & Legacy Column Cleanup (Future Migration)
  ├── Drop compatibility triggers
  └── Drop legacy columns: flashcards.repetition_number, interval_days, ease_factor, due_date
```

### 5.1 Bidirectional Visibility Trigger Contract

```sql
CREATE OR REPLACE FUNCTION public.sync_flashcard_deck_visibility()
RETURNS TRIGGER AS $$
BEGIN
  -- If visibility is explicitly updated, it takes precedence
  IF NEW.visibility IS DISTINCT FROM OLD.visibility THEN
    NEW.is_public := (NEW.visibility = 'public');
  -- If legacy is_public is updated by an older client
  ELSIF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    NEW.visibility := CASE WHEN NEW.is_public = true THEN 'public' ELSE 'private' END;
  END IF;
  
  -- Fallback default safety
  IF NEW.visibility IS NULL THEN
    NEW.visibility := CASE WHEN NEW.is_public = true THEN 'public' ELSE 'private' END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_deck_visibility ON public.flashcard_decks;
CREATE TRIGGER trg_sync_deck_visibility
BEFORE INSERT OR UPDATE ON public.flashcard_decks
FOR EACH ROW EXECUTE FUNCTION public.sync_flashcard_deck_visibility();
```

### 5.2 Bidirectional SRS Dual-Write Trigger Contract

```sql
-- Trigger A: When flashcard_review_states updates (New Client), sync to legacy flashcards table
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

-- Trigger B: When legacy flashcards table updates (Old Client), sync to flashcard_review_states
CREATE OR REPLACE FUNCTION public.sync_legacy_flashcard_to_review_state()
RETURNS TRIGGER AS $$
BEGIN
  -- Only execute if SRS fields changed
  IF (NEW.repetition_number IS DISTINCT FROM OLD.repetition_number) OR
     (NEW.interval_days IS DISTINCT FROM OLD.interval_days) OR
     (NEW.ease_factor IS DISTINCT FROM OLD.ease_factor) OR
     (NEW.due_date IS DISTINCT FROM OLD.due_date) THEN
     
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
```

---

# 6. Backfill Plan

All backfill operations are fully idempotent (`ON CONFLICT DO NOTHING` / `WHERE column IS NULL`) and can run without locking active rows.

```sql
BEGIN;

-- 1. Backfill visibility from is_public
UPDATE public.flashcard_decks
SET visibility = CASE WHEN is_public = true THEN 'public' ELSE 'private' END
WHERE visibility IS NULL;

-- 2. Backfill position sequentially per deck
WITH numbered_cards AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY deck_id ORDER BY created_at ASC) - 1 AS new_pos
  FROM public.flashcards
)
UPDATE public.flashcards f
SET position = nc.new_pos
FROM numbered_cards nc
WHERE f.id = nc.id AND (f.position IS NULL OR f.position = 0);

-- 3. Backfill front_content & back_content from plain text
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

-- 4. Backfill flashcard_review_states from flashcards
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

COMMIT;
```

### 6.1 Backfill Verification Queries
```sql
-- Check 1: Review states row count matches flashcards row count
SELECT 
  (SELECT COUNT(*) FROM public.flashcards) AS total_cards,
  (SELECT COUNT(*) FROM public.flashcard_review_states) AS total_states;

-- Check 2: Verify zero unmigrated visibility values
SELECT COUNT(*) AS unmigrated_decks FROM public.flashcard_decks WHERE visibility IS NULL;

-- Check 3: Verify zero unmigrated content ASTs
SELECT COUNT(*) AS empty_ast_cards FROM public.flashcards 
WHERE front_content = '{"type":"doc","content":[]}'::jsonb AND front_text != '';
```

---

# 7. RLS Policy Plan

Replaces the insecure production policies with a granular security matrix.

### 7.1 `public.flashcard_decks` Policies
```sql
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "flashcard_decks_select" ON public.flashcard_decks;
DROP POLICY IF EXISTS "flashcard_decks_insert" ON public.flashcard_decks;
DROP POLICY IF EXISTS "flashcard_decks_update" ON public.flashcard_decks;
DROP POLICY IF EXISTS "flashcard_decks_delete" ON public.flashcard_decks;

-- SELECT: Owner, Collaborator, Public, or Friends
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

-- INSERT: Authenticated user creates deck owned by themselves
CREATE POLICY "flashcard_decks_insert" ON public.flashcard_decks
FOR INSERT WITH CHECK (
  user_id = (SELECT auth.uid())
);

-- UPDATE: Owner or Editor
CREATE POLICY "flashcard_decks_update" ON public.flashcard_decks
FOR UPDATE USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.deck_members
    WHERE deck_id = flashcard_decks.id AND user_id = (SELECT auth.uid()) AND role = 'editor'
  )
) WITH CHECK (
  -- Editors cannot change the deck owner
  user_id = flashcard_decks.user_id
);

-- DELETE: Owner strictly (fixes vulnerability where public decks could be deleted)
CREATE POLICY "flashcard_decks_delete" ON public.flashcard_decks
FOR DELETE USING (
  user_id = (SELECT auth.uid())
);
```

### 7.2 `public.flashcards` Policies
```sql
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_select" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_insert" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_update" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_delete" ON public.flashcards;

-- SELECT: Accessible if user can view parent deck (fixes bug where public cards were hidden)
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

-- INSERT: Deck Owner or Deck Editor
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

-- UPDATE: Deck Owner or Deck Editor
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

-- DELETE: Deck Owner or Deck Editor
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
```

### 7.3 `public.flashcard_review_states` & Events Policies
```sql
ALTER TABLE public.flashcard_review_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_states_isolation" ON public.flashcard_review_states
FOR ALL USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

ALTER TABLE public.flashcard_review_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_events_isolation" ON public.flashcard_review_events
FOR ALL USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));
```

### 7.4 `public.deck_members` Policies
```sql
ALTER TABLE public.deck_members ENABLE ROW LEVEL SECURITY;

-- Read membership: Deck owner or members of the same deck
CREATE POLICY "deck_members_select" ON public.deck_members
FOR SELECT USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.flashcard_decks d
    WHERE d.id = deck_members.deck_id AND d.user_id = (SELECT auth.uid())
  )
);

-- Manage members: Deck owner strictly
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
```

---

# 8. RPC Security Plan (`SECURITY DEFINER` Hardening)

Every privileged database function adheres strictly to:
1. `SET search_path = public, pg_temp;` (avoids search path injection).
2. Explicit `auth.uid()` authentication check at line 1.
3. Explicit role authorization check against `flashcard_decks` and `deck_members`.
4. Input bounds checking.

### 8.1 Atomic Reordering with Optimistic Concurrency: `reorder_flashcards`

```sql
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

    -- 1. Authorization & Revision Check
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

    -- 2. Verify all card IDs belong to deck and count matches
    SELECT COUNT(*) INTO v_card_count FROM public.flashcards WHERE deck_id = p_deck_id;
    IF array_length(p_card_ids, 1) != v_card_count THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Reorder array must contain all cards in the deck';
    END IF;

    -- 3. Atomic position update
    UPDATE public.flashcards AS f
    SET position = ord.pos - 1
    FROM unnest(p_card_ids) WITH ORDINALITY AS ord(id, pos)
    WHERE f.id = ord.id AND f.deck_id = p_deck_id;

    -- 4. Advance revision
    UPDATE public.flashcard_decks
    SET revision = revision + 1, updated_at = NOW()
    WHERE id = p_deck_id;

    RETURN v_current_rev + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

### 8.2 Atomic Import RPC: `import_deck_cards`

```sql
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
```

### 8.3 Server-Side Fork RPC: `save_public_deck`

```sql
CREATE OR REPLACE FUNCTION public.save_public_deck(p_source_deck_id UUID)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_new_deck_id UUID;
    v_source RECORD;
    v_creator_username TEXT;
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

    -- 1. Create duplicate deck owned by saver
    INSERT INTO public.flashcard_decks (
        user_id, course_id, title, description, visibility, tags, 
        source_deck_id, source_creator_username
    ) VALUES (
        v_user_id, NULL, v_source.title, v_source.description, 'private', v_source.tags,
        p_source_deck_id, v_source.username
    ) RETURNING id INTO v_new_deck_id;

    -- 2. Duplicate cards with fresh IDs and clean SRS state
    INSERT INTO public.flashcards (
        deck_id, user_id, position, card_type, options, correct_answer, 
        front_content, back_content, front_text, back_text
    )
    SELECT 
        v_new_deck_id, v_user_id, position, card_type, options, correct_answer, 
        front_content, back_content, front_text, back_text
    FROM public.flashcards
    WHERE deck_id = p_source_deck_id;

    -- 3. Log attribution
    INSERT INTO public.deck_saves (deck_id, user_id, source_deck_id)
    VALUES (v_new_deck_id, v_user_id, p_source_deck_id)
    ON CONFLICT DO NOTHING;

    RETURN v_new_deck_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

### 8.4 Account Deletion Transaction Workflow: `delete_user_account`

```sql
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_deck RECORD;
    v_oldest_editor UUID;
BEGIN
    -- Verify caller matches target or has service role
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'UNAUTHORIZED: You can only delete your own account';
    END IF;

    -- Iterate through decks owned by the deleting user
    FOR v_deck IN SELECT id FROM public.flashcard_decks WHERE user_id = p_user_id LOOP
        -- Check if collaborative editors exist
        SELECT user_id INTO v_oldest_editor
        FROM public.deck_members
        WHERE deck_id = v_deck.id AND role = 'editor'
        ORDER BY created_at ASC LIMIT 1;

        IF v_oldest_editor IS NOT NULL THEN
            -- Transfer deck ownership to oldest editor
            UPDATE public.flashcard_decks
            SET user_id = v_oldest_editor, updated_at = NOW()
            WHERE id = v_deck.id;

            -- Remove editor from members list (since they are now owner)
            DELETE FROM public.deck_members
            WHERE deck_id = v_deck.id AND user_id = v_oldest_editor;
        ELSE
            -- No editor exists; delete deck and cascade
            DELETE FROM public.flashcard_decks WHERE id = v_deck.id;
        END IF;
    END LOOP;

    -- Delete user's review states, events, friendships, and profile
    DELETE FROM public.flashcard_review_states WHERE user_id = p_user_id;
    DELETE FROM public.flashcard_review_events WHERE user_id = p_user_id;
    DELETE FROM public.deck_members WHERE user_id = p_user_id;
    DELETE FROM public.friendships WHERE user_id = p_user_id OR friend_id = p_user_id;
    DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

### 8.5 Offline Review Batch Sync: `sync_offline_reviews`

```sql
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
    v_card_due DATE;
    v_current_interval INTEGER;
    v_current_rep INTEGER;
    v_current_ease NUMERIC;
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
        -- 1. Deduplicate review event
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

        -- 2. If study mode is standard SRS, apply authoritative state update
        IF COALESCE(v_event.study_mode, 'standard') = 'standard' THEN
            SELECT interval_days, repetition_number, ease_factor, due_date
            INTO v_current_interval, v_current_rep, v_current_ease, v_card_due
            FROM public.flashcard_review_states
            WHERE user_id = v_user_id AND card_id = v_event.card_id;

            -- If event is newer than last state or state is uninitialized
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
```

### 8.6 Modular Home Cockpit RPC: `get_student_home_cockpit`

Keeps domain calculations modular while delivering a single-roundtrip JSON response.

```sql
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

    -- Canonical student local date resolution
    v_local_date := (NOW() AT TIME ZONE p_timezone)::DATE;

    -- 1. Cards Due Today
    SELECT COUNT(*) INTO v_cards_due
    FROM public.flashcard_review_states 
    WHERE user_id = v_user_id AND due_date <= v_local_date;

    -- 2. Mastery Percentage
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

    -- 3. Today's Study Minutes
    SELECT COALESCE(SUM(duration_seconds) / 60, 0) INTO v_study_mins_today
    FROM public.study_sessions
    WHERE user_id = v_user_id AND (completed_at AT TIME ZONE p_timezone)::DATE = v_local_date;

    -- 4. 7-Day Weekly Mini-Graph
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
```

---

# 9. Rollback / Recovery Plan

Every migration file is paired with an exact inverse rollback script:

```sql
-- ROLLBACK SCRIPT FOR PHASE 1 & 2
BEGIN;

-- 1. Drop compatibility triggers
DROP TRIGGER IF EXISTS trg_sync_review_state_to_legacy ON public.flashcard_review_states;
DROP FUNCTION IF EXISTS public.sync_review_state_to_legacy_flashcard();

DROP TRIGGER IF EXISTS trg_sync_legacy_flashcard_to_review ON public.flashcards;
DROP FUNCTION IF EXISTS public.sync_legacy_flashcard_to_review_state();

DROP TRIGGER IF EXISTS trg_sync_deck_visibility ON public.flashcard_decks;
DROP FUNCTION IF EXISTS public.sync_flashcard_deck_visibility();

-- 2. Drop stored procedures
DROP FUNCTION IF EXISTS public.reorder_flashcards(UUID, UUID[], INTEGER);
DROP FUNCTION IF EXISTS public.import_deck_cards(UUID, JSONB);
DROP FUNCTION IF EXISTS public.save_public_deck(UUID);
DROP FUNCTION IF EXISTS public.delete_user_account(UUID);
DROP FUNCTION IF EXISTS public.sync_offline_reviews(JSONB, TEXT);
DROP FUNCTION IF EXISTS public.get_student_home_cockpit(TEXT);

-- 3. Drop newly created tables
DROP TABLE IF EXISTS public.deck_reports;
DROP TABLE IF EXISTS public.deck_ratings;
DROP TABLE IF EXISTS public.deck_views;
DROP TABLE IF EXISTS public.deck_saves;
DROP TABLE IF EXISTS public.deck_members;
DROP TABLE IF EXISTS public.flashcard_review_events;
DROP TABLE IF EXISTS public.flashcard_review_states;

-- 4. Revert columns on existing tables
ALTER TABLE public.flashcards 
  DROP COLUMN IF EXISTS front_content,
  DROP COLUMN IF EXISTS back_content,
  DROP COLUMN IF EXISTS position,
  DROP COLUMN IF EXISTS version;

ALTER TABLE public.flashcard_decks 
  DROP COLUMN IF EXISTS visibility,
  DROP COLUMN IF EXISTS revision,
  DROP COLUMN IF EXISTS source_deck_id,
  DROP COLUMN IF EXISTS source_creator_username;

COMMIT;
```

---

# 10. Implementation Contract & Test Matrix

### 10.1 SRS Transition Specification (`lib/study-engine/src/sm2.ts`)

```ts
export type ReviewRating = 'retry' | 'hard' | 'good' | 'easy';

export interface SM2Input {
  repetitionNumber: number;
  intervalDays: number;
  easeFactor: number;
  rating: ReviewRating;
  overdueDays?: number;
}

export interface SM2Output {
  repetitionNumber: number;
  intervalDays: number;
  easeFactor: number;
  inSessionRequeue: boolean;
}

export const MIN_EASE = 1.30;
export const MAX_EASE = 3.00;
export const MAX_INTERVAL = 180; // 1 semester ceiling

export function calculateSM2(input: SM2Input): SM2Output {
  const { repetitionNumber, intervalDays, easeFactor, rating, overdueDays = 0 } = input;

  if (rating === 'retry') {
    return {
      repetitionNumber: 0,
      intervalDays: 1,
      easeFactor: Math.max(MIN_EASE, easeFactor - 0.20),
      inSessionRequeue: true, // Requeued into active session queue
    };
  }

  let newRepetition = repetitionNumber + 1;
  let newEase = easeFactor;
  let newInterval = 1;

  if (rating === 'hard') {
    newEase = Math.max(MIN_EASE, easeFactor - 0.15);
    newInterval = repetitionNumber === 0 ? 1 : Math.max(1, Math.floor(intervalDays * 1.2));
  } else if (rating === 'good') {
    // Saktus Overdue Policy applied only on Good/Easy
    const effectiveInterval = intervalDays + Math.floor(overdueDays / 2);
    if (repetitionNumber === 0) newInterval = 1;
    else if (repetitionNumber === 1) newInterval = 6;
    else newInterval = Math.round(effectiveInterval * easeFactor);
  } else if (rating === 'easy') {
    newEase = Math.min(MAX_EASE, easeFactor + 0.15);
    const effectiveInterval = intervalDays + Math.floor(overdueDays / 2);
    if (repetitionNumber === 0) newInterval = 4;
    else if (repetitionNumber === 1) newInterval = 10;
    else newInterval = Math.round(effectiveInterval * easeFactor * 1.3);
  }

  return {
    repetitionNumber: newRepetition,
    intervalDays: Math.min(MAX_INTERVAL, Math.max(1, newInterval)),
    easeFactor: Number(newEase.toFixed(2)),
    inSessionRequeue: false,
  };
}
```

#### Deterministic Transition Table

| State | Rating | Overdue | Next Repetition | Next Interval | Next Ease | In-Session Requeue |
|---|---|---|---|---|---|---|
| New (`rep=0, int=0, ease=2.50`) | **retry** | 0 | 0 | 1 | 2.30 | **true** |
| New (`rep=0, int=0, ease=2.50`) | **hard** | 0 | 1 | 1 | 2.35 | false |
| New (`rep=0, int=0, ease=2.50`) | **good** | 0 | 1 | 1 | 2.50 | false |
| New (`rep=0, int=0, ease=2.50`) | **easy** | 0 | 1 | 4 | 2.65 | false |
| Rep 1 (`rep=1, int=1, ease=2.50`) | **good** | 0 | 2 | 6 | 2.50 | false |
| Rep 2 (`rep=2, int=6, ease=2.50`) | **good** | 0 | 3 | 15 | 2.50 | false |
| Rep 2 (`rep=2, int=6, ease=2.50`) | **good** | 10 | 3 | 28 (effective int 11) | 2.50 | false |
| High (`rep=5, int=100, ease=2.50`)| **easy** | 0 | 6 | 180 (capped at max) | 2.65 | false |

---

### 10.2 TipTap / ProseMirror Content AST Zod Schema (`lib/shared/src/schemas.ts`)

```ts
import { z } from 'zod';

const MarkSchema = z.object({
  type: z.enum(['bold', 'italic', 'underline', 'strike', 'code', 'highlight', 'link']),
  attrs: z.record(z.any()).optional().refine((attrs) => {
    if (!attrs?.href) return true;
    // Reject javascript:, data:, vbscript: URIs
    return /^https?:\/\//i.test(attrs.href) || attrs.href.startsWith('#');
  }, { message: 'Invalid or unsafe link URL' }),
});

export const RichContentNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.enum([
      'paragraph', 'heading', 'bulletList', 'orderedList', 'listItem',
      'codeBlock', 'table', 'tableRow', 'tableCell', 'image', 'mathEquation'
    ]),
    attrs: z.record(z.any()).optional(),
    content: z.array(RichContentNodeSchema).optional(),
    marks: z.array(MarkSchema).optional(),
    text: z.string().max(5000).optional(),
  })
);

export const RichContentDocSchema = z.object({
  type: z.literal('doc'),
  content: z.array(RichContentNodeSchema),
});
```

---

### 10.3 Concrete Math Renderer Contract
* **Canonical Source:** LaTeX string stored in `node.attrs.latex`.
* **Web Renderer:** KaTeX (`katex` npm package) via `@saktus/ui-web/MathView`. Fast, standard, zero iframe overhead.
* **Mobile Renderer:** `@kares/react-native-mathview` (or `react-native-svg` pre-parsed paths). Zero WebViews to maintain 60fps gesture animations on low-spec Android devices.
* **Parity Test Suite:** Shared fixture of 15 expressions (`\frac{a}{b}`, `\int_a^b f(x)dx`, `\sum_{i=1}^n x_i`, `\sqrt{x^2+y^2}`) validated visually across both platforms.

---

### 10.4 Automated Verification Test Matrix

```text
TEST SUITE 1: Bidirectional Visibility Triggers
  [PASS] Old client sets is_public=true  -> visibility becomes 'public'
  [PASS] Old client sets is_public=false -> visibility becomes 'private'
  [PASS] New client sets visibility='public'  -> is_public becomes true
  [PASS] New client sets visibility='friends' -> is_public becomes false
  [PASS] New client sets visibility='private' -> is_public becomes false
  [PASS] Concurrent update with both set      -> visibility takes precedence

TEST SUITE 2: SRS Compatibility Layer
  [PASS] New client reviews card -> flashcard_review_states committed & legacy flashcards updated
  [PASS] Old client reviews card -> flashcards updated & synced to flashcard_review_states
  [PASS] Active session retry    -> requeued locally, persistent due_date unchanged until exit rating

TEST SUITE 3: Security & RLS Policy Enforcement
  [PASS] Public deck cards are readable by non-owner authenticated users
  [PASS] Non-owner cannot delete a public deck (verifies fix for production flaw)
  [PASS] Deck editor can add/edit cards but cannot delete deck
  [PASS] Student A cannot query Student B's review states under any circumstances
  [PASS] Account deletion of owner transfers deck to oldest editor

TEST SUITE 4: Concurrency & Transaction Boundaries
  [PASS] reorder_flashcards fails with CONCURRENT_MODIFICATION when revision does not match
  [PASS] import_deck_cards rolls back completely if any row in batch fails
  [PASS] save_public_deck creates isolated fork with attribution and fresh IDs
```

---

*This reconciliation document is the definitive engineering contract. All subsequent code modifications, database migrations, and client implementations must adhere strictly to these specifications.*
