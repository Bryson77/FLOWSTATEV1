# Saktus Flashcards MVP: The Architectural & Product Grill

**Document Target:** `Saktus_Flashcards_MVP_Implementation_Spec.md`  
**Evaluation Perspective:** Principal Systems Architect, Lead Mobile/Web Engineer, and Head of Product  
**Objective:** Stress-test every assumption, expose unhandled edge cases, flag database and concurrency race conditions, reconcile schema conflicts with current production, and interrogate mobile vs. web parity before a single migration or component is written.

---

## Executive Summary: The State of the Spec

The *Saktus Flashcards MVP Implementation Specification* is ambitious, thoughtful, and philosophically aligned with the anti-AI-slop, student-first ethos of Saktus. However, transitioning from a conceptual product blueprint to a rock-solid, production-grade implementation reveals critical architectural fissures, mathematical ambiguities in the SRS queue, significant schema drift against existing Supabase migrations, and unaddressed mobile rendering realities (specifically React Native vs. Web DOM capabilities).

Below are **100+ unsparing, highly targeted grilling questions** categorized into 14 core operational domains. Answer these to turn this specification into an airtight execution plan.

---

## 1. Schema Drift & Existing Production Migration Conflicts

The current repository already has running migrations:
- `20260912_initial_study_os_schema.sql` (defines `flashcard_decks` and `flashcards` with embedded SM-2 columns `repetition_number`, `interval_days`, `ease_factor`, `due_date`, and `user_id = auth.uid()`).
- `20260913_saktus_master.sql` (adds `card_type`, `options`, `correct_answer`, `tags`).
- `20260914_database_integrity_and_performance.sql` (alters `course_id` to be nullable, sets up RLS and indexes).

1. **The Great State Decoupling Migration:** The spec mandates separating `flashcards` (content) from `flashcard_review_states` and `flashcard_review_events` (§36, §58). If there is already user data in production, how will the zero-downtime migration extract existing `repetition_number`, `ease_factor`, and `due_date` into `flashcard_review_states` without dropping progress or corrupting active study sessions?
2. **`due_date` (Date) vs `due_at` (Timestamptz):** Existing schema uses `DATE DEFAULT CURRENT_DATE`. Spec §58 specifies `due_at TIMESTAMPTZ`. If a card is scheduled with a timestamp (e.g., `2026-09-15 14:32:00+02`), does it become "due" at 2:32 PM, or at the start of the student's academic day (e.g., 04:00 AM local time)? How do timezones interact with daily streak calculations and batch queue queries?
3. **Boolean `is_public` vs Enum `visibility`:** The database currently has `is_public BOOLEAN DEFAULT FALSE`. The spec requires a 3-tier enum: `'private' | 'friends' | 'public'`. What is the exact SQL migration strategy, and how are existing private/public flags re-mapped?
4. **Is `course_id` Truly Mandatory or Optional?** Section 4 defines the canonical hierarchy as `Student -> Subject/Course -> Deck -> Card` ("A deck is created around a subtopic"). Yet, migration `20260914_database_integrity_and_performance.sql` explicitly executed: `ALTER TABLE public.flashcard_decks ALTER COLUMN course_id DROP NOT NULL;`. Can a student create an independent deck without linking it to an academic course (e.g., "Spanish Vocab" or "General Trivia"), or does Saktus strictly enforce course linkage?
5. **Card Ordering (`position`):** Section 58 adds `position` to `flashcards`. What data type is `position`? If it is an integer (`INTEGER`), what happens when a deck has 500 cards and a user moves card 500 to position 1? Does the backend execute an expensive 500-row batch update, or will you use fractional indexing / LexoRank (`FLOAT8` or string-based lexicographical keys) to allow $O(1)$ reordering?
6. **Deck Attribution on Saved Decks:** When a user saves a public deck (§29, §63), where is the lineage tracked? Should `flashcard_decks` have a `source_deck_id UUID REFERENCES flashcard_decks(id) ON DELETE SET NULL` column, or a dedicated `deck_saves` join table? If the original deck is deleted, what does `Saved from @username` display?
7. **Foreign Key Cascades on User Deletion:** If a deck owner deletes their Saktus account, what happens to collaborators on shared decks? Does the deck cascade delete and wipe out the study materials of other active students, or does ownership transfer to the oldest editor?

---

## 2. Spaced Repetition (SRS) Engine & Algorithm Integrity

In `lib/study-engine/src/sm2.ts`, the algorithm currently implements `calculateSM2` and `calculateNextReview` with ratings `'again' | 'hard' | 'good' | 'easy'`, mapping to qualities `[0, 2, 4, 5]`.

8. **The "Again" vs "Retry" Renaming:** Spec §33-34 strictly demands: *"No 'Again'. Use: Retry, Hard, Good, Easy."* However, `lib/study-engine/src/sm2.ts` exports `type ReviewRating = 'again' | 'hard' | 'good' | 'easy'`. Will you update `sm2.ts` and break existing consumers, or create an adapter?
9. **The "Retry" Intraday Trap:** In `sm2.ts` (lines 53-57), when quality is $< 3$ (Retry), it does:
   ```ts
   repetitionNumber = 0;
   intervalDays = 1;
   ```
   This schedules the failed card for **tomorrow** (`dueDate = today + 1 day`). In standard cognitive retention (Anki, StudySmarter, SuperMemo), hitting "Retry" means *the card must be seen again during the same study session* (e.g., 5-10 minutes later or at the end of the deck queue) until answered correctly. Does Saktus really want failed cards to vanish until tomorrow, or must there be an in-session "re-queue" state?
10. **Session Queue Lifecycle:** If a user reviews 30 due cards, rates 5 as "Retry", 10 as "Hard", and 15 as "Good":
    - Do the 5 "Retry" cards cycle back into the current study player?
    - Does `flashcard_review_events` log an event for *every* attempt, or only the final exit rating?
    - If a student leaves the app halfway through a session, is their session saved, or do unfinished cards revert?
11. **Overdue Interval Multipliers:** If a card had an interval of 5 days, but the student was sick and reviewed it 35 days late (30 days overdue), how is the next interval calculated?
    - Standard SM-2 multiplies the *target* interval ($5 \times \text{ease} = 12\text{ days}$).
    - Anki / modern SRS algorithms scale based on the *actual elapsed time* ($35 \times \text{ease} = 87\text{ days}$).
    - Which one does Saktus use? Multiplying 5 days penalizes the student for remembering over 35 days; multiplying 35 days risks setting the interval too far out.
12. **"Study All" vs "Study Due" SRS Contamination:** The Deck page has both `[Study Due]` and `[Study All]` (§8, §77). If a student clicks `[Study All]` to cram before an exam, reviewing cards that are not due for another 3 weeks:
    - Does rating them mutate `flashcard_review_states` and push their due dates into the next semester?
    - Or does `[Study All]` run in "Cram Mode" where review states are read-only and no SRS intervals are changed?
13. **Mastery Percentage Mathematical Definition:** The spec repeatedly shows metrics like `68% mastered` (§6, §8, §44, §45). What is the exact formula for "Mastered"?
    - Is a card mastered when `interval_days >= 21`?
    - Or when `repetition_number >= 4`?
    - Or when `ease_factor >= 2.5` with at least 3 consecutive "Good" / "Easy" ratings?
    - How does a newly created card or unstudied card factor into the deck denominator?
14. **Retention Decay & Ease Factor Clamping:** In `sm2.ts`, the ease factor is clamped at `1.3` minimum, with no maximum. What prevents an easy card from reaching an ease factor of 5.0+, resulting in intervals of several years for a 1-semester university course? Should there be a maximum interval ceiling (e.g., 180 days or end of academic term)?

---

## 3. Rich Content, Equations, Images & Cross-Platform Rendering Parity

Section 11-13 states front and back content support bold, italic, underline, headings, lists, links, tables, code blocks, equations, images, and highlighting. Section 2.2 states web and mobile must have strict feature parity.

15. **The JSONB AST Schema:** Section 13 states: *"JSONB is acceptable for structured rich content if validated by a strict schema. Never trust arbitrary client JSON."* What is this schema?
    - Is it TipTap / ProseMirror JSON?
    - Is it Slate AST?
    - Is it Lexical state?
    - Or is it Markdown with custom syntax extensions?
    If an unvalidated JSON payload is injected, how does the Zod schema in `lib/shared` parse and reject malicious nodes?
16. **React Native Mobile Rendering vs. Web DOM:**
    - On Web, rendering HTML, tables, KaTeX equations, and syntax-highlighted code is trivial with CSS and standard DOM elements.
    - On Mobile (Expo / React Native), there is NO native HTML DOM.
    - How will complex tables, code blocks with syntax highlighting, and LaTeX math equations be rendered on React Native?
    - Will you use `react-native-render-html`, `react-native-math-view`, inline SVGs, or heavy WebViews (`react-native-webview`)? If WebViews are used inside a flashcard list or rapid study swipe player, how will you prevent memory leaks, frame drops, and render lag on budget Android devices?
17. **Supabase Storage Architecture for Images:** Section 12 states images are stored in Supabase Storage.
    - What is the bucket name, folder structure, and RLS policy?
    - When a user pastes an image into the editor, is it uploaded immediately (generating a remote URL), or held as a local blob until the user taps "Done / Save"?
    - If uploaded immediately and the user discards the card or cancels deck creation, does the storage bucket accumulate orphaned image files indefinitely?
    - What is the max file size limit (e.g., 5MB), and how is image compression handled before upload on mobile data?
18. **Image Orphanage on Deck / Card Deletion:** When a card containing an image is deleted, or a deck is deleted, what triggers the deletion of the corresponding file in Supabase Storage? Does a database webhook/Edge Function delete the storage object, or do images remain permanently hosted?
19. **Math Equation Input UX:** University students studying STEM need mathematical notation. How does a student input an equation?
    - Raw LaTeX syntax (e.g., `\int_{a}^{b} f(x)dx`)?
    - A visual equation picker?
    - If raw LaTeX, how is real-time syntax error validation displayed when a student enters malformed LaTeX that fails KaTeX parsing?

---

## 4. Multi-Card Authoring & Editor Ergonomics

Section 9-10 (Web) and Section 21 (Mobile) detail the flashcard editor. StudySmarter's rapid creation workflow is the stated benchmark.

20. **Web Rapid Hotkeys:** Spec §10 states: `type -> Tab -> type -> Enter -> next card`.
    - If the back of a card supports multi-line rich text and code blocks, pressing `Enter` normally creates a newline in a rich-text editor. If `Enter` commits and moves to the next card, how does a student insert a newline? Is it `Shift+Enter` for newline and `Cmd+Enter` / `Ctrl+Enter` to spawn the next card?
    - What does `Tab` do inside a code block or table (indent vs jump to Back)?
21. **Autosave vs Explicit Commit:**
    - When does a new card actually hit PostgreSQL?
    - Is there a debounced autosave (e.g., 500ms after keystroke), or does the client buffer cards in local memory until the user clicks `[Done]`?
    - If autosave is debounced, what happens if the student closes the browser tab or mobile app while typing card 4?
    - If cards are buffered in memory until `[Done]`, what happens if the student's browser tab crashes on card 25?
22. **Mobile Keyboard Layout Destruction:** Spec §21 explicitly warns: *"The keyboard must not destroy the layout. The editor must use keyboard-aware/responsive layout behavior so fields remain visible, buttons remain reachable, text does not overflow..."*
    - On iOS, `KeyboardAvoidingView` with `behavior="padding"` often behaves differently from Android's `windowSoftInputMode="adjustResize"`.
    - In a stacked multi-card scroll view with rich-text toolbars attached to the keyboard accessory view, how will the active front/back input ensure it is auto-scrolled above the keyboard without jank?
23. **Card Duplication Semantics:** When a user taps `[Duplicate]` on Card 7 of 20 (§21, §22):
    - Where is the duplicate inserted? Directly beneath Card 7 (at position 8), or appended at the very end (position 21)?
    - Does duplication copy card type, options, and rich content faithfully?
    - Does the duplicated card immediately generate a new UUID and insert to the database, or remain pending?

---

## 5. Study Modes & Question Polymorphism

Section 14-16 details card types: Standard Recall, Authored Multiple Choice (MCQ), Authored True/False, and Match Mode.

24. **Card Data Representation:** Section 14 states: *"Do not create separate unrelated entities for MCQ, True/False, standard recall, matching. Instead, retain a common card representation..."*
    - If a card is authored as an MCQ (§16), where are the distractors stored?
    - In `flashcards.options` (JSONB array of strings) and `flashcards.correct_answer` (string / index)?
    - If so, what does `front_content` and `back_content` hold for an MCQ card? Is `front_content` the question, and `back_content` the explanation?
25. **Presentation Flexibility:** If a card is authored as an MCQ with 4 choices:
    - Can a student study that same card in "Standard Mode" (where choices are hidden and they must recall the answer before revealing)?
    - If yes, what is revealed upon tapping `[Show Answer]`—just the correct choice, or the choice plus the explanation?
26. **Match Mode Game Mechanics (§40):**
    - Match Mode displays a grid of terms and definitions that disappear when paired.
    - How many pairs are rendered on screen simultaneously? (4 pairs = 8 tiles? 6 pairs = 12 tiles?)
    - What if a deck contains 40 cards? Is the match session broken into timed rounds of 6 pairs each?
    - What if a flashcard's back content is a 150-word definition or a large image? How does a 150-word definition fit onto a mobile match tile without breaking the grid or becoming illegible?
    - Should Match Mode filter out cards whose front or back exceeds a strict character threshold (e.g., > 60 characters or containing tables/code)?
27. **Match Mode Scoring & SRS Logging:**
    - Spec §40 states: *"Store study results as session data. Do not permanently mutate the flashcard simply because it was used in Match mode."*
    - Does Match Mode write any rows to `flashcard_review_events`? If not, how does Match Mode count toward the student's daily study minutes or home dashboard metrics?
28. **True/False Card Authoring:** For an authored True/False card:
    - Does the author provide a statement and flag whether it is True or False?
    - If the statement is False, is there a mandatory explanation field explaining *why* it is false?

---

## 6. Import Pipeline: Bulk Paste & Quizlet Resilience

Section 18-20 specifies Bulk Paste and Quizlet file import with a strict pipeline: `Parse -> Validate -> Preview -> Confirm -> Commit`.

29. **Delimiter Collision in Bulk Paste:** In Section 18.1, the format is `FRONT<TAB>BACK`.
    - What if a student pastes flashcards where the term or definition contains tabs, commas, or semicolons (e.g., code snippets with indentation or sentences with commas)?
    - Does the parser support custom delimiters (e.g., `|`, `::`, or custom regex)?
    - How does the parser distinguish between a newline representing a new card vs. a newline within a multi-line definition?
30. **Quizlet Export Variations:** Quizlet exports can be formatted with custom term separators (e.g., Tab, Comma) and card separators (e.g., Newline, Semicolon, `\n\n`).
    - Does the Quizlet parser detect these separators automatically, or must the student select them via dropdowns?
    - Quizlet exports often wrap multi-line text in quotation marks (`"..."`). Does your parser properly handle escaped quotes and CSV edge cases?
31. **Transaction Atomicity & Timeout Limits:** Spec §20 demands: *"If database creation fails, show: 'We couldn't finish importing these cards. Nothing was added. Try again.' Do not leave the deck half-imported."*
    - If a student imports a Quizlet set with 1,500 cards, sending a single PostgREST `insert()` of 1,500 rich-content rows can exceed the Cloudflare Worker request timeout or Supabase payload limit (typically 1MB to 5MB).
    - If you batch the insert into chunks of 100 cards over HTTP, and chunk 8 fails, the transaction is already partially committed unless wrapped in a PostgreSQL stored procedure (`SECURITY DEFINER` function).
    - Is there a dedicated Supabase RPC function (e.g., `import_deck_cards(p_deck_id, p_cards)`) that runs the entire batch inside a single `BEGIN ... EXCEPTION ... ROLLBACK` SQL transaction block?
32. **Malformed Row UX:** Spec §19 states: *"12 cards detected, 10 valid, 2 need attention. The user can edit the problematic rows before import."*
    - What makes a row "invalid"? (Empty front? Empty back? Exceeds character limits?)
    - Where does the student edit the invalid rows? Inline inside the preview modal table?
    - Can the user choose to "Skip invalid cards and import the 10 valid ones"?

---

## 7. Collaboration, Multi-Tenancy & Realtime Conflicts

Sections 24-27, 58, 61-66 address live collaboration.

33. **Granular Role Permissions:** Spec §25 defines two roles: `Owner` and `Editor`.
    - Can an Editor delete cards created by the Owner?
    - Can an Editor add other collaborators, or change deck visibility (e.g., make a Private deck Public)?
    - Can an Editor delete the entire deck? (Spec §23 says only Owner can permanently delete).
    - How are these permission checks enforced at the database level via Supabase RLS rather than just client-side UI disabling?
34. **The Optimistic Concurrency Conflict:** Spec §66 mandates: *"Send mutation versions, reject stale destructive updates, refetch when conflict detected."*
    - Does the `flashcards` table have a `version INTEGER DEFAULT 1` column, or an `updated_at TIMESTAMPTZ` check?
    - Walk through this exact scenario:
      1. Student A and Student B both have the editor open on Card 12.
      2. Student A fixes a typo on the front and saves (version 1 -> 2).
      3. Student B, unaware of Student A's edit, rewrites the back and clicks save.
      4. Does Student B get a hard error toast? A diff merge modal? Or does Student B's write get rejected and their local changes discarded?
35. **Simultaneous Card Reordering Race Condition:**
    - Student A drags Card 1 to Position 10.
    - At the exact same millisecond, Student B deletes Card 3.
    - How does the backend prevent duplicate positions or fragmented ordering sequences without locking the entire table?
36. **Supabase Realtime Channel Architecture:** Spec §65 suggests lightweight presence: *"Alex is editing"*.
    - Are you creating a Realtime Broadcast / Presence channel per deck (`deck:{id}:presence`)?
    - How are ephemeral typing states debounced so hundreds of Realtime websocket messages aren't sent per sentence typed?
    - Does Realtime broadcast full card payloads or just card IDs requiring client refetch?
37. **Collaborator Removal & The "Undo" Window:** Spec §26 specifies:
    - *"Removing Alex: Alex will immediately lose access to this deck. Undo is only available for a short period and must restore the previous membership state safely."*
    - If Alex is removed, his row in `deck_members` is deleted.
    - If the Owner clicks "Undo", does it re-insert Alex? What if, during those 5 seconds, Alex's client was in the middle of pushing an autosave? Was Alex's autosave rejected with an RLS error? How does Alex's client recover without losing his uncommitted work?

---

## 8. Saved Decks vs. Live Decks (The Forking Dilemma)

Sections 24, 29, 63 contrast Saving (snapshot copy) with Collaboration (shared live deck).

38. **The Snapshot Copying Mechanism:** When Student B saves Student A's public deck of 300 cards:
    - How is this snapshot created?
    - Is it executed client-side (Client fetches 300 cards from Deck A, then calls `insert()` to create Deck B and 300 new card rows)?
    - If executed client-side, what happens if the mobile network cuts out after copying card 142?
    - Should this be a server-side PostgreSQL function: `save_public_deck(target_deck_id UUID)` that deep-copies the deck and cards atomically in SQL?
39. **Image Asset References in Saved Decks:** If Student A uploads 10 custom diagrams into their deck, and Student B saves the deck:
    - Do the card rows in Student B's deck point to the exact same image URLs in Student A's Supabase Storage bucket?
    - What happens if Student A later deletes their deck or deletes their account, triggering storage cleanup? Are Student B's cards suddenly left with broken 404 image links?
    - Or does saving a deck duplicate all referenced image binaries into Student B's storage folder? (If so, what are the storage quota implications?)
40. **Upstream Updates & Stale Forks:** If Student A updates their public deck to fix a major factual error:
    - Is Student B ever notified that the original deck has changed?
    - Can Student B choose to "Pull upstream changes", or is a saved deck permanently severed from its origin with zero synchronization capability?
41. **Attribution Tampering:** Spec §29 states: *"The saved copy should retain attribution: Saved from @username"*.
    - Can the student who saved the deck delete or edit the attribution header?
    - Can they re-publish the saved deck as their own public deck (plagiarism / duplicate spam in community search)?
    - What RLS policy prevents a user from altering the `original_creator_id` or `source_deck_id` on their saved copy?

---

## 9. Community Discovery, Anti-Abuse & Social Mechanics

Sections 28, 30-32, 42, 53-54 detail discovery, profiles, ratings, and social sharing.

42. **Friend-Only RLS Performance Bottleneck:** Spec §28 states Friend-visible decks can be seen by *"Owner, collaborators, and accepted friends."*
    - To check if User X can view User Y's deck in Postgres RLS:
      ```sql
      EXISTS (
        SELECT 1 FROM friendships
        WHERE (user_id = deck.owner_id AND friend_id = auth.uid() AND status = 'accepted')
           OR (user_id = auth.uid() AND friend_id = deck.owner_id AND status = 'accepted')
      )
      ```
    - When User X searches or browses the community feed with thousands of decks, evaluating this join subquery on *every single row* will severely degrade database performance.
    - How will this query be indexed or structured to prevent sequential table scans?
43. **View Count Anti-Abuse:** Spec §32 & §59 warn: *"Views may require a different anti-abuse strategy and should not blindly increment on every render."*
    - How is a "view" recorded?
    - If not on render, is it on study session start?
    - How do you prevent a script or curious student from spamming the view counter to artificially boost their deck to the top of "Trending"?
    - Is there a rate-limited RPC function or a unique daily view table (`deck_views(deck_id, user_id, viewed_on DATE)`)?
44. **Rating Integrity & Self-Rating:**
    - Can a deck creator or editor give their own deck 5 stars?
    - What is the minimum rating threshold before an average rating is displayed (e.g., minimum 5 unique student ratings)?
    - Can a student change their rating later, or delete their review?
45. **Content Moderation & Academic Integrity:** In a university OS, students will inevitably share public decks containing exam dumps, copyright-infringing textbook scans, or offensive content.
    - Where is the `[Report Deck]` button?
    - Since superadmin is strictly excluded from MVP (§80), what happens when a deck is flagged? Can an automated threshold (e.g., 3 unique user flags) temporarily hide a deck from Public Discovery until reviewed?
46. **Social Privacy Defaults:** Spec §42 states: *"Friends can see explicitly permitted study activity... Default to limited sharing."*
    - What are the exact privacy toggles on Profile (§52)?
    - Does "Studying Now" broadcast in Realtime automatically whenever a student opens a deck, or must the student explicitly opt-in?
    - Can a student study in "Ghost Mode" (private study without logging activity to friends' feeds)?

---

## 10. Dashboard Integration & Academic OS Performance

Sections 43-47 require the Home screen to integrate Next Class, Schedule, Quick Access, Today's Study Time, Cards Due, Task Summary, Assessments, Mini Graphs, and Social Activity.

47. **The Home Screen Query Waterfall Trap:**
    - Home requires:
      1. Next class (`classes` table)
      2. Cards due count (`flashcard_review_states` aggregate)
      3. Total decks & overall mastery (`flashcard_decks` + `review_states`)
      4. Tasks due today (`tasks` table)
      5. Upcoming assessments (`exams` / `assessments` table)
      6. Today's study minutes (`study_sessions` sum)
      7. Weekly study minutes mini-graph (7-day aggregate)
      8. Recent social activity (`friendships` + `activity` logs)
      9. Unread notifications (`notifications` count)
    - If the client executes 9 independent Supabase REST queries on mount, the Home screen will experience severe layout shifts, loading spinners, and latency on cellular networks.
    - Will you build a single consolidated database RPC function: `get_student_home_cockpit(p_user_id UUID)` that returns all aggregates in one round-trip JSON payload?
48. **Floating Timer vs. Flashcard Study Concurrency:** Spec §2.1 & §43 emphasize: *"The timer remains an omnipresent floating control rather than a primary bottom-navigation destination."*
    - Can a student start the focus timer, and then navigate to the Flashcards tab to study?
    - If yes, does the study session automatically link to the timer?
    - When the timer rings (e.g., Pomodoro 25 min ends), does an alert modal interrupt the student in the middle of rating a card?
    - Does the timer log its duration to `study_sessions`, while card ratings log to `flashcard_review_events`? How are the two linked to avoid double-counting study minutes on the Home dashboard?
49. **Mini-Graph Tabular Stability:** Spec §46 requires mini-graphs of weekly study minutes and cards reviewed using tabular numerals (`tnum`).
    - What charting library will be used that supports identical rendering across Next.js (web) and React Native (Expo) without injecting massive bundle bloat?
    - Pure SVG bar charts? Or hand-crafted flexbox bars with strict CSS/StyleSheet dimensions?

---

## 11. Offline Capability & Network Resilience

University students study on trains, in basements, and on spotty campus Wi-Fi networks.

50. **Offline Study Session Survival:**
    - A student loads a deck of 50 cards in the campus library, then walks into a basement study room with zero cell signal.
    - Can they complete their 50-card study session offline?
    - Where are their card ratings (`Retry`, `Good`, `Easy`) stored while offline?
    - If stored in local memory and the student's phone runs low on memory or the OS kills the background app, are their reviews lost?
51. **Syncing Queues Upon Reconnection:**
    - When the device regains Wi-Fi, how does the queue flush `flashcard_review_events` and update `flashcard_review_states`?
    - If the device clock was desynchronized while offline, could review timestamps be written out of order?
52. **Optimistic UI Rollbacks on Card Creation:** Spec §67 warns: *"Optimistic UI only where rollback is safe."*
    - If a student creates a card on mobile, the UI optimistically adds it to the list.
    - If the backend rejects the write (e.g., network dropped or RLS failed), how is the rollback presented?
    - Does the card vanish with a toast? Does it stay in an "unsaved / draft" error state with a `[Retry]` button so the student's typed text isn't obliterated?

---

## 12. Monetization, Quotas & Tier Limits

In `lib/shared/src/types.ts` (lines 199-238), there is explicit tier logic:
- Free tier: `maxFlashcardDecks: 3`, `aiFlashcards: false`
- Pro tier: `maxFlashcardDecks: 'unlimited'`

53. **The 3-Deck Limit Conflict:**
    - The new MVP spec does NOT mention the 3-deck quota once.
    - Is the 3-deck limit active in this MVP?
    - If active, what happens when a free-tier user tries to create deck #4?
    - What happens when a free-tier user with 3 decks tries to **save** a public deck from a friend? Does saving count against the 3-deck limit?
    - If an existing user already has 5 decks, do their existing decks lock into read-only mode?
54. **Card Limits Per Deck:** Is there a maximum card limit per deck for free vs. pro users (e.g., 100 cards max on free), or can a free-tier user create 10,000 cards in a single deck?
55. **Collaborator Quotas:** Can a free-tier user invite unlimited collaborators to a deck, or is collaboration restricted to Pro users?

---

## 13. Anti-AI Slop Compliance & Tactile Design Doctrine

The project has strict design rules (`AGENTS.md` and `.agents/rules/anti-ai-slop.md`):
- Pure white `#FFFFFF` default / Pure black `#000000` OLED dark mode.
- 1px hairline borders (`border-zinc-200` / `border-zinc-800`).
- No glassmorphism (`backdrop-blur` rejected).
- No purple/blue gradients or neon glows.
- Zero Unicode emojis anywhere (Lucide icons only).
- Emil Kowalski physics: snappy spring button presses (`transform: scale(0.97)`), tabular numbers (`tnum`).
- Copywriting: University student tone; absolute ban on Tier 1 words (`delve`, `tapestry`, `unlock`, `supercharge`, `empower`, `elevate`, etc.).

56. **Card Flipping Physics:**
    - How is the card flip animation executed?
    - On Web: CSS 3D transforms (`transform-style: preserve-3d`, `rotateY(180deg)`)?
    - On Mobile: `react-native-reanimated` with spring physics?
    - If a card has different heights on the front and back (e.g., short question on front, 30-line code block on back), flipping a fixed-height card clips content; flipping an auto-height card causes jarring layout recalculation mid-rotation. How do you animate the flip smoothly across mismatched content heights?
57. **Button Press Feedback:** Are all study rating buttons (`Retry`, `Hard`, `Good`, `Easy`) and deck cards wrapped in tactile pressable components that scale to `0.97` with `cubic-bezier(0.16, 1, 0.3, 1)` and trigger haptic feedback (`expo-haptics` on iOS/Android)?
58. **OLED Black Contrast:** In dark mode, are card backgrounds `#000000` with `#09090B` elevated surfaces, or did any generic `#18181B` / `#27272A` grey creep in?
59. **Copy Audit:** Does any error message, empty state, or tooltip in the spec or codebase violate the slop ban? For instance, does any screen say "Unlock your potential", "Supercharge your study", or "Seamless learning"?
60. **Zero-Emoji Enforcement in Mockups:** Spec §1599 shows a unicode character `◉` in the ASCII diagram. Is the codebase 100% strictly enforced to use `<Layers />`, `<Clock />`, `<Check />`, `<BookOpen />` from `lucide-react` / `lucide-react-native`, with an automated lint rule preventing Unicode emoji injection?

---

## 14. Edge Cases, Failure Modes & Disaster Recovery

61. **Empty Deck Study Attempt:** If a user clicks `[Study Due]` or `[Study All]` on a deck with 0 cards:
    - What happens? Does the app open a blank screen, or disable the button with an explanatory tooltip?
62. **All Cards Already Mastered / None Due:** If a student clicks `[Study Due]` when 0 cards are due:
    - Does it route to a study completion screen ("You're caught up! 0 cards due today. [Study Ahead] [Return to Deck]"), or prevent entry?
63. **Concurrent Deletion While Studying:**
    - Student A is studying Deck X on mobile.
    - Simultaneously on Web, Student A's collaborator (or Student A themselves in another tab) deletes Deck X.
    - When Student A taps "Good" on card 5, the foreign key `deck_id` no longer exists in PostgreSQL.
    - How does the client handle the sudden 404/foreign-key violation without crashing the mobile app?
64. **Excessive Deck Title / Card Content Length:**
    - What is the max character length of `deck.title`? (255 chars?)
    - What is the max size of a single card's front/back? If a student pastes an entire 50-page textbook chapter into the back of a card, will it crash JSONB indexing or exhaust mobile memory?
65. **XSS & Code Injection via Rich Text:**
    - If a deck is public, and a malicious user inserts `<script>` tags, raw HTML iframes, or javascript URIs into `front_content`:
    - How does the web renderer sanitize the rich content before injecting it into the DOM?
    - Does the sanitization pipeline strip malicious attributes while preserving mathematical LaTeX and syntax-highlighted code safely?
66. **Database Index Verification:** Spec §58 lists indexes for `flashcard_decks` and `flashcard_review_states`.
    - Is there a compound index on `flashcard_review_states(user_id, due_at)` to allow instant retrieval of due cards without sorting the entire table?
    - Is there an index on `flashcards(deck_id, position)` to allow instant sequential ordering?
67. **Account Deletion (GDPR / Right to be Forgotten):** If a student deletes their account:
    - What happens to their public decks that 500 other students have saved?
    - Does deleting the user break the `original_creator_id` attribution on all 500 saved decks, or does it reassign attribution to a soft-deleted `@deleted_student` profile?

---

## Summary Checklist: The 10 "Must-Decide" Answers Before Implementation

Before proceeding to Step 1 & Step 2 of the implementation plan, lock down these 10 architectural decisions:

| # | Question | Default Recommendation |
|---|---|---|
| **1** | Does "Retry" reschedule for tomorrow or recycle into the active session queue? | **Recycle into active session** until mastered, then log final interval to DB. |
| **2** | Is `due_at` an exact timestamp or a date pinned to student timezone? | **Date pinned to user timezone** (`YYYY-MM-DD`) to avoid midday due-date creep. |
| **3** | How is "Mastery %" calculated? | **Percentage of deck cards with `interval_days >= 21`**. |
| **4** | What AST schema validates rich-text JSONB? | **TipTap / ProseMirror compatible JSON schema** validated via Zod. |
| **5** | How is card reordering stored? | **Fractional indexing (`FLOAT8` position)** to avoid $O(N)$ batch updates. |
| **6** | How are public decks saved? | **Server-side PostgreSQL RPC function** that duplicates deck & cards in one transaction. |
| **7** | How does Home fetch its dashboard data? | **A single consolidated Postgres RPC** (`get_student_home_cockpit`). |
| **8** | How are images preserved on saved decks? | **Retain storage URL reference**; only delete storage binaries when all referencing decks are destroyed. |
| **9** | How is mobile rich content rendered? | **Native components for text/code/images; lightweight SVG/native parser for math equations**. |
| **10**| What happens to Free Tier deck limits (3 decks)? | **Clarify whether MVP enforces 3-deck limit** or temporarily unlocks unlimited for beta. |

---

*End of Grill Document. Review each question, record authoritative decisions, and update `Saktus_Flashcards_MVP_Implementation_Spec.md` accordingly before deploying migrations.*
