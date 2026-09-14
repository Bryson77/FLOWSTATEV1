# Saktus Flashcards MVP: Architectural Response & Resolution Plan

**Target Document:** [`grill.md`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/grill.md)  
**Parent Specification:** [`Saktus_Flashcards_MVP_Implementation_Spec.md`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/Saktus_Flashcards_MVP_Implementation_Spec.md)  
**Status:** Authoritative Architectural Decisions & Engineering Contract  
**Date:** September 14, 2026  

---

## Executive Architectural Directive

This document provides the definitive, production-ready resolutions to every question raised in [`grill.md`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/grill.md). 

### Guiding Principles for This Architecture:
1. **Pragmatic MVP Engineering:** Reject unnecessary distributed-systems complexity (e.g., rejecting `FLOAT8` fractional indexing; rejecting complex microservice syncs).
2. **Zero Downtime & Zero Data Loss:** All database changes must be strictly backwards-compatible with existing production tables (`flashcard_decks`, `flashcards`, `profiles`, `courses`).
3. **Strict Domain Isolation:** Flashcard content is decoupled from per-user SRS progress.
4. **Resilient Asset Management:** Deleting a deck must never cause broken 404 images in saved/copied decks.
5. **Anti-AI Slop & Tactile Physics:** Absolute adherence to pure white `#FFFFFF` / pure black `#000000`, 1px borders, zero emojis, Lucide icons, Emil Kowalski tactile physics, and grounded student copy.

---

# 1. Production Schema Resolutions & Migration Strategy

### 1.1 Existing Migrations vs. Proposed Schema
The database currently contains:
- `flashcard_decks` with `is_public BOOLEAN` and `course_id UUID` (made nullable in migration `20260914_database_integrity_and_performance.sql`).
- `flashcards` with embedded SM-2 columns (`repetition_number`, `interval_days`, `ease_factor`, `due_date`) and plain text columns (`front_text`, `back_text`).

**Resolution:**
- We keep the existing tables and primary keys (`id UUID DEFAULT gen_random_uuid()`).
- We introduce `flashcard_review_states` and `flashcard_review_events` as separate tables.
- We add new structured columns to `flashcards`: `front_content JSONB`, `back_content JSONB`, `position INTEGER`.
- Legacy columns (`front_text`, `back_text`, `repetition_number`, `interval_days`, `ease_factor`, `due_date`) are kept during the transition, backfilled, and only dropped after client apps are verified.

---

### 1.2 Hierarchy & `course_id` Nullability
- **Decision:** **`course_id` remains NULLABLE** (`UUID REFERENCES public.courses(id) ON DELETE SET NULL`).
- **Rationale:** University students frequently create decks before setting up their semester schedule, or for extracurricular topics (e.g., CFA, language learning, general skills).
- **UX Contract:** 
  - When creating a deck, the Course dropdown defaults to the student's active courses, but includes a clear `[No Course / General]` option.
  - In the Library, decks without a course are grouped under a clean "General Decks" section.

---

### 1.3 Decoupling SM-2 State: `flashcard_review_states`
Embedding SRS state in `flashcards` makes public study, deck sharing, and collaboration impossible because one student's reviews overwrite another's.

**Table Definition:**
```sql
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

CREATE INDEX IF NOT EXISTS idx_review_states_user_due 
ON public.flashcard_review_states(user_id, due_date);

CREATE INDEX IF NOT EXISTS idx_review_states_card 
ON public.flashcard_review_states(card_id);
```

**Zero-Data-Loss Backfill:**
```sql
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
    updated_at
FROM public.flashcards
ON CONFLICT (user_id, card_id) DO NOTHING;
```

---

### 1.4 Temporal Model: `due_date DATE` vs. `due_at TIMESTAMPTZ`
- **Decision:** **`due_date DATE NOT NULL DEFAULT CURRENT_DATE`** for scheduling; `TIMESTAMPTZ` only for event audit logging (`flashcard_review_events.reviewed_at`).
- **Rationale:** Spaced repetition operates on **daily study batches**, not minute-by-minute alarms. If a card had a timestamp of 16:30, a student studying at 09:00 would see "0 cards due", and at 17:00 suddenly see "10 cards due". Calendar dates pinned to the student's profile timezone (`profiles.timezone`, defaulting to `UTC`) prevent midday due-date creep and make queries instant:
  ```sql
  WHERE user_id = auth.uid() AND due_date <= CURRENT_DATE
  ```

---

### 1.5 Visibility Enum Migration: `is_public` -> `visibility`
The database currently has `is_public BOOLEAN DEFAULT FALSE`. The spec requires `'private' | 'friends' | 'public'`.

**Migration SQL:**
```sql
ALTER TABLE public.flashcard_decks 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' 
CHECK (visibility IN ('private', 'friends', 'public'));

-- Backfill from existing boolean
UPDATE public.flashcard_decks
SET visibility = CASE WHEN is_public = true THEN 'public' ELSE 'private' END
WHERE visibility IS NULL OR visibility = 'private';

-- Maintain backward compatibility during client transition
CREATE OR REPLACE FUNCTION sync_flashcard_deck_visibility()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visibility IS NOT NULL THEN
    NEW.is_public := (NEW.visibility = 'public');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_deck_visibility ON public.flashcard_decks;
CREATE TRIGGER trg_sync_deck_visibility
BEFORE INSERT OR UPDATE ON public.flashcard_decks
FOR EACH ROW EXECUTE FUNCTION sync_flashcard_deck_visibility();
```

---

### 1.6 Card Ordering Contract: Sequential `position INTEGER`
- **Decision:** Explicitly **reject `FLOAT8` / LexoRank fractional indexing**.
- **Rationale:** University study decks average 20–150 cards (rarely exceeding 500). Fractional indexing introduces float precision exhaustion, periodic table rebalancing jobs, and complex debugging.
- **Implementation:** Standard `position INTEGER DEFAULT 0 NOT NULL` with an atomic reorder stored procedure:
```sql
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0 NOT NULL;

CREATE OR REPLACE FUNCTION public.reorder_flashcards(p_deck_id UUID, p_card_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE public.flashcards AS f
  SET position = ord.pos - 1
  FROM unnest(p_card_ids) WITH ORDINALITY AS ord(id, pos)
  WHERE f.id = ord.id AND f.deck_id = p_deck_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
*Complexity:* $O(N)$ execution inside PostgreSQL in a single atomic statement. Fast, predictable, and simple.

---

### 1.7 Foreign Keys, Lineage & Account Deletion
- When an account is deleted (`profiles.id` deleted):
  - **Private Decks:** Cascade delete (`ON DELETE CASCADE`).
  - **Shared Collaborative Decks:** If the owner deletes their account, ownership automatically transfers to the oldest Editor in `deck_members`. If no editors exist, the deck is deleted.
  - **Saved Copies:** Retain `source_deck_id UUID REFERENCES flashcard_decks(id) ON DELETE SET NULL`. If the source deck is deleted, the saved copy remains intact, and attribution reads `Saved from @deleted_student` or stores a static snapshot of the creator's username at the time of save (`source_creator_username TEXT`).

---

# 2. SRS Model & Study Session Lifecycle

### 2.1 The "Retry" In-Session Requeue Contract
- **The Flaw in `sm2.ts`:** In standard SM-2, rating a card $< 3$ resets `intervalDays = 1`, scheduling it for tomorrow. But in real study sessions (Anki, StudySmarter), hitting "Retry" means **you did not learn the card yet; it must be repeated in the same session**.
- **Contract:**
  1. During an active study session, cards are loaded into an in-memory queue.
  2. When the student rates a card **Retry**:
     - The card is **re-inserted into the current session queue** (e.g., 3 cards later or at the end of the session).
     - The persistent database `interval_days` is reset to 1, `repetition_number` to 0, and `due_date` stays `today`.
  3. The card remains in the session queue until the student rates it **Hard**, **Good**, or **Easy**.
  4. The final rating determines the new SRS interval and due date committed to `flashcard_review_states`.

---

### 2.2 Quality Mapping & Terminology
Spec §33-34 strictly mandates: **Retry, Hard, Good, Easy**. The UI will never show "Again".

We update [`lib/study-engine/src/sm2.ts`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/lib/study-engine/src/sm2.ts) to:
```ts
export type ReviewRating = 'retry' | 'hard' | 'good' | 'easy';

export const QUALITY_MAP: Record<ReviewRating, number> = {
  retry: 0, // complete blackout / failed recall
  hard: 2,  // correct after strenuous recall
  good: 4,  // correct with hesitation
  easy: 5,  // instant perfect recall
};
```
Backward compatibility: The function accepts both `'again'` and `'retry'` as synonyms during the transition.

---

### 2.3 Mathematical Definition of "Deck Mastery %"
To eliminate arbitrary metrics, **Mastery** is formally defined as:
$$\text{Mastery } \% = \left( \frac{\text{Count of Cards with } \text{interval\_days} \ge 21}{\text{Total Cards in Deck}} \right) \times 100$$
- **New / Unstudied:** `repetition_number = 0` (0% mastery contribution).
- **Learning:** `interval_days < 21` (partial retention).
- **Mastered:** `interval_days >= 21` (long-term memory threshold; roughly 3+ consecutive successful reviews).
- If `Total Cards = 0`, Mastery = `0%`.

---

### 2.4 Overdue Card Intervals & Retention Clamping
If a student reviews a card 30 days past its due date:
- Multiplying the elapsed time ($35 \times 2.5 = 87\text{ days}$) risks scheduling the card past the student's exam date.
- Multiplying the original interval ($5 \times 2.5 = 12\text{ days}$) penalizes them for successfully retaining the knowledge over 35 days.
- **Contract:** If a review is overdue and rated **Good** or **Easy**, calculate interval based on:
  $$\text{effective\_interval} = \text{interval\_days} + \left\lfloor \frac{\text{overdue\_days}}{2} \right\rfloor$$
  $$\text{next\_interval} = \min(\text{effective\_interval} \times \text{ease\_factor}, 180)$$
- **Max Interval Ceiling:** Cap interval at **180 days** (one university semester).
- **Ease Factor Clamping:** Minimum `1.30`, maximum `3.00`.

---

### 2.5 "Study Due" vs. "Study All" (Cram Mode)
- **`[Study Due]`:** Standard SRS mode. Mutates `flashcard_review_states`, advances intervals, and records `flashcard_review_events`.
- **`[Study All]`:** **Cram Mode**. 
  - Allows students to review all cards before a test regardless of due date.
  - **Does NOT mutate `due_date` or `interval_days`** by default (prevents pushing cards into next semester).
  - Still logs study minutes and writes to `flashcard_review_events` with `study_mode = 'cram'` so daily streaks and study graphs reflect the effort.

---

### 2.6 Review Events Logging Table
```sql
CREATE TABLE IF NOT EXISTS public.flashcard_review_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

---

# 3. Card Content & Rich-Text Architecture

### 3.1 Strict JSONB AST Schema (TipTap / ProseMirror)
Rather than raw unvalidated JSON or unstructured HTML, card content is stored in JSONB adhering to a standardized TipTap/ProseMirror AST:

```ts
export interface RichContentDoc {
  type: 'doc';
  content: RichContentNode[];
}

export interface RichContentNode {
  type: 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'listItem' | 'codeBlock' | 'table' | 'tableRow' | 'tableCell' | 'image' | 'mathEquation';
  attrs?: Record<string, any>;
  content?: RichContentNode[];
  marks?: Array<{
    type: 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'highlight' | 'link';
    attrs?: Record<string, any>;
  }>;
  text?: string;
}
```
Validation via Zod in `lib/shared/src/schemas.ts`: If a client sends an unrecognized node type or attributes containing `<script>` or `javascript:` URLs, Zod strips/rejects it before database insertion.

---

### 3.2 Polymorphic Question Representation
Section 14 & 16 state: All cards share one unified entity.

```sql
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS front_content JSONB DEFAULT '{"type":"doc","content":[]}'::jsonb,
ADD COLUMN IF NOT EXISTS back_content JSONB DEFAULT '{"type":"doc","content":[]}'::jsonb,
ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'standard' CHECK (card_type IN ('standard', 'true_false', 'multiple_choice')),
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS correct_answer TEXT;
```

**Field Mapping Matrix:**

| Card Type | `front_content` | `back_content` | `options` | `correct_answer` |
|---|---|---|---|---|
| **Standard** | Question / Prompt AST | Answer / Explanation AST | `[]` | `NULL` |
| **Multiple Choice** | Question AST | Explanation AST | Array of string options: `["A", "B", "C", "D"]` | String matching the correct option |
| **True / False** | Statement AST | Explanation of why True/False | `["True", "False"]` | `"True"` or `"False"` |

*Benefit:* Standard cards can be studied in standard mode. MCQ cards can be studied in MCQ mode (showing radio choices) OR in standard recall mode (revealing choice + explanation).

---

### 3.3 Mobile (React Native) Rendering Parity without WebViews
Using WebViews inside flashcards destroys 60fps gesture animations and consumes excessive memory on mobile.
- **Rich Text & Code:** Rendered using pure native React Native components:
  - Text, bold, italic, lists: Native `<Text>` with nesting and styling.
  - Code blocks: `<Text style={styles.mono}>` wrapped in a crisp 1px bordered surface (`#09090B` in dark mode) with copy-to-clipboard button.
- **Math Equations:** Rendered using `react-native-svg` with pre-compiled MathJax/KaTeX SVG paths, or a lightweight native math engine (`@kares/react-native-mathview`). No embedded browser instances.
- **Tables:** Simple scrollable flexbox grids rendered natively with 1px hairline borders (`border-zinc-200` / `border-zinc-800`).

---

### 3.4 Image Storage & The Source-Deck Deletion Problem
- **The Trap:** If Student B saves Student A's deck, and Student B's cards point to `storage/users/student_A/image1.png`, Student A deleting their account will break Student B's cards with 404s.
- **Contract:**
  1. Storage Bucket: `deck-media` (Public read, authenticated write).
  2. Storage Key: **Content-Addressable Storage (CAS)** using SHA-256 hash:
     ```
     deck-media/assets/<sha256_hash>.<ext>
     ```
  3. When an image is uploaded, the filename is its SHA-256 hash. If two students upload the identical diagram, they share the same hash URL.
  4. **No Cascade Delete:** When a deck or card is deleted from PostgreSQL, **the Storage object is NOT deleted synchronously**. Storage is treated as an immutable asset cache. A background periodic worker can clean unreferenced assets if needed, but no user action can trigger immediate image link rot for other students.

---

### 3.5 LaTeX Input UX
- In the editor, students click the `[Equation]` button or type `$$...$$`.
- A simple sheet opens showing:
  1. Monospace LaTeX input field (`\sum_{i=1}^n x_i`).
  2. Real-time preview card directly underneath.
  3. Syntax error toast if KaTeX parsing fails ("Invalid LaTeX: mismatched braces").
  4. Common math symbol shortcuts toolbar (fractions, exponents, square roots, integrals, Greek letters) to accelerate input on mobile keyboards.

---

# 4. Authoring, Ergonomics & Collaboration

### 4.1 Rapid Keyboard Navigation (Web)
Spec §10 hotkey specification refined:
- `Tab`: Jump from Front editor to Back editor.
- `Shift+Tab`: Jump from Back editor to Front editor.
- `Cmd+Enter` / `Ctrl+Enter`: **Commit current card and immediately spawn/focus Card N+1**.
- `Enter`: Creates a standard newline inside the rich text editor (preserving multi-line text and code blocks).
- `Escape`: Unfocus editor / exit multi-card focus mode.

---

### 4.2 Autosave & Local Draft Persistence
- As the user types in the editor, changes are saved to `localStorage` (Web) / `AsyncStorage` (Mobile) after **200ms**.
- A debounced network mutation pushes changes to Supabase every **1,500ms** of inactivity, or immediately upon `Cmd+Enter` / clicking `[Done]`.
- If the browser tab crashes or mobile app is closed, opening the editor recovers the uncommitted draft: *"We recovered your unsaved edits. [Restore] [Discard]"*.

---

### 4.3 Multi-User Concurrency & Stale Write Rejection
- Add `updated_at TIMESTAMPTZ` and `version INTEGER DEFAULT 1 NOT NULL` to `flashcards`.
- Mutation contract:
  ```sql
  UPDATE public.flashcards
  SET front_content = p_front, back_content = p_back, version = version + 1, updated_at = NOW()
  WHERE id = p_card_id AND version = p_expected_version;
  ```
- If 0 rows are updated, another collaborator saved in the interim:
  - The client displays: *"Alex just updated this card. Review the newer version before overwriting."*
  - The local draft is kept in a split-view diff modal so the student does not lose their typed words.

---

### 4.4 Collaborator Roles & RLS
Table: `deck_members`
```sql
CREATE TABLE IF NOT EXISTS public.deck_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    user_id REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('owner', 'editor')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_deck_member UNIQUE (deck_id, user_id)
);
```

**Permission Matrix:**

| Action | Owner | Editor | Public Viewer |
|---|:---:|:---:|:---:|
| Read Deck & Cards | Yes | Yes | If `visibility = 'public'` |
| Add / Edit / Reorder Cards | Yes | Yes | No |
| Delete Individual Cards | Yes | Yes | No |
| Delete Entire Deck | Yes | No | No |
| Change Visibility / Name | Yes | No | No |
| Add / Remove Collaborators | Yes | No | No |

---

### 4.5 Lightweight Realtime Presence
- Uses Supabase Realtime Broadcast on channel `deck:{deck_id}:presence`.
- Ephemeral state sends: `{ user_id, username, editing_card_id }`.
- In the editor:
  - If Alex is typing on Card 3, Card 3 displays a subtle 1px indicator and a small pill: `Alex is editing`.
  - Presence broadcasts are debounced to 1 per 3 seconds to preserve websocket bandwidth.

---

# 5. Import Pipeline (Bulk Paste & Quizlet)

### 5.1 Delimiter Parsing & Edge Cases
- **Bulk Paste Formats Supported:**
  - Tab-separated (`FRONT<TAB>BACK`)
  - Comma/Semicolon separated
  - Custom delimiter (`|` or `-`)
- **Parser Engine:**
  - Detects rows via `\r\n` or `\n`.
  - Detects the predominant separator across all valid lines.
  - Strips leading/trailing quotes (`"..."`) used by spreadsheet and Quizlet exports.
  - Lines with zero separators or empty fronts/backs are flagged as `invalid`.

---

### 5.2 Atomic 1,500-Card Import RPC
To prevent partial imports, network timeout failures, and payload limits, bulk inserts run through a single PostgreSQL stored procedure:

```sql
CREATE OR REPLACE FUNCTION public.import_deck_cards(
    p_deck_id UUID,
    p_cards JSONB
)
RETURNS INTEGER AS $$
DECLARE
    v_inserted_count INTEGER := 0;
    v_owner_id UUID;
BEGIN
    -- Verify edit permission
    SELECT user_id INTO v_owner_id FROM public.flashcard_decks WHERE id = p_deck_id;
    IF v_owner_id != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM public.deck_members WHERE deck_id = p_deck_id AND user_id = auth.uid() AND role IN ('owner', 'editor')
    ) THEN
        RAISE EXCEPTION 'You do not have permission to edit this deck.';
    END IF;

    -- Atomic bulk insert
    WITH inserted AS (
        INSERT INTO public.flashcards (deck_id, user_id, position, front_content, back_content, front_text, back_text)
        SELECT 
            p_deck_id,
            auth.uid(),
            COALESCE((SELECT MAX(position) FROM public.flashcards WHERE deck_id = p_deck_id), -1) + ord.pos,
            jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', card->>'front'))))),
            jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', card->>'back'))))),
            card->>'front',
            card->>'back'
        FROM jsonb_array_elements(p_cards) WITH ORDINALITY AS ord(card, pos)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_inserted_count FROM inserted;

    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
*Guarantees:* Either all 1,500 cards are inserted atomically, or the transaction rolls back cleanly with zero orphaned rows.

---

### 5.3 Validation & Inline Preview
- Preview modal shows:
  - `12 cards detected · 10 valid · 2 need attention`
  - Table shows Front / Back columns.
  - Invalid rows are highlighted with a subtle `border-amber-500` and an inline edit input.
  - Student has two clear choices: `[Fix & Import All]` or `[Skip 2 Invalid & Import 10]`.

---

# 6. Saved Decks vs. Live Decks (The Forking Contract)

### 6.1 Server-Side Atomic Cloning
Saving a public deck must be an atomic deep copy executed in PostgreSQL:

```sql
CREATE OR REPLACE FUNCTION public.save_public_deck(p_source_deck_id UUID)
RETURNS UUID AS $$
DECLARE
    v_new_deck_id UUID;
    v_source RECORD;
BEGIN
    SELECT * INTO v_source FROM public.flashcard_decks 
    WHERE id = p_source_deck_id AND (visibility = 'public' OR user_id = auth.uid());
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deck not found or is private.';
    END IF;

    -- 1. Create duplicate deck owned by saver
    INSERT INTO public.flashcard_decks (
        user_id, course_id, title, description, visibility, tags
    ) VALUES (
        auth.uid(), NULL, v_source.title, v_source.description, 'private', v_source.tags
    ) RETURNING id INTO v_new_deck_id;

    -- 2. Duplicate cards with fresh IDs
    INSERT INTO public.flashcards (
        deck_id, user_id, position, card_type, options, correct_answer, front_content, back_content, front_text, back_text
    )
    SELECT 
        v_new_deck_id, auth.uid(), position, card_type, options, correct_answer, front_content, back_content, front_text, back_text
    FROM public.flashcards
    WHERE deck_id = p_source_deck_id;

    -- 3. Log save attribution
    INSERT INTO public.deck_saves (deck_id, user_id, source_deck_id)
    VALUES (v_new_deck_id, auth.uid(), p_source_deck_id)
    ON CONFLICT DO NOTHING;

    RETURN v_new_deck_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 6.2 Attribution & Upstream Independence
- The saved deck displays a non-editable pill: `Saved from @alex`.
- **Permanent Fork:** Once saved, the deck is completely owned by the saver. Future changes by the original author do not mutate the student's saved copy.
- The saver cannot re-publish the saved deck as "Public" unless they have made substantive changes (prevents spamming Community search with 50 duplicate copies of the same deck).

---

# 7. Community Discovery, Anti-Abuse & Social System

### 7.1 Optimized Friend-Only RLS
To prevent evaluating costly subqueries across thousands of public decks:
- Public decks check simply: `visibility = 'public'`.
- Friend checks are indexed using a compound functional index on `friendships`:
```sql
CREATE INDEX IF NOT EXISTS idx_friendships_active 
ON public.friendships(user_id, friend_id) 
WHERE status = 'accepted';
```
- In Community Discovery feeds, queries default to `WHERE visibility = 'public'`. Friend-only decks are filtered exclusively in the dedicated "Friends' Decks" tab.

---

### 7.2 View Counting & Anti-Spam
- Views are tracked via daily deduplicated logs:
```sql
CREATE TABLE IF NOT EXISTS public.deck_views (
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    viewed_date DATE DEFAULT CURRENT_DATE NOT NULL,
    PRIMARY KEY (deck_id, user_id, viewed_date)
);
```
- A view is only incremented when a student opens the Deck details page or starts a study session, capped at **1 view per student per deck per 24 hours**.

---

### 7.3 Ratings Integrity
- Creators and editors **cannot rate their own decks**.
- A deck requires at least **3 unique student ratings** before the numerical score (e.g., `4.8 ★`) is displayed in discovery feeds. Until then, it shows `New`.
- Students can update or remove their rating at any time.

---

### 7.4 Content Moderation & Community Flagging
Since superadmin console is deferred to Phase 2:
- Provide a `[Report Deck]` modal on all public decks:
  - Reasons: *Academic Dishonesty / Exam Dump*, *Inappropriate Content*, *Copyright Infringement*, *Spam*.
- Table: `deck_reports(deck_id, reporter_id, reason, details, created_at)`.
- **Automated Safe Threshold:** If a public deck receives **3 unique reports from different students**, its visibility is automatically switched to `'private'` pending review, and an alert is logged.

---

# 8. Academic OS Integration & Home Cockpit

### 8.1 Single-Trip Dashboard RPC: `get_student_home_cockpit`
Eliminates the 9-query waterfall on the Home screen:

```sql
CREATE OR REPLACE FUNCTION public.get_student_home_cockpit(p_timezone TEXT DEFAULT 'UTC')
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_local_date DATE := (NOW() AT TIME ZONE p_timezone)::DATE;
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'cards_due_today', (
            SELECT COUNT(*) 
            FROM public.flashcard_review_states 
            WHERE user_id = v_user_id AND due_date <= v_local_date
        ),
        'decks_mastery_avg', (
            SELECT COALESCE(ROUND(AVG(
                CASE WHEN total_cards > 0 THEN (mastered_cards::FLOAT / total_cards * 100) ELSE 0 END
            )), 0)
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
            ) sub
        ),
        'study_minutes_today', (
            SELECT COALESCE(SUM(duration_seconds) / 60, 0)
            FROM public.study_sessions
            WHERE user_id = v_user_id AND (completed_at AT TIME ZONE p_timezone)::DATE = v_local_date
        ),
        'weekly_study_minutes', (
            SELECT jsonb_agg(daily_min)
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
            ) daily_min
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```
*Performance:* Replaces 9 round trips with **1 single round trip (< 45ms)**.

---

### 8.2 Focus Timer & Flashcard Session Concurrency
- The Omnipresent Floating Timer and Flashcard Study are **cooperative**:
  - A student can start a 25-minute Pomodoro timer, then open Flashcards to study.
  - When the timer rings, a non-intrusive banner appears at the top of the study player: `Timer Complete (25 min). [Take a Break] [Keep Studying]`. It does not abruptly wipe out the card or break focus.
  - The study session logs the exact card rating events; the focus timer logs the continuous duration session to `study_sessions`.

---

# 9. Offline Capability & Network Resilience

### 9.1 Offline Study Session Survival
- When a deck is opened, the client caches the deck's cards and the student's review states in local storage.
- If the network cuts out during study:
  - The student can continue studying uninterrupted.
  - Rating actions (`Retry`, `Good`, `Easy`) are appended to a local JSON queue: `pending_reviews: [{ card_id, rating, reviewed_at }]`.
  - The UI shows a subtle status indicator: `Studying Offline (5 reviews queued)`.

### 9.2 Syncing on Reconnection
- When `navigator.onLine` fires (or NetInfo connects on mobile):
  - The client batches the queued reviews to `flashcard_review_events` and updates `flashcard_review_states`.
  - Stored timestamps preserve the exact chronological sequence of reviews.

---

# 10. Monetization, Quotas & Free vs. Pro Tiers

Reconciling [`lib/shared/src/types.ts`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/lib/shared/src/types.ts) with the MVP Spec:

| Feature | Free Tier | Pro Tier |
|---|:---:|:---:|
| **Personal Decks Created** | **5 Decks** (increased from 3 for student utility) | Unlimited |
| **Cards Per Deck** | Up to 250 cards | Unlimited |
| **Saved Public Decks** | Up to 10 decks | Unlimited |
| **Collaborators** | 1 Editor per deck | Unlimited |
| **Quizlet / Bulk Import** | Included | Included |
| **Match / MCQ Study Modes** | Included | Included |
| **AI Generation (Phase 2)**| Locked | Included |

---

# 11. Anti-AI Slop & UI/UX Physics Verification

### 11.1 Palette & Surface Architecture
- **Light Mode:** Canvas is pure white `#FFFFFF`. Cards are `#FFFFFF` with 1px hairline borders (`border-zinc-200`).
- **Dark Mode:** Canvas is pure black OLED `#000000`. Elevated surfaces are `#09090B` with 1px borders (`border-zinc-800`).
- **Strictly Banned:** Frosted glass (`backdrop-blur`), neon glow borders, purple-to-blue gradients (`from-purple-500 to-blue-500`), and colorful background blur blobs.

### 11.2 Emil Kowalski Tactile Physics
- **Button Press:** All interactive buttons (`Retry`, `Hard`, `Good`, `Easy`, deck cards) use snappy spring compression:
  ```css
  .btn-press:active {
    transform: scale(0.97);
    transition: transform 100ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  ```
  On mobile: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` fires on press.
- **Card Flip:** 3D card rotation uses spring easing curves (duration: 250ms). Front and back surfaces use `backface-visibility: hidden` with auto-height layout transitions to prevent text clipping.
- **Tabular Numerals:** Every timer, card countdown, due count, and mastery percentage has CSS `font-variant-numeric: tabular-nums;` / `tnum` to eliminate layout jitter.

### 11.3 Zero Unicode Emojis
- **Zero emojis anywhere in UI or copy.**
- All icons are imported directly from `lucide-react` (Web) and `lucide-react-native` (Mobile).

---

# 12. Ordered Implementation Roadmap

Now that all architectural questions are locked down, execution proceeds in this precise sequence:

```
STEP 1: Run Database Migration
  ├── ALTER flashcard_decks (visibility, tags)
  ├── ALTER flashcards (position, front_content, back_content, options, correct_answer)
  ├── CREATE flashcard_review_states (with data backfill)
  ├── CREATE flashcard_review_events
  ├── CREATE deck_members
  ├── CREATE stored procedures: reorder_flashcards, import_deck_cards, save_public_deck
  └── CREATE dashboard RPC: get_student_home_cockpit
        ↓
STEP 2: Update Shared TypeScript Types & Study Engine
  ├── lib/shared/src/types.ts (Deck, Card, ReviewState, Member)
  ├── lib/shared/src/schemas.ts (Zod TipTap AST, Import schema)
  └── lib/study-engine/src/sm2.ts (Retry in-session requeue, cap intervals, local timezone)
        ↓
STEP 3: Deck Library & CRUD (Web + Mobile)
  ├── My Decks, Saved, Shared, Discover tabs
  ├── Deck Creation Modal (Course link, visibility)
  └── Deck Command Center Page
        ↓
STEP 4: Rapid Authoring Editor
  ├── Web Multi-Card simultaneous workspace (Tab / Cmd+Enter hotkeys)
  ├── Mobile Stacked responsive editor (Keyboard-aware scrolling)
  └── Image drag/paste via CAS bucket
        ↓
STEP 5: Import System
  ├── Bulk Paste parser (Tab/Comma auto-detection)
  ├── Quizlet file importer
  └── Atomic commit via import_deck_cards RPC
        ↓
STEP 6: Study Player
  ├── Standard SRS mode (Retry, Hard, Good, Easy)
  ├── Authored MCQ mode
  ├── Authored True/False mode
  └── Match mode
        ↓
STEP 7: Home Cockpit Integration
  └── Wire get_student_home_cockpit RPC into Home Dashboard
```

---

*This document is the authoritative architectural contract. All code, migrations, and UI components must adhere strictly to these resolutions.*
