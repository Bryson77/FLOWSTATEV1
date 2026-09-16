# Saktus Academic OS: Comprehensive Engineering Audit Findings Report

**Document Status:** Production Engineering Audit & Vulnerability Catalog  
**Target Repository:** Bryson77/FLOWSTATEV1 (`apps/web`, `apps/mobile`, `apps/api`, `lib/shared`, `lib/study-engine`, `supabase`)  
**Backend Infrastructure:** Supabase PostgreSQL `maftkhcqxhjhhmkkgmpi.supabase.co` (Postgres 17.6.1)  
**Primary Reference Specs:**  
* [`Saktus_Flashcards_MVP_Implementation_Spec.md`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/Saktus_Flashcards_MVP_Implementation_Spec.md)  
* [`docs/FLASHCARD_SCHEMA_AND_MIGRATION_RECONCILIATION.md`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/docs/FLASHCARD_SCHEMA_AND_MIGRATION_RECONCILIATION.md)  
* [`docs/AUDIT.MD`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/docs/AUDIT.MD)  
**Audit Executed:** September 14, 2026  

---

## 1. EXECUTIVE SUMMARY

### 1.1 Overall System Health Scorecard

| Dimension | Assessment | Operational Status |
|---|---|---|
| **Overall Health** | **Degraded** | Core database tables and stored procedures exist, but critical client-to-database contract disconnects cause silent data loss on mobile and multiple severe RLS vulnerabilities. |
| **Security & RLS** | **Vulnerable** | Critical table-wipe flaw on `deck_views`, ownership-takeover flaw on `flashcard_decks_update`, and asymmetric locking on `friendships`. |
| **Flashcard Subsystem** | **Non-Compliant & Data-Dropping** | 100% of mobile study sessions silently drop all progress. Academic hierarchy (`Student -> Course -> Deck -> Card`) is completely unbuilt; cards and decks render in an unorganized flat grid. |
| **API & Data Access** | **Fragile** | Monolithic client-side queries without server validation. Cloudflare Worker API (`apps/api`) is completely disconnected from web/mobile frontends. |
| **Routing & Redirects** | **Brittle** | Zero deep links on web; state drops on page reload. Linked `/settings` route is a 404. Unauthenticated redirects drop destination parameters. |
| **Theme & UX** | **Broken Dual-Mode** | Mobile has zero light mode support (hardcoded pitch black palette). Web exhibits hydration theme flashing (FOUC). |

### 1.2 Issue Count by Severity

* **Critical Priority:** 5
* **High Priority:** 6
* **Medium Priority:** 6
* **Low Priority:** 3
* **Total Discovered Issues:** 20

---

## 2. CRITICAL FINDINGS (DATA LOSS, SECURITY VULNERABILITIES, BROKEN CORE FLOWS)

---

### [CRITICAL-01] Mobile Study Reviews Silently Drop All SRS Progress (100% Data Loss)

* **Evidence:** Live inspection of table `public.flashcard_review_events` in Supabase (`maftkhcqxhjhhmkkgmpi`) contains only 1 row (logged from web). Zero rows exist from mobile testing.
* **Exact file/function/table:** [`apps/mobile/app/(tabs)/cards.tsx#L638-L662`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/%28tabs%29/cards.tsx#L638-L662), interacting with tables `public.flashcard_review_events` and `public.flashcard_review_states`.
* **Root cause:** 
  1. `cards.tsx:640` executes:
     ```ts
     await supabase.from("flashcard_review_events").insert({
       user_id: user.id,
       card_id: currentCard.id,
       rating: rating === "again" ? "retry" : rating,
       review_duration_ms: durationMs,
     });
     ```
  2. Table `flashcard_review_events` in PostgreSQL requires `deck_id UUID NOT NULL`. Mobile does not provide `deck_id`.
  3. The column in PostgreSQL is named `response_time_ms`, but mobile supplies `review_duration_ms` (which does not exist).
  4. PostgreSQL throws an unhandled exception immediately: `column "review_duration_ms" of relation "flashcard_review_events" does not exist` and `null value in column "deck_id" violates not-null constraint`.
  5. Because the insert and the subsequent `flashcard_review_states.upsert` are combined in a single `try` block, execution immediately jumps to `catch (err)` at line 659:
     ```ts
     } catch (err) {
       console.error("Failed to persist review rating:", err);
     }
     ```
  6. The `upsert` on `flashcard_review_states` is skipped entirely.
* **Impact:** Complete data loss. Every study session completed on mobile devices fails silently. Intervals, ease factors, repetitions, and due dates are never recorded or updated in the database.
* **Reproduction path:**
  1. Launch mobile app in iOS Simulator or Android Emulator.
  2. Navigate to **Cards** -> Open any deck -> Tap **Study Due**.
  3. Reveal answer and tap **Good** or **Easy**.
  4. Inspect console: Error is logged, but UI continues smoothly.
  5. Navigate back to Library: The cards remain due, interval remains 0, and database tables remain empty.
* **Fix required:**
  1. Pass `deck_id: currentCard.deck_id` and rename `review_duration_ms` to `response_time_ms`.
  2. Isolate the audit event logging from the critical state upsert so an audit failure cannot abort interval progression.

---

### [CRITICAL-02] Arbitrary Deletion of All User Views via Broad `deck_views_all` RLS Policy

* **Evidence:** Live query of `pg_policies` on `public.deck_views`:
  ```sql
  SELECT policyname, permissive, roles, cmd, qual, with_check 
  FROM pg_policies WHERE tablename = 'deck_views';
  ```
  Output:
  ```json
  {
    "tablename": "deck_views",
    "policyname": "deck_views_all",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "(user_id = ( SELECT auth.uid() AS uid))"
  }
  ```
* **Exact file/function/table:** Table `public.deck_views`, policy `deck_views_all` in [`supabase/migrations/20260914_flashcard_v2_reconciliation.sql#L190`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/supabase/migrations/20260914_flashcard_v2_reconciliation.sql#L190).
* **Root cause:** The policy is defined as `FOR ALL` with `USING (true)`. In PostgreSQL RLS, `cmd = ALL` applies the `qual` (USING expression) to `SELECT`, `UPDATE`, and `DELETE` operations. For `DELETE` statements, PostgreSQL evaluates *only* the `USING` clause; `WITH CHECK` is completely ignored. Because `USING (true)` evaluates to true for all rows, any client can execute a blanket `DELETE` on the entire table.
* **Impact:** Catastrophic data loss / vandalization. Any authenticated or anonymous user can wipe all view analytics across the entire platform.
* **Reproduction path:**
  Execute from any client:
  ```ts
  const { error } = await supabase.from('deck_views').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  ```
  Result: Postgres deletes 100% of rows in `deck_views`.
* **Fix required:** Drop `deck_views_all` and replace with granular policies:
  ```sql
  DROP POLICY IF EXISTS deck_views_all ON public.deck_views;
  CREATE POLICY deck_views_select ON public.deck_views FOR SELECT USING (true);
  CREATE POLICY deck_views_insert ON public.deck_views FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
  -- Disallow arbitrary UPDATE and DELETE entirely
  ```

---

### [CRITICAL-03] Deck Ownership Hijacking by Invited Editors via Tautological `WITH CHECK`

* **Evidence:** Live query of `pg_policies` on `public.flashcard_decks`:
  ```sql
  SELECT policyname, cmd, qual, with_check 
  FROM pg_policies WHERE tablename = 'flashcard_decks' AND policyname = 'flashcard_decks_update';
  ```
  Output:
  ```json
  {
    "policyname": "flashcard_decks_update",
    "cmd": "UPDATE",
    "qual": "((user_id = ( SELECT auth.uid() AS uid)) OR check_is_deck_member(id, ( SELECT auth.uid() AS uid), 'editor'::text))",
    "with_check": "(user_id = user_id)"
  }
  ```
* **Exact file/function/table:** Table `public.flashcard_decks`, policy `flashcard_decks_update` in [`supabase/migrations/20260914_flashcard_v2_reconciliation.sql#L154`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/supabase/migrations/20260914_flashcard_v2_reconciliation.sql#L154).
* **Root cause:** The policy grants `UPDATE` access to users who are registered as an `editor` in `deck_members`. However, the `WITH CHECK` clause is written as `(user_id = user_id)`. In PostgreSQL `WITH CHECK` expressions on `UPDATE`, column references refer to the *newly proposed row values* (`NEW.user_id = NEW.user_id`). Comparing a column to itself is a tautology and always evaluates to `true`. Consequently, an editor can submit an `UPDATE` payload modifying `user_id` to their own ID.
* **Impact:** Complete account boundary breach and deck theft. An invited editor can permanently seize ownership of a creator's deck, lock out the original creator, alter visibility, or delete it.
* **Reproduction path:**
  1. User A (Owner) creates private deck `deck-123` and invites User B as `editor`.
  2. User B runs:
     ```ts
     await supabase.from('flashcard_decks').update({ user_id: userB.id }).eq('id', 'deck-123');
     ```
  3. Postgres passes the check. User B is now the registered owner. User A loses administrative rights.
* **Fix required:** Harden `flashcard_decks_update` to prevent changing the deck owner:
  ```sql
  DROP POLICY IF EXISTS flashcard_decks_update ON public.flashcard_decks;
  CREATE POLICY flashcard_decks_update ON public.flashcard_decks
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid()) OR 
    check_is_deck_member(id, (SELECT auth.uid()), 'editor')
  )
  WITH CHECK (
    user_id = (SELECT d.user_id FROM public.flashcard_decks d WHERE d.id = flashcard_decks.id)
  );
  ```

---

### [CRITICAL-04] Mobile Public Deck Saving Always Fails (RPC Parameter Mismatch)

* **Evidence:** Live inspection of `pg_proc` for procedure `save_public_deck`:
  `proname: save_public_deck`, `proargnames: ["p_source_deck_id"]`.
  Client call in [`apps/mobile/app/(tabs)/cards.tsx#L542`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/%28tabs%29/cards.tsx#L542):
  ```ts
  const { error } = await supabase.rpc("save_public_deck", {
    p_deck_id: deckId,
  });
  ```
* **Exact file/function/table:** [`apps/mobile/app/(tabs)/cards.tsx#L542`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/%28tabs%29/cards.tsx#L542), calling PostgreSQL procedure `public.save_public_deck`.
* **Root cause:** Mobile passes parameter `p_deck_id`. PostgreSQL cannot find a function matching that signature and returns error `42883: function public.save_public_deck(p_deck_id => uuid) does not exist`.
* **Impact:** Core community sharing broken on mobile. 100% of mobile users attempting to bookmark or save a community deck receive an error alert.
* **Reproduction path:**
  1. Open mobile app -> **Cards** -> **Discover**.
  2. Tap **Save to Library** on any public deck.
  3. Alert modal displays: "Failed to save deck."
* **Fix required:** Update `cards.tsx:542` to pass `p_source_deck_id: deckId`:
  ```ts
  const { error } = await supabase.rpc("save_public_deck", {
    p_source_deck_id: deckId,
  });
  ```

---

### [CRITICAL-05] Recipient Cannot Accept Friend Requests via Client Supabase Queries

* **Evidence:** Live query of `pg_policies` on `public.friendships`:
  ```sql
  SELECT policyname, cmd, qual, with_check 
  FROM pg_policies WHERE tablename = 'friendships';
  ```
  Output:
  ```json
  {
    "policyname": "Users view their friendships",
    "cmd": "ALL",
    "qual": "((( SELECT auth.uid() AS uid) = user_id) OR (( SELECT auth.uid() AS uid) = friend_id))",
    "with_check": "(( SELECT auth.uid() AS uid) = user_id)"
  }
  ```
* **Exact file/function/table:** Table `public.friendships`, policy `Users view their friendships` in [`supabase/migrations/20260913_saktus_master.sql#L330`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/supabase/migrations/20260913_saktus_master.sql#L330).
* **Root cause:** The policy is written with `cmd: ALL` and `with_check: (auth.uid() = user_id)`. When the recipient (`friend_id`) receives a friend request and attempts to update `status` from `'pending'` to `'accepted'`, Postgres evaluates `with_check`. Because `auth.uid() == friend_id` and NOT `user_id`, Postgres blocks the update with an RLS violation.
* **Impact:** Complete breakdown of mutual friendship establishment. Recipient students cannot accept pending friend requests through direct client queries.
* **Reproduction path:**
  1. Student A sends request to Student B (`user_id = A, friend_id = B, status = 'pending'`).
  2. Student B attempts to accept:
     ```ts
     await supabase.from('friendships').update({ status: 'accepted' }).eq('user_id', studentA.id).eq('friend_id', studentB.id);
     ```
  3. Postgres returns error: `new row violates row-level security policy for table "friendships"`.
* **Fix required:** Decompose the policy into separate operations:
  ```sql
  DROP POLICY IF EXISTS "Users view their friendships" ON public.friendships;
  CREATE POLICY friendships_select ON public.friendships FOR SELECT 
    USING ((SELECT auth.uid()) IN (user_id, friend_id));
  CREATE POLICY friendships_insert ON public.friendships FOR INSERT 
    WITH CHECK ((SELECT auth.uid()) = user_id);
  CREATE POLICY friendships_update ON public.friendships FOR UPDATE 
    USING ((SELECT auth.uid()) IN (user_id, friend_id))
    WITH CHECK ((SELECT auth.uid()) IN (user_id, friend_id));
  CREATE POLICY friendships_delete ON public.friendships FOR DELETE 
    USING ((SELECT auth.uid()) IN (user_id, friend_id));
  ```

---

## 3. HIGH PRIORITY FINDINGS

---

### [HIGH-01] Academic Hierarchy Breakdown: Course Grouping Missing in Web & Mobile

* **Evidence:** Inspection of [`apps/web/src/app/(dashboard)/flashcards/page.tsx#L2067-L2144`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/app/%28dashboard%29/flashcards/page.tsx#L2067-L2144) and [`apps/mobile/app/(tabs)/cards.tsx#L1670-L1804`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/%28tabs%29/cards.tsx#L1670-L1804).
* **Root cause:** 
  1. Both platforms fetch decks and courses as independent arrays.
  2. Neither web nor mobile performs any course grouping transformation in JavaScript.
  3. Web maps directly over a flat 1D array:
     ```tsx
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
       {filteredDecks.map((deck) => ( ... ))}
     </div>
     ```
  4. Mobile similarly maps directly over `displayedDecks`:
     ```tsx
     <View style={styles.deckList}>
       {displayedDecks.map((deck) => ( ... ))}
     </View>
     ```
  5. The only course interaction is a flat dropdown or chip filter.
* **Impact:** Complete failure of Section 4 in `Saktus_Flashcards_MVP_Implementation_Spec.md` (`Student -> Course / Subject -> Deck -> Card`). 
  - Courses with zero decks do not appear in the library.
  - Decks without courses are not cleanly segregated into a General section.
  - Students cannot view all subtopic decks under an academic subject at a glance.
* **Fix required:** Refactor library rendering to group decks by course ID into an authoritative tree structure, with course section headers, mastery rollups, an uncategorized bucket, and empty-course cards.

---

### [HIGH-02] Public/Shared Decks Strip Course Context due to Strict `courses` RLS

* **Evidence:** Live query on `public.courses`:
  `policyname: "Users manage their own courses", qual: "(( SELECT auth.uid() AS uid) = user_id)"`.
* **Root cause:** When Student B views a public or shared deck created by Student A, the client executes:
  `supabase.from("flashcard_decks").select("*, courses(name, code)").eq("visibility", "public")`.
  Because Student B is not the owner of Student A's course, PostgreSQL RLS silently hides the joined course row and returns `courses: null`.
* **Impact:** Public community decks and shared collaborative decks lose their academic subject name/code and always render as "General Deck" for non-owners.
* **Fix required:** Add a public reference policy to `public.courses`:
  ```sql
  CREATE POLICY courses_select_shared ON public.courses FOR SELECT
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.flashcard_decks d 
      WHERE d.course_id = courses.id AND (
        d.visibility = 'public' OR 
        check_is_deck_member(d.id, (SELECT auth.uid()))
      )
    )
  );
  ```

---

### [HIGH-03] Social Disconnect: Social Page Uses `follows` while Flashcard RLS Checks `friendships`

* **Evidence:** 
  - Social dashboard ([`apps/web/src/app/(dashboard)/friends/page.tsx#L94`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/app/%28dashboard%29/friends/page.tsx#L94)) queries and writes to table `public.follows`.
  - Flashcard RLS policy `flashcard_decks_select` checks:
    ```sql
    (visibility = 'friends' AND EXISTS (SELECT 1 FROM friendships WHERE status = 'accepted' AND ...))
    ```
* **Root cause:** Architectural mismatch between the social frontend and database security layers. The frontend implemented an asymmetric follower model (`follows`), whereas the deck security policy was written against a symmetric friend model (`friendships`).
* **Impact:** Setting a deck's visibility to `friends` renders it completely invisible to all peers, because users never populate `friendships` in the app.
* **Fix required:** Reconcile the social model. Update `flashcard_decks_select` and `flashcards_select` to verify mutual follows in `follows`:
  ```sql
  EXISTS (
    SELECT 1 FROM public.follows f1
    JOIN public.follows f2 ON f1.follower_id = f2.followee_id AND f1.followee_id = f2.follower_id
    WHERE f1.follower_id = (SELECT auth.uid()) AND f1.followee_id = flashcard_decks.user_id
  )
  ```

---

### [HIGH-04] Unstudied Cards Report 0 Due on Dashboards and Cockpit RPC

* **Evidence:** Query in [`apps/web/src/app/(dashboard)/home/page.tsx#L160-L164`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/app/%28dashboard%29/home/page.tsx#L160-L164), [`apps/mobile/app/(tabs)/index.tsx#L121`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/%28tabs%29/index.tsx#L121), and stored procedure `get_student_home_cockpit`:
  ```sql
  SELECT COUNT(*) INTO v_cards_due 
  FROM public.flashcard_review_states 
  WHERE user_id = v_user_id AND due_date <= v_local_date;
  ```
* **Root cause:** Newly created flashcards do not have a record in `flashcard_review_states` until their first review. The Home dashboards and the cockpit RPC query *only* `flashcard_review_states`.
* **Impact:** A student who creates 100 new flashcards sees "0 cards due today" on their academic cockpit. Conversely, the Flashcards library page correctly considers unstudied cards due and reports 100 due. The two pages contradict each other.
* **Fix required:** Update dashboard due queries and `get_student_home_cockpit` to count cards that have an overdue/today state in `flashcard_review_states` OR have no review state row in `flashcard_review_states`.

---

### [HIGH-05] Total Absence of Light Mode Support in Mobile Application

* **Evidence:** Inspection of [`apps/mobile/app/(tabs)/cards.tsx#L2450-L2868`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/%28tabs%29/cards.tsx#L2450-L2868) and [`apps/mobile/app/(tabs)/index.tsx#L800-L894`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/%28tabs%29/index.tsx#L800-L894).
* **Root cause:** All mobile tab stylesheets use static `StyleSheet.create` with hardcoded dark hex codes:
  - `backgroundColor: "#09090B"`
  - `backgroundColor: "#000000"`
  - `color: "#FFFFFF"`
  - `borderColor: "rgba(255,255,255,0.08)"`
  No dynamic theme hook or `useColorScheme()` branching exists inside the screens.
* **Impact:** Severe visual bug on light mode devices. Root containers turn white while card bodies, inputs, and modals remain pitch black with white text, causing unreadable borders and broken aesthetics. Directly violates Saktus dual-mode design requirements.
* **Fix required:** Implement a central theme hook `useThemeColors()` returning pure white `#FFFFFF` card surfaces with `#E4E4E7` borders in light mode, and `#09090B` surfaces with `#27272A` borders in dark mode.

---

### [HIGH-06] Web Flashcards Page Lacks Deep Links, Sub-Routes, and History State

* **Evidence:** Directory [`apps/web/src/app/(dashboard)/flashcards`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/app/%28dashboard%29/flashcards) contains solely `page.tsx` (2,557 lines).
* **Root cause:** The entire application lifecycle (Library, Deck Detail, Study Player, Rapid Multi-Card Editor, Match Game) is operated via internal React state:
  `const [viewMode, setViewMode] = useState<ViewMode>("library");`
* **Impact:**
  1. Refreshing the browser while studying or editing loses all active state and kicks the student back to the library.
  2. Browser back button leaves `/flashcards` completely rather than exiting the active study session.
  3. Students cannot bookmark or send a direct URL to a deck (e.g. `/flashcards/[id]`).
* **Fix required:** Refactor the 2,557-line monolith into Next.js App Router sub-routes:
  - `/flashcards` (Library)
  - `/flashcards/[id]` (Deck Command Center)
  - `/flashcards/[id]/study` (Study Player)
  - `/flashcards/[id]/edit` (Rapid Multi-Card Editor)
  - `/flashcards/[id]/match` (Match Game)

---

## 4. MEDIUM PRIORITY FINDINGS

---

### [MEDIUM-01] 404 Route on Settings from Web Sidebar and Onboarding

* **Evidence:** Desktop sidebar ([`sidebar.tsx:101`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/components/navigation/sidebar.tsx#L101)) links to `/settings`. Onboarding modal ([`onboarding-modal.tsx:82`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/components/onboarding-modal.tsx#L82)) directs users to update preferences in settings.
* **Root cause:** Directory `apps/web/src/app/(dashboard)/settings` does not exist.
* **Impact:** Clicking "Settings" results in a standard Next.js 404 Not Found error.
* **Fix required:** Create `apps/web/src/app/(dashboard)/settings/page.tsx` exposing account preferences, daily study goal adjustments, and theme configuration.

---

### [MEDIUM-02] Hardcoded Dummy Courses in Web Sidebar

* **Evidence:** [`apps/web/src/components/navigation/sidebar.tsx#L29-L33`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/components/navigation/sidebar.tsx#L29-L33):
  ```ts
  const courses = [
    { id: '1', name: 'Computer Science', color: 'bg-blue-500' },
    { id: '2', name: 'Mathematics', color: 'bg-red-500' },
    { id: '3', name: 'Physics', color: 'bg-green-500' },
  ];
  ```
* **Root cause:** Courses are hardcoded mock data. Furthermore, course items are rendered as inert `<div>` containers with no `onClick` or `href`, and the `+` button has no event handler.
* **Impact:** Real student courses created in Timetable or Onboarding never appear in the sidebar.
* **Fix required:** Connect `sidebar.tsx` to Supabase `courses` query and implement navigation to `/timetable?course=[id]` or `/flashcards?course=[id]`.

---

### [MEDIUM-03] Single Card Creation Fails to Populate ProseMirror Rich Content

* **Evidence:** [`apps/web/src/app/(dashboard)/flashcards/page.tsx#L576`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/app/%28dashboard%29/flashcards/page.tsx#L576) and [`apps/mobile/app/(tabs)/cards.tsx#L460`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/%28tabs%29/cards.tsx#L460).
* **Root cause:** Individual card creation modals only supply `front_text` and `back_text`. In PostgreSQL, `front_content` and `back_content` fall back to `'{"type": "doc", "content": []}'::jsonb`.
* **Impact:** Structured card content renders as blank when accessed by rich-content AST viewers.
* **Fix required:** Construct standard ProseMirror paragraph nodes when creating single cards:
  ```ts
  front_content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: cardFront.trim() }] }] }
  ```

---

### [MEDIUM-04] Flash of Unstyled Content (FOUC) on Web Dark Mode Refresh

* **Evidence:** [`apps/web/src/components/theme-provider.tsx#L17-L34`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/components/theme-provider.tsx#L17-L34).
* **Root cause:** React component state is initialized to `'light'` before reading `localStorage` in `useEffect`. When client-side hydration occurs, a momentary white flicker is visible before `root.classList.add('dark')` takes effect.
* **Impact:** Visual jarring for dark mode users on page reloads.
* **Fix required:** Synchronize initial theme state via an inline script and ensure the theme provider reads the pre-existing DOM class synchronously on first paint.

---

### [MEDIUM-05] Date Boundary Timezone Inconsistencies Across Modules

* **Evidence:** Web flashcards page ([`page.tsx:205`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/app/%28dashboard%29/flashcards/page.tsx#L205)), mobile cards ([`cards.tsx:163`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/%28tabs%29/cards.tsx#L163)), and analytics ([`analytics/page.tsx:86`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/app/%28dashboard%29/analytics/page.tsx#L86)) use `new Date().toISOString().split("T")[0]`.
* **Root cause:** Code uses UTC dates instead of calling `getLocalISODate(new Date(), userTimezone)` from `@saktus/study-engine`.
* **Impact:** For students studying in UTC+2 (e.g. South Africa) between 22:00 and 23:59, study activity is recorded under the wrong calendar date.
* **Fix required:** Standardize all calendar date evaluations on `getLocalISODate()`.

---

### [MEDIUM-06] Purple Border on Mobile Home SRS Card

* **Evidence:** [`apps/mobile/app/(tabs)/index.tsx#L831`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/%28tabs%29/index.tsx#L831):
  `borderColor: "rgba(168,85,247,0.2)"`.
* **Root cause:** Hardcoded purple border (`rgba(168,85,247,0.2)`) violates Saktus design rules explicitly prohibiting purple/neon styling.
* **Impact:** Visual inconsistency with the clean zinc aesthetic.
* **Fix required:** Replace with `border-zinc-800` / `rgba(255,255,255,0.08)`.

---

## 5. LOW PRIORITY FINDINGS

---

### [LOW-01] Mobile Match Game Uses Non-Reactive Window Dimensions

* **Exact file/function/table:** [`apps/mobile/app/(tabs)/cards.tsx#L2618`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/%28tabs%29/cards.tsx#L2618).
* **Root cause:** Grid tile width is computed statically:
  `width: (Dimensions.get("window").width - 50) / 2`.
* **Impact:** Tiles do not resize when a tablet rotates or enters split-screen mode.
* **Fix required:** Replace with `useWindowDimensions()` hook.

---

### [LOW-02] Inconsistent Bottom Navigation Destinations (Web vs Mobile)

* **Exact file/function/table:** [`apps/web/src/components/navigation/bottom-nav.tsx`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/components/navigation/bottom-nav.tsx) vs [`apps/mobile/app/(tabs)/_layout.tsx`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/%28tabs%29/_layout.tsx).
* **Root cause:** Web bottom navigation contains Timer and lacks Profile; mobile bottom navigation contains Profile and hides Timer.
* **Impact:** Minor navigation discrepancy between platforms.
* **Fix required:** Standardize web bottom navigation to match mobile: Home, Schedule, Cards, Social, Profile.

---

### [LOW-03] Write-Only `deck_reports` Table

* **Exact file/function/table:** Table `public.deck_reports`.
* **Root cause:** Only an `INSERT` policy exists (`reporter_id = auth.uid()`). No `SELECT` policy exists for any role.
* **Impact:** User reports cannot be retrieved or inspected by any user or moderator without using a service-role key.
* **Fix required:** Add administrative/moderator read policies or define a triage RPC.

---

## 6. FLASHCARD FAILURE TRACE & COURSE GROUPING DEEP DIVE

### 6.1 End-to-End Execution Trace: The Course Grouping Bug

The prompt specifically requested a rigorous trace answering why the course hierarchy is broken. Below is the exact layer-by-layer breakdown:

```
1. DATABASE SCHEMA LAYER:
   - Table: public.flashcard_decks
   - Column: course_id UUID NULL REFERENCES public.courses(id) ON DELETE SET NULL
   - Foreign Key: flashcard_decks_course_id_fkey
   - Status: Properly configured in PostgreSQL.

2. ROW LEVEL SECURITY (RLS) LAYER:
   - Table: public.courses
   - Policy: "Users manage their own courses"
   - Qual: ((SELECT auth.uid()) = user_id)
   - Behavior on Own Decks: Query succeeds; course { name, code } is returned.
   - Behavior on Public/Shared Decks: When Viewer B reads Deck A, courses table blocks Viewer B.
     PostgREST silently outputs: courses: null ("General Deck").

3. DATA FETCHING LAYER:
   - File: apps/web/src/app/(dashboard)/flashcards/page.tsx:231
   - Fetch Call:
     supabase.from("flashcard_decks").select(`
       id, course_id, user_id, title, description, tags, is_public, visibility, revision, created_at,
       courses (name, code),
       flashcards (...)
     `).eq("user_id", user.id)
   - Result: Decks are returned as a flat array of objects: Deck[].

4. STATE STORAGE LAYER:
   - File: apps/web/src/app/(dashboard)/flashcards/page.tsx:286
   - State Variable: const [myDecks, setMyDecks] = useState<EnhancedDeck[]>([]);
   - Transformation: Arrays are processed into flat lists. No map, grouping, or tree structure is built.

5. FILTERING & DERIVATION LAYER:
   - File: apps/web/src/app/(dashboard)/flashcards/page.tsx:1133
   - Logic:
     const filteredDecks = currentTabDecks.filter((deck) => {
       const matchesCourse = selectedCourseFilter === "all" ||
         (selectedCourseFilter === "none" && !deck.course_id) ||
         deck.course_id === selectedCourseFilter;
       return matchesCourse && matchesSearch;
     });
   - Result: filteredDecks remains a 1D flat array.

6. COMPONENT & RENDERING LAYER:
   - File: apps/web/src/app/(dashboard)/flashcards/page.tsx:2067-2144
   - JSX Structure:
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
       {filteredDecks.map((deck) => (
         <DeckCard key={deck.id} deck={deck} />
       ))}
     </div>
   - Result: A completely flat grid. Zero course sections. Zero course hierarchy.
```

### 6.2 Specific Questions Addressed

* **Is `course_id` actually being saved when a deck is created?**  
  Yes. Both web (`page.tsx:440`) and mobile (`cards.tsx:411`) pass `course_id`.
* **Is the course relationship being fetched?**  
  Yes. Both platforms include `courses(name, code)` in their select queries.
* **Is the query joining the correct course table?**  
  Yes. Foreign key `flashcard_decks_course_id_fkey` joins `public.courses`.
* **Is the frontend expecting a different field name?**  
  No. TypeScript types match (`courses?: { name: string; code: string } | null`).
* **Are decks being fetched independently and never grouped?**  
  **Yes.** Decks are fetched as flat arrays and stored directly into state without any grouping transformation.
* **Is grouping happening incorrectly in JavaScript?**  
  Grouping is **not happening at all**. There is no grouping code in either client.
* **Are null/general decks handled correctly?**  
  Partially. They render with the fallback string `"General Deck"` in the flat list, but there is no dedicated uncategorized section.
* **Does the database query return enough course information?**  
  It returns `name` and `code`, which is sufficient for grouping, but lacks `color`.
* **Does RLS hide the course/deck relationship?**  
  **Yes, for all public and shared decks.** Non-owners cannot read the linked course row due to `courses` RLS.
* **Does the UI actually have a grouped-by-course rendering mode?**  
  **No.** Neither web nor mobile has any grouped-by-course rendering mode.
* **Does navigation from Course -> Deck work?**  
  **No.** There are no course pages or navigation paths from courses to their decks.
* **Are empty courses handled?**  
  **No.** Courses with zero decks do not appear in the library at all.
* **Does the mobile UI implement the same hierarchy?**  
  No. Mobile implements the same flat list with horizontal filter chips.

---

## 7. RLS / AUTHORIZATION AUDIT MATRIX

| Table Name | Operation | Live RLS Policy Definition | Intended Access | Vulnerability / Flaw |
|---|---|---|---|---|
| `public.courses` | ALL | `(auth.uid() = user_id)` | Owner only | **Hides course details** on public/shared decks from non-owners |
| `public.flashcard_decks` | SELECT | `user_id = auth.uid() OR visibility = 'public' OR (visibility = 'friends' AND friends) OR check_is_deck_member(...)` | Owner, public, friends, members | **Broken friends check** (UI uses `follows`, not `friendships`) |
| `public.flashcard_decks` | INSERT | `(user_id = auth.uid())` | Authenticated creator | Secure |
| `public.flashcard_decks` | UPDATE | `(user_id = auth.uid() OR member(editor))` <br>`WITH CHECK (user_id = user_id)` | Owner & editors | **CRITICAL: Ownership takeover** via tautological `WITH CHECK` |
| `public.flashcard_decks` | DELETE | `(user_id = auth.uid())` | Owner only | Secure |
| `public.flashcards` | SELECT | Deck owner, deck public, friend, member | Authorized viewers | Secure |
| `public.flashcards` | INSERT | Deck owner or member(editor) | Owner & editors | Secure |
| `public.flashcards` | UPDATE | Deck owner or member(editor) | Owner & editors | Secure |
| `public.flashcards` | DELETE | Deck owner or member(editor) | Owner & editors | Secure |
| `public.flashcard_review_states` | ALL | `(user_id = auth.uid())` | Student private | Secure |
| `public.flashcard_review_events` | ALL | `(user_id = auth.uid())` | Student private | Secure |
| `public.deck_members` | SELECT | `user_id = auth.uid() OR is_deck_owner` | Self or deck owner | Non-owner editors cannot see other collaborators |
| `public.deck_members` | ALL | `is_deck_owner` | Deck owner only | Secure |
| `public.deck_saves` | ALL | `(user_id = auth.uid())` | User only | Secure |
| `public.deck_views` | ALL | `USING (true)` <br>`WITH CHECK (user_id = auth.uid())` | Public read, user write | **CRITICAL: Anyone can DELETE ALL rows** |
| `public.deck_ratings` | SELECT | `true` | Public | Secure |
| `public.deck_ratings` | ALL | `(user_id = auth.uid())` | Owner of rating | Secure |
| `public.deck_reports` | INSERT | `(reporter_id = auth.uid())` | Authenticated reporter | Write-only black hole (no SELECT policy) |
| `public.friendships` | ALL | `USING (uid IN (user, friend))` <br>`WITH CHECK (uid = user)` | Bilateral friends | **CRITICAL: Recipient cannot accept friend request** |
| `public.profiles` | SELECT | `(auth.role() = 'authenticated')` | Authenticated users | Exposes all profile fields to any logged-in student |
| `public.profiles` | UPDATE | `(auth.uid() = id)` | Profile owner | Secure |
| `public.study_sessions` | ALL | `(auth.uid() = user_id)` | Session owner | Secure |

---

## 8. SPECIFICATION DRIFT MATRIX

| Feature Requirement | Reference Specification | Current Implementation Status | Drift Level |
|---|---|---|---|
| **Academic Hierarchy** | `Student -> Course -> Deck -> Card` | Flat deck list with course dropdown filter | **Extreme (Completely Missing)** |
| **Mobile Study Persistence** | Records review events and updates SM-2 state | Drops review events and skips review state upsert | **Fatal (100% Data Loss)** |
| **Public Deck Saving (Mobile)** | One-tap save from community library | Calls wrong RPC parameter name (`p_deck_id`) | **Fatal (Always Crashes)** |
| **Friends Deck Visibility** | Accessible to mutual student friends | Checks `friendships` while UI uses `follows` | **Severe (Non-Functional)** |
| **Cockpit / Dashboard Due Cards** | Counts all cards requiring study today | Queries review states only; reports 0 for new decks | **High (Inconsistent Metrics)** |
| **Deck Routes on Web** | Dedicated URLs for decks, study, and editors | Single monolithic client state machine | **High (Non-Compliant)** |
| **Dual Theme Support** | Pure white default, pure black OLED dark mode | Mobile hardcoded dark; web has hydration FOUC | **High (Broken on Mobile)** |
| **Card Content JSON AST** | Strict ProseMirror doc structure | Individual card creation saves plain text | **Medium (Partial)** |
| **Course Sidebar Navigation** | Live student courses with navigation | Hardcoded dummy list with no click handlers | **Medium (Mocked)** |
| **Audio Synthesizer** | Procedural brown/pink/rain noise generators | Web Audio implemented but lacks lifecycle cleanup | **Low (Minor Leak)** |

---

## 9. RECOMMENDED MINIMUM SAFE FIX ORDER

The following order of operations guarantees that security vulnerabilities and data loss bugs are resolved before architectural and UI refactoring begins:

```
Phase 1: Security & Database Hotfixes (Immediate)
  ├── 1.1 Patch deck_views RLS (Drop deck_views_all; create granular SELECT and INSERT policies).
  ├── 1.2 Patch flashcard_decks_update RLS (Enforce immutable user_id in WITH CHECK).
  ├── 1.3 Patch friendships RLS (Allow friend_id to update status to 'accepted').
  └── 1.4 Patch courses RLS (Allow public read access if referenced by public/shared decks).

Phase 2: Mobile Engine Repair (Core Data Flow)
  ├── 2.1 Fix cards.tsx:640 (Add deck_id, rename review_duration_ms to response_time_ms).
  ├── 2.2 Decouple audit logging from SRS state upsert in cards.tsx.
  └── 2.3 Fix cards.tsx:542 (Pass p_source_deck_id instead of p_deck_id).

Phase 3: Academic Hierarchy & Course Grouping Engine
  ├── 3.1 Build course grouping transformer in lib/shared or FlashcardsPage.
  ├── 3.2 Implement course section containers with header statistics in web & mobile.
  ├── 3.3 Add dedicated "General / Uncategorized" section and empty-course states.
  └── 3.4 Connect sidebar to live user courses and implement course-to-deck navigation.

Phase 4: Dashboard & Metrics Reconciliation
  ├── 4.1 Update get_student_home_cockpit RPC to count unstudied cards as due.
  ├── 4.2 Update home page queries on web and mobile to match cockpit logic.
  └── 4.3 Reconcile social model (align flashcard sharing with follows table).

Phase 5: Routing & Structural Refactoring
  ├── 5.1 Refactor flashcards/page.tsx into Next.js sub-routes (/flashcards/[id], /study, /edit).
  ├── 5.2 Create missing /settings page to resolve 404s.
  └── 5.3 Implement return URL preservation on unauthenticated redirects.

Phase 6: Mobile Dual-Theme System & Tactile Polish
  ├── 6.1 Implement useThemeColors hook across all mobile tab screens.
  ├── 6.2 Provide pure white light mode cards and pure black OLED dark mode surfaces.
  ├── 6.3 Remove illegal neon purple border from mobile index.tsx.
  └── 6.4 Eliminate web hydration theme flash (FOUC) in theme-provider.tsx.
```
