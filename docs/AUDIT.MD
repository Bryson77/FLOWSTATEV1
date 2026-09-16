Perform a **full engineering audit of the Saktus codebase immediately. Do not start fixing things yet. Audit first, then return the findings as soon as the audit is complete.**

This is a production-oriented audit, not a general code review. I want you to trace the actual execution paths through the application and identify why the current Flashcards system is not behaving according to the implementation specs.

Use the existing Saktus implementation specs, reconciliation documents, database schema, and current codebase as the reference. Use Supabase MCP where available to compare the code against the actual live Supabase schema and RLS policies.

## PRIORITY 1: SECURITY / RLS AUDIT

Perform a thorough audit of **every RLS policy relevant to Saktus**, not just flashcards.

Inspect:

* SELECT
* INSERT
* UPDATE
* DELETE
* authenticated vs anonymous access
* owner/editor/viewer permissions
* public deck access
* private deck isolation
* course ownership/access
* flashcard access
* review-state access
* review-event access
* deck members
* deck saves/forks
* reports
* profiles/user data
* any other Academic OS tables touched by the current application

For every policy, determine:

1. Who can access the row?
2. Who can create it?
3. Who can modify it?
4. Who can delete it?
5. Is the policy actually enforcing the intended product permission?
6. Could a malicious authenticated user bypass the intended ownership boundary?
7. Is the application relying on frontend checks instead of database enforcement?
8. Are there `FOR ALL` policies that accidentally grant DELETE/UPDATE through a broad `USING` clause?
9. Are there policies that cause legitimate public/shared data to return zero rows?
10. Are there SECURITY DEFINER functions/RPCs that bypass RLS and, if so, do they perform their own authorization checks?

Explicitly test the previously discovered issues:

* Can a non-owner delete a public deck?
* Can a non-owner read cards belonging to a public deck?
* Can an editor modify resources they should not be able to?
* Can a viewer modify anything?
* Can one student access another student's private decks/cards/review state?

Report every vulnerability with:

* severity
* affected table
* affected policy/function
* attack path
* expected behavior
* actual behavior
* recommended fix

## PRIORITY 2: SERVER ACTIONS / API / DATA ACCESS

Audit every:

* Next.js Server Action
* Route Handler
* API endpoint
* Supabase RPC
* database function
* client-side Supabase query
* mutation
* data-fetching hook

Trace each important operation from:

UI
→ component
→ hook/action
→ API/server action
→ Supabase
→ RLS/RPC
→ returned data
→ UI state

Look specifically for:

* incorrect authorization assumptions
* server actions trusting client-supplied user IDs
* missing `auth.uid()` checks
* incorrect Supabase client usage
* service-role usage where it should not exist
* `SELECT *`
* missing error handling
* swallowed Supabase errors
* incorrect `.single()` / `.maybeSingle()` usage
* queries returning zero rows because of RLS
* stale cached data
* incorrect invalidation/revalidation
* mutations succeeding but UI not updating
* mutations failing silently
* server/client boundary mistakes
* incorrect redirects after authentication or mutations
* race conditions
* duplicate requests
* incorrect loading/error states

For every server action/API path, state whether it is:
**SAFE / BUGGY / SECURITY RISK / UNVERIFIED**

## PRIORITY 3: REDIRECT AND ROUTING AUDIT

Trace the complete routing/auth flow.

Audit:

* login
* signup
* logout
* session restoration
* protected routes
* middleware
* dashboard redirects
* flashcard routes
* deck routes
* course routes
* editor routes
* study routes
* mobile navigation
* deep links
* back navigation
* redirects after creating/editing/deleting a deck
* redirects after authentication expiry

Find:

* redirect loops
* incorrect destination routes
* routes that render but then redirect unexpectedly
* routes requiring data that has not loaded yet
* authentication race conditions
* server/client redirect mismatches
* stale router state
* `push` vs `replace` issues
* broken dynamic routes
* missing route parameters
* routes that work on desktop but fail on mobile

Give concrete reproduction paths such as:

`/login → /dashboard → /cards → /decks/[id]`

and identify exactly where the flow breaks.

## PRIORITY 4: FLASHCARD SYSTEM

This is currently not working as intended.

Audit the entire flashcard lifecycle:

Create Deck
→ Assign Course
→ Save Deck
→ Fetch Decks
→ Group Decks by Course
→ Open Course Group
→ Open Deck
→ Create Card
→ Edit Card
→ Reorder Card
→ Delete Card
→ Study
→ Review
→ SRS state
→ Review history
→ Progress/mastery
→ Dashboard statistics

### Specifically investigate the course grouping bug.

The intended hierarchy is:

Student
↓
Course / Subject
↓
Deck
↓
Card

I need you to determine:

* Is `course_id` actually being saved when a deck is created?
* Is the course relationship being fetched?
* Is the query joining the correct course table?
* Is the frontend expecting a different field name?
* Are decks being fetched independently and never grouped?
* Is grouping happening incorrectly in JavaScript?
* Are null/general decks handled correctly?
* Does the database query return enough course information?
* Does RLS hide the course/deck relationship?
* Does the UI actually have a grouped-by-course rendering mode?
* Does navigation from Course → Deck work?
* Are empty courses handled?
* Are decks without courses handled?
* Are courses with zero decks handled?
* Does the mobile UI implement the same hierarchy?
* Is there a mismatch between the current implementation and the Flashcards MVP spec?

Do not simply say "course grouping is missing."

Trace the exact cause through database → query → server action → state → component → rendering.

## PRIORITY 5: FLASHCARD DATA MODEL / SRS

Compare the current implementation against the reconciliation architecture.

Verify whether the code currently uses:

* `flashcard_review_states`
* `flashcard_review_events`
* legacy SRS fields
* compatibility triggers
* `front_content`
* `back_content`
* `position`
* `version`
* `visibility`
* `deck_members`

Determine which parts are actually implemented versus merely defined in documentation.

Audit:

* Retry behavior
* Again/Retry naming
* Hard
* Good
* Easy
* interval calculation
* ease factor
* overdue handling
* due-date calculation
* timezone handling
* mastery calculation
* Study Due
* Study All / cram mode
* review history
* offline behavior
* duplicate reviews
* concurrent reviews
* optimistic concurrency

If the UI says something is implemented but the underlying data path does not support it, flag it.

## PRIORITY 6: LIGHT / DARK MODE

The current light/dark experience is poor on both mobile and web.

Audit the entire theme system.

Inspect:

* theme provider
* Tailwind/theme configuration
* CSS variables
* design tokens
* hardcoded colors
* dark mode classes
* light mode classes
* native mobile theme handling
* React Native styles
* shared components
* web components
* navigation
* modals
* inputs
* cards
* buttons
* flashcard editor
* flashcard study player
* home dashboard
* empty states
* loading states
* error states

Find cases where:

* text has insufficient contrast
* backgrounds remain light in dark mode
* borders disappear
* cards use hardcoded colors
* inputs don't change correctly
* icons become invisible
* native mobile components ignore the theme
* web and mobile use inconsistent tokens
* system theme overrides the application's selected theme incorrectly
* theme state doesn't persist
* hydration causes theme flashing
* server-rendered theme differs from client theme

Do not merely report "dark mode needs polish." Identify the exact components/files and why they fail.

## PRIORITY 7: RESPONSIVE / MOBILE AUDIT

Because the app is used heavily on mobile, inspect:

* keyboard-aware layouts
* viewport resizing
* safe areas
* dynamic content height
* card sizing
* text wrapping
* long flashcard content
* editor behavior
* modals
* bottom navigation
* buttons
* tables
* math
* code blocks
* landscape/portrait behavior
* small-screen breakpoints
* touch targets
* overflow
* horizontal scrolling

Look specifically for layouts that work at one viewport size but break when:

* keyboard opens
* browser width changes
* content becomes longer
* device rotates
* system font size increases

## PRIORITY 8: SPEC / IMPLEMENTATION DRIFT

Compare the actual codebase against:

* `Saktus_Flashcards_MVP_Implementation_Spec.md`
* `SAKTUS_IMPLEMENTATION_PLAN.md`
* `FLASHCARD_SCHEMA_AND_MIGRATION_RECONCILIATION.md`
* current Supabase schema

Identify:

* implemented correctly
* partially implemented
* incorrectly implemented
* completely missing
* implemented differently from the specification

Do not assume the documentation is correct if the live database/code contradicts it. Show the contradiction.

## AUDIT METHOD

Do not skim filenames and make assumptions.

For each major bug, trace the complete execution path.

Use this format internally:

DATABASE
↓
RLS
↓
RPC / Server Action
↓
DATA FETCH
↓
STATE
↓
COMPONENT
↓
UI

If the failure occurs at a different layer, identify that layer.

Search the codebase systematically before drawing conclusions.

## OUTPUT

Return a concise but thorough **AUDIT FINDINGS REPORT**, not a proposed implementation plan.

Start with:

### EXECUTIVE SUMMARY

* overall system health
* number of critical issues
* number of high issues
* number of medium issues
* number of low issues
* security status
* flashcard status
* routing status
* theme status

Then:

### CRITICAL FINDINGS

Only issues that can cause:

* security breaches
* data loss
* broken core functionality
* severe authorization problems

For each:

**[CRITICAL] Title**

* Evidence:
* Exact file/function/table:
* Root cause:
* Impact:
* Reproduction path:
* Fix required:

Then repeat for:

### HIGH PRIORITY

### MEDIUM PRIORITY

### LOW PRIORITY

Then:

### FLASHCARD FAILURE TRACE

Show exactly why the current flashcard system is failing, including the course-grouping issue.

Then:

### RLS / AUTHORIZATION MATRIX

Show who can read/create/update/delete each relevant resource.

Then:

### ROUTING / REDIRECT FINDINGS

Show broken flows and exact routes.

Then:

### THEME / RESPONSIVE FINDINGS

Separate Web and Mobile.

Then:

### SPEC DRIFT

Show what the code claims to implement versus what actually exists.

Finally:

### RECOMMENDED FIX ORDER

Give the minimum safe order of operations, prioritizing security and core functionality.

IMPORTANT:

Do NOT fix anything during this audit.

Do NOT make assumptions based only on filenames.

Do NOT mark an issue as fixed because a component appears to support it. Trace the actual runtime/data path.

Do NOT hide uncertainty. If you cannot verify something, explicitly mark it UNVERIFIED and state what evidence is missing.

Return the findings as soon as the audit is complete. The purpose of this pass is to give us a precise map of what is broken before implementation changes begin.




# Saktus Academic OS: Full Feature Recovery, Bug Fix & Production Completion

You have already completed the engineering audit of `Bryson77/FLOWSTATEV1`.

**Now STOP AUDITING. Implement the fixes and recover all missing functionality.**

This is not a request to patch only the issues listed in the previous audit.

The previous audit identified bugs, security vulnerabilities, broken flows, and architectural problems, but it also revealed something more important:

> **The current codebase is incomplete. Multiple product features required by the Saktus specifications are missing, partially implemented, mocked, disconnected, or replaced by simplified versions.**

Your job is to bring the actual application into alignment with the product specifications and existing architecture.

---

# 0. SOURCE OF TRUTH

Before modifying anything, inspect and reconcile ALL of the following:

### Repository

`Bryson77/FLOWSTATEV1`

Inspect:

```text
apps/web
apps/mobile
apps/api
lib/shared
lib/study-engine
supabase
```

### Specification documents

Read the complete contents of:

```text
Saktus_Flashcards_MVP_Implementation_Spec.md
SAKTUS_IMPLEMENTATION_PLAN.md
docs/FLASHCARD_SCHEMA_AND_MIGRATION_RECONCILIATION.md
docs/AUDIT.MD
```

Do not rely on filenames, previous audit conclusions, or assumptions.

### Live Supabase

Use the Supabase MCP / available Supabase tooling to inspect the **actual live project** before making schema changes.

Verify:

* tables
* columns
* constraints
* indexes
* foreign keys
* functions/RPCs
* triggers
* RLS
* policies
* enums
* views
* storage
* existing data
* migrations
* relationships

The live database is authoritative for the current production schema.

---

# 1. THIS IS A FEATURE-COMPLETION TASK, NOT JUST A BUG-FIX TASK

Create a complete feature inventory by comparing:

```text
PRODUCT SPECIFICATION
        ↓
IMPLEMENTATION PLAN
        ↓
DATABASE
        ↓
SHARED DOMAIN LOGIC
        ↓
API / SERVER ACTIONS
        ↓
WEB
        ↓
MOBILE
```

For every specified feature classify it as:

```text
IMPLEMENTED
PARTIALLY IMPLEMENTED
BROKEN
MOCKED / HARDCODED
DISCONNECTED
MISSING
UNVERIFIED
```

Then IMPLEMENT everything that is:

* missing
* incomplete
* mocked
* disconnected
* broken

unless the specification explicitly marks it as out of scope.

Do not quietly remove requirements because they are inconvenient to implement.

---

# 2. COMPLETE FEATURE INVENTORY

Audit and implement the ENTIRE Academic OS, not just flashcards.

At minimum verify the following domains.

---

## A. AUTHENTICATION & ACCOUNT

Verify:

* sign up
* login
* logout
* session restoration
* session expiry
* password reset
* password update
* email verification
* profile creation
* profile editing
* onboarding
* onboarding persistence
* preferences
* daily study goal
* timezone
* theme preference
* account deletion
* proper authenticated/unauthenticated routing
* return URL preservation

No authentication flow may expose raw Supabase errors.

---

# 3. ACADEMIC STRUCTURE

The required hierarchy is:

```text
Student
   │
   ├── Courses / Subjects
   │       │
   │       ├── Decks
   │       │      └── Cards
   │       │
   │       ├── Schedule
   │       ├── Tasks
   │       └── Assessments
   │
   └── General / Uncategorized
```

This hierarchy must exist consistently across web and mobile.

Implement:

### Courses

* create
* edit
* delete
* list
* course code
* course name
* course metadata required by specification
* course navigation
* course filtering
* course empty states
* course → decks
* course → schedule
* course → tasks where applicable

Remove hardcoded dummy courses.

### Course grouping

Flashcards must NOT remain a flat deck grid.

Required structure:

```text
Computer Science
    Data Structures
    Operating Systems
    Networks

Mathematics
    Calculus
    Statistics

General
    Random Deck
```

Support:

* empty courses
* uncategorized decks
* course statistics
* deck counts
* card counts
* due counts
* mastery/progress where supported by the existing model

Build the grouping transformation in shared code where practical so web and mobile do not implement divergent business logic.

---

# 4. FLASHCARD SYSTEM

Treat flashcards as a core Saktus subsystem.

Implement and verify the complete lifecycle:

```text
Create Course
    ↓
Create Deck
    ↓
Assign Course
    ↓
Create Cards
    ↓
Edit Cards
    ↓
Reorder Cards
    ↓
Rich Content
    ↓
Import
    ↓
Preview
    ↓
Commit
    ↓
Study
    ↓
Review
    ↓
SRS
    ↓
Progress
    ↓
Analytics
```

---

## Deck functionality

Verify:

* create
* edit
* delete
* duplicate
* course assignment
* visibility
* public decks
* friends visibility
* private decks
* deck description
* tags
* deck statistics
* collaborators
* saved decks
* deck reporting
* deck sharing
* deck ownership

No unauthorized public mutation.

`flashcard_decks.user_id` must be treated as canonical ownership.

Normal editor operations must NOT allow an editor to transfer ownership.

---

# 5. CARD FUNCTIONALITY

Implement:

* create
* edit
* delete
* duplicate
* reorder
* bulk creation
* rapid editor
* rich text
* formatting
* equations
* code
* images where specified
* MCQ cards
* True/False cards
* Match content where specified
* validation
* empty state
* loading state
* error state

Every card created through every interface must produce valid canonical content.

Do not allow:

```text
front_text
back_text
```

to silently coexist with empty rich-content ASTs where the application expects ProseMirror content.

Use the canonical content model defined by the specification/reconciliation document.

---

# 6. IMPORT SYSTEM

Verify and implement the required:

```text
Parse
 ↓
Validate
 ↓
Preview
 ↓
Confirm
 ↓
Commit
```

Import must:

* validate before writing
* show preview
* report invalid rows
* avoid partial silent imports
* support rollback/failure safely
* preserve rich content where supported
* create valid cards
* associate imported cards with the selected deck/course
* report useful user-facing errors

No raw database errors.

---

# 7. SRS / STUDY ENGINE

The SRS engine is a core domain service.

Web and mobile must NOT implement separate SRS mathematics.

Use:

```text
@saktus/study-engine
```

as the canonical implementation.

Implement/verify:

```text
Retry
Hard
Good
Easy
```

including:

* interval
* ease factor
* repetitions
* due date
* overdue handling
* timezone correctness
* semester/maximum interval rules from specification
* mastery
* progress
* review history
* review events
* review state isolation per user
* new/unstudied cards
* due cards
* all cards
* session completion
* retry/requeue behavior
* duplicate/concurrent review protection
* offline idempotency where specified

---

# 8. REVIEW PERSISTENCE MUST BE ATOMIC

Do NOT implement review persistence as independent UI database calls.

Prefer one authoritative server/database operation:

```text
submit_flashcard_review()
```

The operation should:

1. authenticate the user
2. validate the card/deck
3. validate access
4. retrieve current review state
5. calculate the next state using the shared study engine/domain logic
6. update review state
7. record review event
8. return the resulting state

The state transition and event recording should be transactionally consistent.

Do not swallow failed writes.

If persistence fails, the user must receive an actionable error and the UI must not pretend the review succeeded.

---

# 9. NEW CARDS MUST COUNT AS DUE

A card without a review-state row is still an unstudied card.

Therefore:

```text
review_state exists AND due_date <= today
```

OR:

```text
review_state does not exist
```

must be considered due according to the product's SRS rules.

Use one canonical definition of:

```text
new
due
overdue
scheduled
mastered
```

and reuse it across:

* Home
* Flashcards
* Study
* Analytics
* mobile
* web
* cockpit RPC

Do not allow different modules to calculate due counts differently.

---

# 10. WEB FLASHCARD ROUTING

The current 2,500+ line flashcard page must be structurally decomposed.

Required routes:

```text
/flashcards
/flashcards/[id]
/flashcards/[id]/study
/flashcards/[id]/edit
/flashcards/[id]/match
```

Where appropriate.

Requirements:

* refresh-safe
* bookmarkable
* shareable
* browser history works
* back button works
* deep links work
* authentication redirects preserve destination
* route params are validated
* invalid IDs produce proper not-found states
* study state is not accidentally destroyed by navigation

Do not rewrite functioning components unnecessarily. Extract them incrementally.

---

# 11. HOME / ACADEMIC COCKPIT

The Home screen is NOT just a dashboard counter page.

It must expose the underlying Academic OS modules described by the specification.

Verify and implement all required:

* SRS due
* study statistics
* weekly graph
* schedule
* tasks
* assessments
* notifications
* social activity
* quick actions
* relevant flashcard progress
* current academic context

The Home page must consume underlying module data.

Do NOT duplicate business logic specifically for Home.

---

# 12. SCHEDULE / TIMETABLE

Verify the actual implementation against the specification.

Implement missing functionality including, where specified:

* course schedule
* timetable entries
* create
* edit
* delete
* recurring classes where specified
* course association
* date/time handling
* timezone correctness
* mobile usability
* web usability
* empty states
* conflict handling where specified

Ensure course data comes from the actual `courses` table.

---

# 13. TASKS

Audit the Tasks module against the specification.

Verify:

* create
* edit
* delete
* completion
* due dates
* priority
* course association
* academic context
* Home integration
* Schedule integration where specified
* notifications/reminders where specified

Do not leave Tasks as placeholder UI.

---

# 14. ASSESSMENTS

Audit and implement the assessment functionality defined in the specification.

Verify:

* assessment creation
* course association
* date
* type
* preparation/relevance to tasks or study
* Home integration
* Schedule integration
* notification/reminder integration where specified

Do not invent unnecessary features beyond the specification.

---

# 15. SOCIAL SYSTEM

Reconcile the social architecture BEFORE changing policies.

Determine from the specification and current implementation whether Saktus uses:

```text
follows
```

or:

```text
friendships
```

or:

```text
follows + mutual follow = friend
```

There must be ONE authoritative social relationship model.

Then make all of the following use that same model:

* profiles
* follows/friends
* social page
* deck visibility
* public decks
* friends-only decks
* deck sharing
* collaboration
* notifications
* social activity

Implement:

* follow/unfollow if specified
* friend request if specified
* accept/reject
* remove friend
* user profiles
* social discovery
* deck sharing
* saved decks
* collaborators
* collaborator roles
* notifications
* reporting

Do not solve the current `follows` vs `friendships` mismatch by blindly changing RLS.

First establish the intended domain model.

---

# 16. COLLABORATION

Verify the full lifecycle:

```text
Owner
 ↓
Invite collaborator
 ↓
Editor / Viewer
 ↓
Accept
 ↓
Collaborate
 ↓
Remove
 ↓
Undo / recovery where specified
```

Enforce:

* owner
* editor
* viewer

permissions at the database level.

Editors cannot:

* steal ownership
* bypass visibility
* modify unauthorized data
* access unrelated private decks

Test concurrent edits and stale revisions where required by the specification.

---

# 17. SAVED DECKS / FORKS

A saved public deck is NOT a live shared copy unless explicitly specified.

Verify:

* save
* unsave
* saved library
* source attribution
* source ownership
* fork/copy behavior
* independent editing
* source deck deletion behavior
* permission boundaries

Fix the mobile `save_public_deck` RPC contract mismatch.

Verify web and mobile use the same RPC contract.

---

# 18. NOTIFICATIONS

Audit the notification system.

Verify all specified notification sources, including where applicable:

* friend requests
* accepted requests
* deck sharing
* collaboration
* task reminders
* assessment reminders
* academic events
* social activity

Ensure:

* unread count
* read state
* navigation target
* mobile presentation
* web presentation

No notification should point to a nonexistent route.

---

# 19. ANALYTICS / PROGRESS

Verify:

* review history
* cards studied
* streaks
* study time
* weekly activity
* mastery
* due counts
* course progress
* deck progress
* review performance

Analytics must derive from canonical underlying records.

Do not fabricate statistics from client-side state.

Fix UTC/local date inconsistencies.

All user-facing calendar logic must use the canonical timezone utility.

---

# 20. AUTHORIZATION / RLS

Now implement the security fixes from the audit, but do NOT blindly copy the previous proposed SQL.

For every table, establish:

```text
SELECT
INSERT
UPDATE
DELETE
```

permissions independently.

Avoid broad:

```sql
FOR ALL
```

policies when granular policies are safer.

Explicitly test:

### Decks

* owner
* editor
* viewer
* public user
* friends user
* unrelated user

### Cards

Same matrix.

### Review state

User A cannot access User B.

### Review events

User A cannot access User B.

### Saved decks

User A cannot mutate User B.

### Friend/follow records

Unauthorized relationship mutation must fail.

### Analytics

Users cannot delete or alter analytics records belonging to other users.

### Reports

Reporter can submit, but report handling must be available to the intended moderation/admin mechanism.

### Courses

Do not expose private course metadata merely because a public deck references it unless that exposure is explicitly intended.

---

# 21. SERVER/API ARCHITECTURE

Audit every:

* Server Action
* Route Handler
* API route
* RPC
* Supabase query
* mutation
* hook
* client-side database operation

Trace:

```text
UI
 ↓
component
 ↓
hook/action
 ↓
API/RPC
 ↓
database
 ↓
RLS
 ↓
returned data
 ↓
UI state
```

Remove unnecessary direct client-side mutations where a server/RPC transaction is required.

No:

```text
SELECT *
```

No silent failures.

No swallowed errors.

No raw Postgres/RLS/UUID errors exposed to users.

No service-role key exposed to clients.

No business logic duplicated separately in web and mobile.

---

# 22. WEB + MOBILE PARITY

Every major feature must be checked on BOTH platforms.

Create a matrix:

| Feature       | Web | Mobile | Shared Logic |
| ------------- | --- | ------ | ------------ |
| Auth          |     |        |              |
| Courses       |     |        |              |
| Decks         |     |        |              |
| Cards         |     |        |              |
| Import        |     |        |              |
| Study         |     |        |              |
| SRS           |     |        |              |
| Social        |     |        |              |
| Saved Decks   |     |        |              |
| Collaboration |     |        |              |
| Tasks         |     |        |              |
| Schedule      |     |        |              |
| Assessments   |     |        |              |
| Notifications |     |        |              |
| Analytics     |     |        |              |
| Profile       |     |        |              |
| Settings      |     |        |              |

Do not assume feature parity merely because both platforms contain a similarly named screen.

---

# 23. THEME SYSTEM

Implement a proper shared semantic theme architecture.

Required semantic tokens:

```text
background
surface
surfaceElevated
foreground
foregroundMuted
border
accent
danger
warning
success
```

Web:

```text
CSS variables / theme provider
```

Mobile:

```text
central theme object/hook
```

Do not scatter hardcoded theme colors across screens.

Support:

* light
* dark
* system where specified
* persistence
* hydration without FOUC
* mobile light mode
* mobile dark mode
* inputs
* modals
* cards
* navigation
* editor
* study player
* empty states
* loading states
* error states

Respect the Saktus design specification.

Remove the illegal purple/neon styling.

---

# 24. RESPONSIVE / MOBILE QUALITY

Test:

* phone
* tablet
* desktop
* small laptop
* keyboard open
* long card content
* equations
* code
* images
* modal overflow
* scrolling
* safe areas
* touch targets
* orientation changes
* split-screen
* dynamic font sizing

Use reactive dimensions where required.

Do not use fixed heights for content-heavy components.

---

# 25. ROUTING & ERROR STATES

Test every important route:

```text
authenticated
unauthenticated
expired session
invalid ID
deleted entity
unauthorized entity
missing entity
slow network
failed request
```

Every failure must produce an intentional UI state.

Never show:

```text
PostgREST error
RLS violation
UUID error
undefined
null
```

to the user.

---

# 26. DATABASE / MIGRATION SAFETY

Before every migration:

1. inspect current live schema
2. determine whether migration is additive/destructive
3. preserve existing user data
4. ensure migration is idempotent
5. account for existing rows
6. update indexes
7. update RLS
8. update triggers/functions
9. verify foreign keys
10. test rollback/recovery strategy where applicable

Do not create a second database.

Do not create duplicate tables to avoid reconciling the current schema.

Do not silently discard existing data.

---

# 27. TESTING REQUIREMENT

After implementation, run actual tests.

At minimum:

### Security

* private deck isolation
* public deck access
* friends access
* editor access
* viewer access
* ownership immutability
* review-state isolation
* analytics mutation protection

### Flashcards

* create
* edit
* delete
* reorder
* duplicate
* rich content
* import
* save
* study

### SRS

Test:

```text
Retry
Hard
Good
Easy
```

Verify:

* state
* interval
* ease
* repetitions
* due date
* event
* history

### Academic hierarchy

Verify:

```text
Student
 → Course
 → Deck
 → Card
```

including:

* empty courses
* General
* multiple decks
* course filtering
* navigation

### Social

Test:

* follow/friend relationship
* visibility
* sharing
* collaboration
* notifications

### Routing

Test:

* direct URL
* refresh
* back
* forward
* auth redirect
* deleted entities

### Theme

Test:

* light
* dark
* reload
* mobile
* web

---

# 28. IMPLEMENTATION RULES

## DO

* inspect first
* use existing architecture where sound
* reuse shared logic
* use Supabase MCP
* write proper migrations
* preserve existing data
* use transactions/RPCs for multi-step business operations
* add tests
* fix root causes
* maintain TypeScript strictness
* keep web/mobile behavior consistent

## DO NOT

* create a second database
* create duplicate business logic
* rewrite working features unnecessarily
* remove specified features
* fake missing functionality
* leave mock data
* leave TODO placeholders
* use `SELECT *`
* bypass RLS with service role from the client
* expose service credentials
* swallow failed writes
* silently downgrade rich content
* blindly copy the previous audit's proposed SQL
* make broad RLS policies without testing their exact semantics
* introduce unnecessary dependencies
* replace real functionality with static mock UI

---

# 29. PRIORITY ORDER

Implement in this order:

## P0: Security + Data Integrity

```text
RLS vulnerabilities
Review persistence
Ownership protection
Friend/social authorization
Analytics mutation
```

## P1: Core Academic OS

```text
Courses
Course → Deck → Card hierarchy
Flashcards
SRS
Study persistence
Home due state
```

## P1: Missing Core Features

```text
Schedule
Tasks
Assessments
Notifications
Social
Saved decks
Collaboration
Profiles
Import
Analytics
```

Prioritize according to the actual specification if the ordering differs.

## P2: Architecture

```text
Flashcard route decomposition
Shared domain contracts
Server/RPC boundaries
Web/mobile parity
```

## P2: UX

```text
Theme
Responsive behavior
Settings
Navigation
Empty states
Loading states
Error states
```

## P3: Polish

```text
Minor visual issues
Navigation inconsistencies
Responsive edge cases
Performance cleanup
Audio lifecycle cleanup
```

---

# 30. DEFINITION OF DONE

The task is NOT complete because the build passes.

It is complete when:

```text
Specification
      ↓
Feature inventory
      ↓
Database
      ↓
Shared domain logic
      ↓
Server/API
      ↓
Web
      ↓
Mobile
```

are consistent.

The final application must:

* contain all specified MVP features
* contain no known critical security vulnerabilities
* persist study reviews correctly
* enforce ownership and access correctly
* correctly represent Course → Deck → Card hierarchy
* have functional SRS
* have functional social/sharing/collaboration
* have functional academic modules
* have functional Home/Cockpit aggregation
* have functional routing
* have functional light/dark themes
* work on web and mobile
* provide intentional loading/error/empty states
* preserve existing user data
* have no dummy production data
* have no obvious dead-end buttons
* have no known broken core flows

---

# 31. FINAL REPORT

After implementation, produce a concise engineering completion report.

Include:

### 1. Features recovered

```text
Feature
Status before
What was implemented
Web
Mobile
```

### 2. Security fixes

List every RLS/auth issue fixed and how it was tested.

### 3. Database changes

List migrations, functions, policies, indexes and triggers changed.

### 4. Architecture changes

List shared logic, API/RPC, routing and component changes.

### 5. Tests

Provide actual test results.

### 6. Remaining gaps

Anything genuinely impossible or intentionally deferred must be explicitly listed.

Do NOT claim completion for anything marked:

```text
TODO
PARTIAL
UNVERIFIED
MOCK
```

The final state must be based on actual implementation and verification, not assumptions.

**Start by creating the complete specification-vs-codebase feature matrix. Then implement the missing and broken functionality systematically.**
