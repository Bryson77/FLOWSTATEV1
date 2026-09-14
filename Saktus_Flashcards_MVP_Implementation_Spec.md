# Saktus Flashcards MVP

## Product, UI/UX, Data, SRS, Social, Import and Implementation Specification

**Document status:** MVP implementation specification\
**Product:** Saktus Academic OS\
**Primary clients:** Web + iOS/Android\
**Primary backend:** Supabase PostgreSQL + Supabase Auth + Supabase
Realtime + Supabase Storage\
**Shared logic:** `lib/study-engine` and `lib/shared`\
**Design standard:** Saktus Anti-AI-Slop system\
**Audience:** University and tertiary students\
**Implementation target:** Coding agent / Gemini\
**Date:** September 14, 2026

------------------------------------------------------------------------

# 1. Purpose

Saktus is not a flashcard app with extra features.

It is a university academic operating system where flashcards are one of
the primary study systems alongside:

-   Home academic dashboard
-   Schedule and timetable
-   Tasks
-   Exams and assignments
-   Flashcards and spaced repetition
-   Focus timer
-   Friends and social activity
-   Notifications
-   Academic analytics

The flashcard system should take the strongest parts of
StudySmarter/Vaia's flashcard workflow and place them inside this larger
academic system.

The product must feel like one application, not six mini-apps glued
together.

------------------------------------------------------------------------

# 2. Critical Implementation Principles

## 2.1 Current navigation is authoritative

The mobile bottom navigation is:

1.  Home
2.  Schedule
3.  Cards
4.  Social / Friends
5.  Profile

Do not revert to the older four-tab structure.

The timer remains an omnipresent floating control rather than a primary
bottom-navigation destination.

------------------------------------------------------------------------

## 2.2 Web and mobile feature parity

Web and mobile use the same:

-   database model
-   permissions
-   SRS engine
-   validation rules
-   study modes
-   visibility rules
-   collaboration rules
-   import behavior
-   notification behavior

Web may provide interaction enhancements where a larger screen is
objectively better.

Examples:

-   multi-column card editor
-   keyboard shortcuts
-   drag-and-drop ordering
-   side-by-side preview
-   bulk paste
-   larger deck analytics

Mobile must still be able to perform the underlying operation.

------------------------------------------------------------------------

## 2.3 Supabase is the source of truth

Do not create a second local database.

Use Supabase for:

-   Auth
-   PostgreSQL
-   Row Level Security
-   Realtime
-   Storage
-   database functions where appropriate
-   migrations
-   server-side validation where required

The Supabase MCP should be used during implementation for schema
inspection, migrations, validation and database debugging.

Never make the frontend assume a database column exists without checking
the actual Supabase schema.

------------------------------------------------------------------------

## 2.4 User-safe errors are mandatory

Never expose raw Postgres, Supabase, RPC, RLS or network errors to
students.

Bad:

> duplicate key value violates unique constraint...

Good:

> That username is already taken.

Bad:

> new row violates row-level security policy...

Good:

> You do not have permission to edit this deck.

Every mutation needs:

1.  validation
2.  database operation
3.  error classification
4.  user-safe message
5.  retry path where appropriate

Technical errors must still be logged for developers without being shown
to users.

------------------------------------------------------------------------

# 3. Product Information Architecture

``` mermaid
flowchart TD
    HOME[Home]
    SCHEDULE[Schedule]
    CARDS[Cards]
    SOCIAL[Social / Friends]
    PROFILE[Profile]

    HOME --> QUICK[Quick Access]
    QUICK --> SCHEDULE
    QUICK --> CARDS
    QUICK --> TASKS[Tasks]
    QUICK --> EXAMS[Exams / Assignments]
    QUICK --> TIMER[Focus Timer]

    CARDS --> LIBRARY[Flashcard Library]
    LIBRARY --> MY[My Decks]
    LIBRARY --> SAVED[Saved]
    LIBRARY --> SHARED[Shared / Collaborative]
    LIBRARY --> DISCOVER[Discover]

    MY --> SUBJECT[Subject / Course]
    SUBJECT --> DECK[Deck]
    DECK --> CARDS2[Cards]
    CARDS2 --> STUDY[Study Session]
    CARDS2 --> EDIT[Deck Editor]

    SOCIAL --> FRIENDS[Friends]
    SOCIAL --> SEARCH[Student Search]
    SOCIAL --> ACTIVITY[Activity]
    SOCIAL --> ROOMS[Study Rooms]

    PROFILE --> SETTINGS[Settings]
```

------------------------------------------------------------------------

# 4. Academic Hierarchy

The canonical flashcard hierarchy is:

``` text
Student
  |
  +-- Subject / Course
        |
        +-- Deck
              |
              +-- Card
              +-- Card
              +-- Card
```

A deck is created around a subtopic.

Examples:

``` text
Computer Science
    └── Object-Oriented Programming
          └── Classes and Objects
                ├── What is a class?
                ├── What is an object?
                └── What is encapsulation?
```

or:

``` text
Computer Science
    └── Data Structures
          └── Binary Trees
```

Decks can additionally contain tags such as:

-   `oop`
-   `java`
-   `chapter-4`
-   `exam-1`

Do not create excessive hierarchy levels for MVP.

------------------------------------------------------------------------

# 5. Flashcard Library

## Mobile location

**Cards tab**

Top of page:

``` text
Cards

[ Search decks... ]          [+]

My Decks
Saved
Shared

[All Subjects ▼] [Due ▼]
```

Primary actions:

-   Search
-   Create deck
-   Import deck
-   Filter
-   Open deck
-   Study due cards

------------------------------------------------------------------------

## Web location

**Sidebar → Flashcards**

Desktop layout:

``` text
FLASHCARDS

[ Search decks, cards, topics... ]

Library
  My Decks
  Saved
  Shared With Me
  Discover

[+ Create Deck] [Import]
```

------------------------------------------------------------------------

# 6. Deck List UI

Each deck card should display:

-   deck title
-   subject/course
-   number of cards
-   cards due
-   mastery percentage
-   last studied
-   visibility indicator
-   creator for non-owned decks
-   saved indicator when applicable

Example:

``` text
OBJECT-ORIENTED PROGRAMMING
Computer Science

84 cards
32 due
68% mastered

Last studied: Yesterday

[Study] [•••]
```

Do not overload deck cards with ten different statistics.

The important hierarchy is:

1.  title
2.  subject
3.  study state
4.  primary action

------------------------------------------------------------------------

# 7. Deck Creation

## Entry points

Users can create a deck from:

-   Cards tab → `+`
-   Flashcards page → `Create Deck`
-   Subject page → `Create Deck`
-   Home quick access → `Create Deck`

------------------------------------------------------------------------

## Create Deck modal/screen

Fields:

### Required

-   Deck title
-   Subject/course

### Optional

-   Description
-   Tags
-   Visibility

Visibility options:

``` text
Private
Friends
Public
```

### Buttons

``` text
Cancel
Create Deck
```

After creation, immediately open the deck editor.

Do not redirect the user to a generic empty deck page and make them hunt
for the editor.

------------------------------------------------------------------------

# 8. Deck Page

The deck page is the command center for one deck.

Header:

``` text
< Back

OBJECT-ORIENTED PROGRAMMING
Computer Science

84 cards · 68% mastered

[Study Due] [Study All] [Edit]
```

Secondary actions:

``` text
[Share] [•••]
```

Overflow menu:

-   Edit deck details
-   Duplicate deck
-   Export
-   Reset progress
-   Manage collaborators
-   Delete deck

Delete requires confirmation.

------------------------------------------------------------------------

## Deck tabs

Use:

``` text
Cards
Progress
About
```

### Cards

Shows card list.

### Progress

Shows:

-   mastery
-   due today
-   learning
-   mastered
-   review accuracy
-   review history
-   current streak related to this deck

### About

Shows:

-   description
-   subject
-   tags
-   creator
-   visibility
-   collaborators
-   creation date

------------------------------------------------------------------------

# 9. Flashcard Editor

This is one of the most important parts of the product.

StudySmarter's rapid creation workflow is the benchmark.

The user should be able to create many cards without repeatedly opening
separate pages.

------------------------------------------------------------------------

# 10. Web Editor

Recommended layout:

``` text
┌──────────────────────────────────────────────────────────────┐
│ < Back     OOP: Classes & Objects             [Preview]     │
│                                              [Study] [Done] │
├──────────────────────────────────────────────────────────────┤
│ Card 1                                                       │
│ ┌─────────────────────────┐  ┌────────────────────────────┐ │
│ │ FRONT                   │  │ BACK                       │ │
│ │ What is a class?        │  │ A blueprint for objects... │ │
│ │                         │  │                            │ │
│ └─────────────────────────┘  └────────────────────────────┘ │
│                                                              │
│ Card 2                                                       │
│ ┌─────────────────────────┐  ┌────────────────────────────┐ │
│ │ FRONT                   │  │ BACK                       │ │
│ └─────────────────────────┘  └────────────────────────────┘ │
│                                                              │
│                         [+ Add Card]                          │
└──────────────────────────────────────────────────────────────┘
```

The editor is a multi-card workspace.

Users should not have to:

``` text
create card
save
leave
create card
save
leave
```

Instead:

``` text
type → Tab → type → Enter → next card
```

------------------------------------------------------------------------

# 11. Card Content

Both front and back support:

-   rich text
-   bold
-   italic
-   underline
-   headings
-   ordered lists
-   unordered lists
-   links
-   tables
-   code blocks
-   inline code
-   mathematical equations
-   images
-   highlighting
-   line breaks
-   copy/paste

No audio.

No drawing canvas.

No image-ID card type.

------------------------------------------------------------------------

# 12. Image Handling

Users can:

-   paste an image from clipboard
-   drag an image into a card on web
-   select an image from device
-   capture/select an image on mobile

Images are stored in Supabase Storage.

Do not store large image binaries directly inside PostgreSQL rows.

The card content stores the resulting asset reference.

------------------------------------------------------------------------

# 13. Rich Content Architecture

Do not model the entire future editor as one plain text column.

The database should support structured card content.

Recommended conceptual model:

``` text
Card
 |
 +-- front_content
 |      ├── text
 |      ├── formatting
 |      ├── image
 |      ├── equation
 |      └── code
 |
 +-- back_content
        ├── text
        ├── formatting
        ├── image
        ├── equation
        └── code
```

JSONB is acceptable for structured rich content if validated by a strict
schema.

Never trust arbitrary client JSON.

------------------------------------------------------------------------

# 14. Card Type Principle

The core object is still a flashcard.

Do not create separate unrelated entities for:

-   MCQ
-   True/False
-   standard recall
-   matching

Instead, retain a common card representation and allow study modes to
render cards differently.

Example:

``` text
Card:
Front = "What does polymorphism allow?"
Back  = "Objects of different classes to be treated through a common interface."

Standard mode:
Reveal answer → Retry / Hard / Good / Easy

MCQ mode:
Generate/select answer choices → student selects answer

True/False mode:
Convert the proposition into a statement → student selects True/False
```

The user should be able to choose how a deck is studied.

------------------------------------------------------------------------

# 15. How MCQ Conversion Actually Works

This is critical.

Do NOT pretend the system can magically turn every card into a perfect
MCQ.

There are two separate concepts:

## A. Deterministic cards with enough information

Example:

``` text
Front:
What is the capital of France?

Back:
Paris
```

The system can create:

``` text
Paris
Berlin
Madrid
Rome
```

if it has a verified distractor source or an existing question bank.

------------------------------------------------------------------------

## B. Conceptual cards

Example:

``` text
Front:
Why does encapsulation improve software design?

Back:
It hides internal state and implementation details behind a controlled interface.
```

There is no single guaranteed correct MCQ conversion.

The system must generate distractors from the semantic context.

Therefore, the architecture must treat generated MCQs as a derived study
representation, not as a replacement for the original card.

------------------------------------------------------------------------

# 16. MVP MCQ Rule

MVP should NOT require AI to generate MCQs.

Instead:

### Standard card

``` text
Front
Back
```

### MCQ card

The user optionally provides:

``` text
Question
Option A
Option B
Option C
Option D
Correct answer
```

This guarantees correctness.

Study mode can then render standard cards as standard recall and
explicitly authored MCQ cards as MCQs.

------------------------------------------------------------------------

# 17. Phase 2 Smart Conversion

Phase 2 can add:

``` text
Convert to MCQ
Convert to True/False
Generate distractors
Generate related questions
```

The AI service receives the card content and returns structured output:

``` json
{
  "question": "...",
  "options": [
    "...",
    "...",
    "...",
    "..."
  ],
  "correct_index": 2,
  "explanation": "...",
  "confidence": 0.91
}
```

The user must be shown a preview before committing generated cards.

AI-generated content must never silently overwrite the user's original
card.

------------------------------------------------------------------------

# 18. Import System

MVP has two ways to get many cards into Saktus:

1.  Bulk paste
2.  Quizlet import

These are different features.

------------------------------------------------------------------------

## 18.1 Bulk Paste

Web:

``` text
Import / Bulk Add

Paste your cards below.

FRONT<TAB>BACK
FRONT<TAB>BACK
FRONT<TAB>BACK
```

Example:

``` text
What is a class?    A blueprint for creating objects.
What is inheritance?    A mechanism where a class derives from another class.
What is polymorphism?   The ability to use a common interface for different object types.
```

Saktus detects:

-   rows
-   tabs
-   new lines

Then previews:

``` text
3 cards detected

| Front                  | Back                       |
|------------------------|----------------------------|
| What is a class?       | A blueprint...             |
| What is inheritance?   | A mechanism...             |
| What is polymorphism?  | The ability...             |

[Cancel] [Import 3 Cards]
```

The user confirms.

------------------------------------------------------------------------

# 19. Quizlet Import

The user does NOT paste a Quizlet URL and expect Saktus to scrape it.

MVP should use an exported file.

Flow:

``` text
Deck
 ↓
Import
 ↓
Quizlet
 ↓
"Export your Quizlet set first"
 ↓
Upload exported text/CSV-compatible file
 ↓
Parse
 ↓
Preview
 ↓
Confirm
 ↓
Cards created
```

The importer maps:

``` text
Quizlet term → Saktus front
Quizlet definition → Saktus back
```

If the export format contains separators, the importer lets the user
select or confirm:

``` text
Term separator: Tab ▼
Row separator: New line ▼
```

Preview is mandatory.

If a row cannot be parsed:

``` text
12 cards detected
10 valid
2 need attention
```

The user can edit the problematic rows before import.

------------------------------------------------------------------------

# 20. Import Safety

Never partially import silently.

Use an import transaction or staged import process.

Recommended:

``` text
Upload
 ↓
Parse
 ↓
Validate
 ↓
Preview
 ↓
User confirms
 ↓
Database transaction
 ↓
Success
```

If database creation fails, show:

> We couldn't finish importing these cards. Nothing was added. Try
> again.

Do not leave the deck half-imported.

------------------------------------------------------------------------

# 21. Mobile Editor

Mobile retains the same functionality but uses stacked cards.

``` text
OOP: Classes & Objects

Card 1 / 20

FRONT
[ editor ]

BACK
[ editor ]

[Duplicate] [Delete]

----------------

Card 2 / 20
...
```

Primary bottom action:

``` text
+ Add Card
```

Mobile should support:

-   rich text
-   image insertion
-   equations
-   code
-   lists
-   card duplication
-   reorder
-   delete
-   save
-   preview
-   study

The keyboard must not destroy the layout.

The editor must use keyboard-aware/responsive layout behavior so:

-   fields remain visible
-   buttons remain reachable
-   text does not overflow
-   cards resize naturally
-   fixed controls do not cover the active editor

------------------------------------------------------------------------

# 22. Card CRUD

Every card supports:

### Create

-   Add Card
-   duplicate card
-   bulk paste
-   import

### Read

-   deck list
-   card list
-   study mode
-   preview

### Update

-   edit front
-   edit back
-   edit type
-   edit options
-   reorder

### Delete

Delete one card.

Confirmation only when deletion is destructive and difficult to undo.

Prefer an undo toast:

> Card deleted. Undo

for immediate deletion.

------------------------------------------------------------------------

# 23. Deck CRUD

### Create

`+ Create Deck`

### Read

Deck library, search, saved, shared, discover.

### Update

-   title
-   subject
-   description
-   tags
-   visibility

### Delete

Confirmation:

``` text
Delete "Binary Trees"?

This permanently removes the deck and its cards.

Cancel
Delete Deck
```

For shared collaborative decks, only the owner can permanently delete
the deck.

------------------------------------------------------------------------

# 24. Collaboration

Collaboration is different from saving.

## Save

A student saves someone else's public/friends deck.

Result:

``` text
Independent copy
```

Future edits by the original creator do not affect the saved copy.

## Collaboration

A deck owner explicitly adds collaborators.

Result:

``` text
Shared live deck
```

Collaborators edit the same deck.

------------------------------------------------------------------------

# 25. Collaborator Management

Deck owner opens:

``` text
Deck → Share → Manage Collaborators
```

Example:

``` text
COLLABORATORS

Bryson
Owner

Alex
Editor                         [•••]

Sam
Editor                         [•••]

[+ Add Collaborator]
```

Menu:

``` text
Remove collaborator
Change role
```

For MVP, use:

-   Owner
-   Editor

Do not create unnecessary roles unless required.

------------------------------------------------------------------------

# 26. Undo Collaborator Changes

Because collaborator permissions are consequential, provide
confirmation.

Removing:

``` text
Remove Alex?

Alex will immediately lose access to this deck.

Cancel
Remove
```

After removal:

``` text
Alex removed from this deck. Undo
```

Undo is only available for a short period and must restore the previous
membership state safely.

If another permission change happened after removal, do not blindly
overwrite the newer state.

------------------------------------------------------------------------

# 27. Collaboration Audit Trail

Store collaboration events such as:

-   collaborator added
-   collaborator removed
-   role changed
-   deck visibility changed

This is useful for debugging and future governance.

------------------------------------------------------------------------

# 28. Visibility

Three MVP visibility states:

``` text
Private
Friends
Public
```

### Private

Only owner and explicit collaborators.

### Friends

Owner, collaborators and accepted friends.

### Public

Discoverable through community search.

Public decks can be:

-   viewed
-   studied
-   liked
-   rated
-   saved
-   copied

The original remains owned by its creator.

------------------------------------------------------------------------

# 29. Saved Decks

Saved decks belong in:

``` text
Cards
 ├── My Decks
 ├── Saved
 └── Shared
```

Saving creates a snapshot.

The saved copy should retain attribution:

``` text
Saved from @username
Original deck: Object-Oriented Programming
```

This prevents users from confusing copied content with their own
original creation.

------------------------------------------------------------------------

# 30. Community Discovery

MVP discovery should support:

### Search

Search across:

-   deck title
-   subject
-   topic
-   tags
-   creator username

Search bar:

``` text
Search decks, topics, creators...
```

### Filters

-   Subject
-   Topic
-   Card count
-   Rating
-   Popularity
-   Recently updated

### Sorting

-   Trending
-   Most saved
-   Highest rated
-   Most viewed
-   Newest

Do not create a TikTok-style algorithmic feed.

Academic utility comes first.

------------------------------------------------------------------------

# 31. Creator Profiles

Public creator profiles show:

-   username
-   name/avatar
-   university if user chooses to expose it
-   public decks
-   total public deck saves
-   ratings/reputation
-   study activity where permitted

Profile:

``` text
@alex

12 public decks
4.8 average rating

[Decks] [Activity]
```

Private academic data must never become public by default.

------------------------------------------------------------------------

# 32. Ratings, Likes and Views

Public decks can receive:

-   likes
-   saves
-   ratings
-   views

Avoid fake precision.

If a deck has only one rating, do not display:

``` text
4.9 / 5
```

as if it were statistically meaningful.

Use minimum-rating thresholds for reputation displays.

------------------------------------------------------------------------

# 33. Standard Study Mode

Standard mode is the primary SRS experience.

Screen:

``` text
OBJECT-ORIENTED PROGRAMMING

12 / 32 due

┌─────────────────────────────┐
│                             │
│ What is encapsulation?      │
│                             │
│           [Show Answer]     │
│                             │
└─────────────────────────────┘
```

Tap:

``` text
Show Answer
```

Then:

``` text
It is the bundling of data and methods while
restricting direct access to internal state.
```

Bottom controls:

``` text
Retry    Hard    Good    Easy
```

No emojis.

No "Again".

------------------------------------------------------------------------

# 34. SRS Feedback

Use:

-   Retry
-   Hard
-   Good
-   Easy

The underlying SRS engine may map these to the existing SM-2 quality
values.

Current legacy mapping:

``` text
Retry → q=0
Hard  → q=2
Good  → q=4
Easy  → q=5
```

The user-facing terminology must remain Retry.

------------------------------------------------------------------------

# 35. SRS Architecture

The current repository already defines an SM-2 engine.

Keep all scheduling mathematics in:

``` text
lib/study-engine
```

Never implement SRS separately in:

-   React component
-   mobile screen
-   web screen
-   API route

There must be one scheduling implementation.

------------------------------------------------------------------------

# 36. Review State

Do not rely on a single flashcard row for all future analytics.

Separate:

``` text
Card content
```

from:

``` text
User review state
```

Conceptually:

``` text
flashcards
    |
    +-- content

flashcard_review_states
    |
    +-- user
    +-- card
    +-- repetition
    +-- interval
    +-- ease
    +-- due_at

flashcard_review_events
    |
    +-- user
    +-- card
    +-- rating
    +-- reviewed_at
```

This becomes especially important for:

-   copied decks
-   shared decks
-   collaborators
-   public decks
-   per-user SRS progress

A student's review state must never alter another student's schedule.

------------------------------------------------------------------------

# 37. SRS Metrics

Every deck should calculate:

``` text
Total cards
Due today
Learning
Mastered
Accuracy
Reviews completed
Current mastery
```

Homepage should expose a smaller subset.

------------------------------------------------------------------------

# 38. Card Performance

Each card can optionally show:

``` text
Reviews: 8
Success rate: 75%
Last reviewed: Sep 13
Next review: Sep 16
Difficulty: Moderate
Current interval: 3 days
```

This belongs behind a card information/performance action rather than
permanently cluttering the editor.

------------------------------------------------------------------------

# 39. Study Modes

MVP:

1.  Standard SRS
2.  Authored MCQ
3.  Authored True/False
4.  Match / Quick Fire

The underlying card content remains reusable.

For example:

``` text
Deck
 |
 +-- Standard card
 |
 +-- MCQ card
 |
 +-- True/False card
```

Study mode determines presentation.

------------------------------------------------------------------------

# 40. Match Mode

Match mode takes card pairs and creates a temporary game board.

Example:

``` text
MATCH

Class                  Blueprint for objects
Object                  Instance of a class
Inheritance             Reuse/extension mechanism
Encapsulation           Controlled access to state
```

Cards disappear from the board when correctly matched.

Store study results as session data.

Do not permanently mutate the flashcard simply because it was used in
Match mode.

------------------------------------------------------------------------

# 41. Gamification

Gamification should reward study consistency rather than meaningless
tapping.

Useful metrics:

-   daily reviews
-   review streak
-   mastery
-   weekly review count
-   study goal progress
-   deck completion
-   cards learned
-   friends studying

Avoid:

-   excessive badges
-   random confetti
-   loot-box mechanics
-   meaningless points

------------------------------------------------------------------------

# 42. Social Progress

Friends can see explicitly permitted study activity.

Example:

``` text
Alex
Studying now
Data Structures

Cards reviewed today: 42
Current streak: 6 days
```

The exact visibility settings must be controllable.

Default to limited sharing.

------------------------------------------------------------------------

# 43. Home Dashboard

The Home page is the academic cockpit.

It is NOT merely a flashcard dashboard.

The homepage should contain:

1.  Header
2.  Today / next class
3.  Quick access
4.  Academic metrics
5.  Mini graphs
6.  Flashcard review
7.  Tasks
8.  Upcoming assessments
9.  Course progress
10. Notifications/social activity
11. Persistent timer

------------------------------------------------------------------------

# 44. Home Layout

Mobile:

``` text
┌──────────────────────────────┐
│ Good morning, Bryson     ◉   │
│ 6 day streak                 │
├──────────────────────────────┤
│ NEXT CLASS                   │
│ CSC201                       │
│ 10:00 - 11:00               │
│ Engineering Building        │
├──────────────────────────────┤
│ QUICK ACCESS                 │
│ [Schedule] [Cards] [Tasks]   │
│ [Exams]    [Timer]           │
├──────────────────────────────┤
│ TODAY                        │
│ Study time      72 / 120 min │
│ ███████████░░                │
│                              │
│ Cards due             32     │
│ Tasks                 4/7    │
│ Assessments           2      │
├──────────────────────────────┤
│ WEEKLY STUDY                 │
│ mini graph                   │
│                              │
├──────────────────────────────┤
│ FLASHCARDS                   │
│ 32 cards due                │
│ 68% deck mastery             │
│ [Open Cards]                 │
├──────────────────────────────┤
│ TASKS                        │
│ ☐ Finish Java assignment     │
│ ☐ Review lecture notes       │
│ [+ Add Task]                 │
├──────────────────────────────┤
│ UPCOMING                     │
│ OOP Test          4 days     │
│ Networks Exam     11 days    │
├──────────────────────────────┤
│ SOCIAL / NOTIFICATIONS       │
│ Alex shared a deck           │
│ Sam is studying now          │
└──────────────────────────────┘
```

Use Lucide icons rather than Unicode symbols in the actual interface.

------------------------------------------------------------------------

# 45. Home Statistics

Homepage statistics should include:

### Study time

``` text
Today: 72 min
Goal: 120 min
```

### Cards

``` text
32 due
18 reviewed today
68% mastery
```

### Tasks

``` text
4 / 7 complete
```

### Assessments

``` text
2 upcoming
```

### Streak

``` text
6 days
```

------------------------------------------------------------------------

# 46. Mini Graphs

Use small charts, not giant analytics dashboards.

Examples:

### Weekly study minutes

``` text
Mon  ███
Tue  █████
Wed  ██
Thu  ██████
Fri  ████
Sat  █
Sun  ███
```

### Cards reviewed

``` text
Mon  20
Tue  45
Wed  18
Thu  62
Fri  40
```

Charts must remain readable on mobile.

All numerical metrics use tabular numerals.

------------------------------------------------------------------------

# 47. Quick Access

Home should provide immediate access to:

-   Schedule
-   Cards
-   Tasks
-   Exams
-   Timer
-   Notifications

These are actions, not decorative cards.

Each should have a clear tap target.

------------------------------------------------------------------------

# 48. Notifications

Home includes a compact notification/activity section.

Notification categories:

-   deadline
-   class
-   streak
-   social
-   system

The existing notification architecture can use the `notifications`
table, but RLS must ensure users only see their own notifications.

Notification center entry:

``` text
Header → Bell
```

or an equivalent Lucide notification icon.

Unread count should be visible without becoming visually dominant.

------------------------------------------------------------------------

# 49. Schedule

Bottom navigation:

``` text
Schedule
```

Includes:

-   timetable
-   class CRUD
-   upcoming exams
-   assignment deadlines
-   calendar views

The Home page only surfaces the next relevant schedule item.

Do not duplicate the entire calendar onto Home.

------------------------------------------------------------------------

# 50. Tasks

Tasks remain an academic cockpit feature.

Home supports:

-   view today's tasks
-   mark complete
-   create task

Dedicated task management can exist within Home or an expanded task
route.

Task CRUD:

-   create
-   read
-   update
-   complete
-   delete

Tasks may link to a course.

------------------------------------------------------------------------

# 51. Exams and Assignments

Assessments support:

-   title
-   subject
-   due date
-   weight
-   completion
-   notes where supported

Home shows upcoming urgency.

Schedule shows date placement.

Assessment page handles full CRUD.

------------------------------------------------------------------------

# 52. Profile

Bottom navigation:

``` text
Profile
```

Contains:

-   account
-   username
-   academic information
-   university
-   degree
-   study goals
-   streak
-   timezone
-   notification settings
-   privacy settings
-   appearance/theme
-   sign out

Privacy settings must include social visibility controls.

------------------------------------------------------------------------

# 53. Social / Friends

Bottom navigation:

``` text
Social / Friends
```

Top-level sections:

``` text
Friends
Discover
Activity
Study Rooms
```

Search:

``` text
Search students...
```

Search by:

-   username
-   email where permitted
-   university
-   link

Friend system supports:

-   send request
-   accept
-   decline
-   remove
-   block
-   pending requests

------------------------------------------------------------------------

# 54. Social Notifications

Examples:

``` text
Alex sent you a friend request.
Sam added you to a study room.
Alex shared a deck with you.
```

Notifications must deep-link to the relevant page.

------------------------------------------------------------------------

# 55. Past Papers

## Phase 2

Do not build this into the flashcard MVP.

Future module:

``` text
Past Papers
 |
 +-- University
 +-- Course
 +-- Year
 +-- Assessment type
 +-- Search
 +-- Filters
```

This can eventually become a major Saktus academic resource system
similar to the past-paper banks students use on platforms such as
Studocu.

It should be treated as a separate academic content domain rather than
forcing past papers into flashcards.

Potential future capabilities:

-   upload
-   search
-   preview
-   download
-   ratings
-   course association
-   community contributions
-   reporting
-   moderation
-   answer guides
-   institutional verification

------------------------------------------------------------------------

# 56. Future AI

Phase 2 only.

Potential AI features:

-   document → flashcards
-   notes → flashcards
-   lecture transcript → flashcards
-   card → MCQ
-   card → True/False
-   generate distractors
-   explain answer
-   generate study guide
-   generate mock exam
-   identify weak topics

AI should always create reviewable output.

Never silently alter the student's source material.

------------------------------------------------------------------------

# 57. Database Model

Recommended conceptual schema:

``` mermaid
erDiagram
    PROFILES ||--o{ COURSES : owns
    COURSES ||--o{ DECKS : contains
    DECKS ||--o{ CARDS : contains

    PROFILES ||--o{ REVIEW_STATES : has
    CARDS ||--o{ REVIEW_STATES : scheduled

    PROFILES ||--o{ REVIEW_EVENTS : performs
    CARDS ||--o{ REVIEW_EVENTS : reviewed

    DECKS ||--o{ DECK_MEMBERS : has
    PROFILES ||--o{ DECK_MEMBERS : joins

    PROFILES ||--o{ DECK_SAVES : saves
    DECKS ||--o{ DECK_SAVES : saved

    PROFILES ||--o{ FRIENDSHIPS : connects
    DECKS ||--o{ DECK_LIKES : receives
    PROFILES ||--o{ DECK_LIKES : gives

    DECKS ||--o{ DECK_RATINGS : receives
    PROFILES ||--o{ DECK_RATINGS : gives

    PROFILES ||--o{ NOTIFICATIONS : receives
```

------------------------------------------------------------------------

# 58. Recommended Flashcard Tables

## `flashcard_decks`

Fields:

-   `id`
-   `owner_id`
-   `course_id`
-   `title`
-   `description`
-   `visibility`
-   `tags`
-   `created_at`
-   `updated_at`

Indexes:

-   owner
-   course
-   visibility
-   created_at

------------------------------------------------------------------------

## `flashcards`

Fields:

-   `id`
-   `deck_id`
-   `position`
-   `front_content`
-   `back_content`
-   `card_type`
-   `created_by`
-   `created_at`
-   `updated_at`

Do not store user-specific SRS state here.

------------------------------------------------------------------------

## `flashcard_review_states`

Fields:

-   `id`
-   `user_id`
-   `card_id`
-   `repetition_number`
-   `interval_days`
-   `ease_factor`
-   `due_at`
-   `last_reviewed_at`

Unique:

``` text
(user_id, card_id)
```

------------------------------------------------------------------------

## `flashcard_review_events`

Fields:

-   `id`
-   `user_id`
-   `card_id`
-   `deck_id`
-   `rating`
-   `study_mode`
-   `reviewed_at`
-   `response_time_ms`

This powers analytics.

------------------------------------------------------------------------

## `deck_members`

Fields:

-   `deck_id`
-   `user_id`
-   `role`
-   `created_at`
-   `updated_at`

Roles:

``` text
owner
editor
```

Owner can be represented by `owner_id` on the deck rather than
duplicating ownership in members.

------------------------------------------------------------------------

# 59. Public Discovery Tables

Potential tables:

``` text
deck_likes
deck_saves
deck_ratings
deck_views
```

Use unique constraints where appropriate.

Example:

``` text
UNIQUE(deck_id, user_id)
```

for likes.

Views may require a different anti-abuse strategy and should not blindly
increment on every render.

------------------------------------------------------------------------

# 60. Import Tables

Recommended:

``` text
deck_imports
```

Fields:

-   id
-   user_id
-   deck_id
-   source
-   status
-   total_rows
-   valid_rows
-   invalid_rows
-   created_at
-   completed_at

Sources:

``` text
bulk_paste
quizlet
```

------------------------------------------------------------------------

# 61. RLS

RLS must protect:

-   decks
-   cards
-   review states
-   review events
-   collaborators
-   saved copies
-   likes
-   ratings
-   notifications
-   social relationships

Important rule:

A user being able to read a public deck does NOT automatically mean they
can mutate its cards.

Public read:

``` text
SELECT
```

Owner/editor mutation:

``` text
INSERT
UPDATE
DELETE
```

must be separate policies.

------------------------------------------------------------------------

# 62. Collaboration RLS

Conceptually:

``` text
Owner:
  read
  insert
  update
  delete
  manage collaborators

Editor:
  read
  insert cards
  update cards
  delete cards
  reorder cards

Viewer:
  read only
```

MVP only needs Owner and Editor.

------------------------------------------------------------------------

# 63. Saved Copy Security

When a student saves a public deck:

1.  Verify source deck is readable.
2.  Create a new deck owned by the student.
3.  Copy card content.
4.  Reset SRS state for copied cards.
5.  Store attribution to source deck.
6.  Do not create shared ownership.

The source creator must not gain access to the saved copy.

------------------------------------------------------------------------

# 64. Copy vs Collaboration Diagram

``` mermaid
flowchart LR
    A[Public Deck] -->|Save| B[Independent Copy]
    B --> C[New Owner]
    A -->|Collaborate| D[Shared Live Deck]
    D --> E[Owner]
    D --> F[Editor]
```

------------------------------------------------------------------------

# 65. Realtime Collaboration

Use Supabase Realtime where it provides real value.

Potential realtime events:

-   collaborator joins
-   card created
-   card updated
-   card deleted
-   card reordered

The editor should show lightweight presence:

``` text
Alex is editing
```

Do not build a Google Docs clone for MVP.

Conflict handling must be deterministic.

------------------------------------------------------------------------

# 66. Collaboration Conflict Rule

For MVP:

-   save frequently
-   send mutation versions
-   reject stale destructive updates
-   refetch when conflict detected

Example:

``` text
This card was changed by another collaborator.
Review the latest version before saving your changes.
```

Do not silently overwrite another person's work.

------------------------------------------------------------------------

# 67. Performance

Flashcard decks may become large.

Use:

-   pagination
-   cursor-based loading where appropriate
-   indexed queries
-   no `SELECT *`
-   lazy loading of large rich-content payloads where useful
-   image CDN/cache behavior through the existing infrastructure
-   optimistic UI only where rollback is safe

Never load 2,000 cards into a mobile screen at once.

------------------------------------------------------------------------

# 68. Responsive / Keyboard Layout

The application must be adaptive.

The relevant engineering concept is **responsive layout / keyboard-aware
layout**.

Mobile editor must respond to:

-   keyboard appearance
-   orientation changes
-   small screens
-   large screens
-   dynamic text
-   long equations
-   long code
-   image dimensions

Cards must not:

-   overflow horizontally
-   clip text
-   hide controls behind keyboard
-   produce broken fixed heights

Avoid hardcoded heights for content-heavy card surfaces.

------------------------------------------------------------------------

# 69. Loading States

Use skeletons for:

-   deck lists
-   deck details
-   progress
-   home metrics

Do not show blank screens while data loads.

------------------------------------------------------------------------

# 70. Empty States

### No decks

``` text
No decks yet.

Create your first deck or import cards.

[Create Deck] [Import]
```

### No due cards

``` text
You're caught up.

No cards are due right now.
```

### No saved decks

``` text
No saved decks.

Discover decks from other students.
```

------------------------------------------------------------------------

# 71. Error States

Errors must be actionable.

Examples:

``` text
Couldn't save the deck.
Check your connection and try again.
[Retry]
```

``` text
Couldn't upload this image.
Try a smaller image.
```

``` text
This deck is no longer available.
```

``` text
You no longer have access to this deck.
```

Never expose:

-   SQL
-   PostgREST
-   RLS
-   UUIDs
-   stack traces
-   internal function names

------------------------------------------------------------------------

# 72. Delete and Undo Rules

Use confirmation for:

-   deleting deck
-   permanently deleting cards when bulk deletion is involved
-   removing owner-level relationships

Use undo for:

-   single card deletion
-   collaborator removal where safe
-   accidental archive-like actions

Undo must be implemented as a real state restoration, not simply a
frontend animation.

------------------------------------------------------------------------

# 73. Accessibility

Every interactive control must have:

-   accessible label
-   visible focus state
-   sufficient touch target
-   keyboard access on web
-   screen-reader label
-   non-color-only state communication

Do not rely solely on color to communicate:

-   correct
-   incorrect
-   due
-   mastered
-   online

------------------------------------------------------------------------

# 74. Visual Design

Saktus design system:

-   pure white light canvas
-   pure black OLED dark canvas
-   crisp 1px borders
-   no glassmorphism
-   no neon gradients
-   no generic purple AI aesthetic
-   no Unicode emojis
-   Lucide icons
-   tactile button press
-   stable tabular numerals
-   restrained animation

Cards should feel physical without becoming toy-like.

------------------------------------------------------------------------

# 75. Animation

Use motion for:

-   card transitions
-   button presses
-   study answer reveal
-   match mode interactions
-   list insertion/deletion
-   modal presentation

Avoid:

-   `transition: all`
-   giant entrance animations
-   excessive bouncing
-   animations that delay user actions

The study loop should feel fast.

------------------------------------------------------------------------

# 76. Navigation Map

``` mermaid
flowchart TD
    H[HOME]

    H --> N[Notifications]
    H --> S[Schedule]
    H --> C[Cards]
    H --> T[Tasks]
    H --> E[Exams]
    H --> F[Focus Timer]

    C --> CL[Card Library]
    CL --> MD[My Decks]
    CL --> SV[Saved]
    CL --> SH[Shared]
    CL --> DC[Discover]

    MD --> DP[Deck Page]
    DP --> ED[Editor]
    DP --> ST[Study]
    DP --> PR[Progress]

    ED --> IMP[Import]
    ED --> COL[Collaborators]

    SOCIAL[Social / Friends] --> FR[Friends]
    SOCIAL --> DS[Discover Students]
    SOCIAL --> AC[Activity]
    SOCIAL --> SR[Study Rooms]

    PROFILE[Profile] --> SET[Settings]
```

------------------------------------------------------------------------

# 77. MVP Page-by-Page Requirement Matrix

## Home

Must contain:

-   greeting
-   streak
-   next class
-   quick access
-   study statistics
-   mini graph
-   cards due
-   task summary
-   assessment summary
-   course progress
-   notification/social summary
-   timer access

Actions:

-   open Schedule
-   open Cards
-   create task
-   open Exams
-   start timer
-   open notifications

------------------------------------------------------------------------

## Schedule

Must contain:

-   timetable
-   day/week view
-   class CRUD
-   upcoming assessment dates
-   date navigation

Actions:

-   add class
-   edit class
-   delete class
-   open assessment
-   switch date

------------------------------------------------------------------------

## Cards

Must contain:

-   search
-   My Decks
-   Saved
-   Shared
-   Discover
-   filters
-   create deck
-   import
-   due count

Actions:

-   open deck
-   study
-   edit
-   save
-   create
-   import

------------------------------------------------------------------------

## Deck Page

Must contain:

-   title
-   subject
-   card count
-   mastery
-   due count
-   Study Due
-   Study All
-   Edit
-   Share
-   overflow menu

CRUD:

-   edit deck
-   delete deck
-   duplicate deck
-   manage collaborators

------------------------------------------------------------------------

## Deck Editor

Must contain:

-   simultaneous multi-card editing on web
-   stacked editor on mobile
-   front
-   back
-   formatting
-   image
-   equations
-   code
-   lists
-   tables
-   add card
-   duplicate
-   reorder
-   delete
-   preview
-   save

------------------------------------------------------------------------

## Import

Must contain:

-   Bulk Paste
-   Quizlet
-   parser
-   mapping
-   validation
-   preview
-   confirm
-   error handling
-   import result

------------------------------------------------------------------------

## Study

Must contain:

-   progress
-   card
-   reveal answer
-   Retry
-   Hard
-   Good
-   Easy
-   exit
-   session completion

------------------------------------------------------------------------

## Social / Friends

Must contain:

-   student search
-   friend requests
-   friends
-   activity
-   study rooms

Actions:

-   add friend
-   accept
-   decline
-   remove
-   block
-   invite
-   share deck

------------------------------------------------------------------------

## Profile

Must contain:

-   profile
-   academic info
-   goals
-   streak
-   privacy
-   notifications
-   timezone
-   appearance
-   account

------------------------------------------------------------------------

# 78. MVP vs Phase 2

## MVP

### Flashcards

-   create deck
-   edit deck
-   delete deck
-   card CRUD
-   rich text
-   images
-   equations
-   code
-   lists
-   tables
-   simultaneous web editor
-   mobile editor
-   bulk paste
-   Quizlet import
-   standard SRS
-   Retry / Hard / Good / Easy
-   authored MCQ
-   authored True/False
-   Match mode
-   deck progress
-   card performance
-   Saved decks
-   public/friends/private visibility
-   likes
-   ratings
-   saves
-   views
-   search
-   filters
-   creator profiles
-   collaboration
-   add/remove collaborators
-   undo collaborator removal
-   independent saved copies

### Academic OS

-   Home
-   Schedule
-   Tasks
-   Assessments
-   Notifications
-   Social / Friends
-   Profile
-   Focus timer
-   study statistics
-   mini graphs

### Infrastructure

-   Supabase Auth
-   Supabase PostgreSQL
-   RLS
-   Supabase Storage
-   Supabase Realtime where needed
-   shared TypeScript schemas
-   shared study engine
-   user-safe errors
-   proper migrations
-   indexes
-   validation

------------------------------------------------------------------------

# 79. Phase 2

-   AI deck generation
-   document → flashcards
-   lecture → flashcards
-   AI MCQ generation
-   AI distractors
-   AI explanations
-   AI mock exams
-   AI study plans
-   past paper bank
-   advanced discovery ranking
-   verified creators
-   moderation tools
-   advanced analytics
-   richer collaborative editing
-   additional study modes
-   advanced recommendations

------------------------------------------------------------------------

# 80. Superadmin

Do NOT build the superadmin worker into the flashcard MVP.

Future architecture can include:

``` mermaid
flowchart LR
    USER[Student Apps] --> SUPA[Supabase]
    SUPA --> APP[Student Platform]

    CEO[CEO / Superadmin] --> ADMIN[Superadmin Console]
    ADMIN --> ADMINAPI[Superadmin Worker / API]
    ADMINAPI --> SUPA
```

The superadmin system should later handle things such as:

-   platform administration
-   moderation
-   user management
-   content reports
-   verified creators
-   platform analytics
-   system configuration
-   audit logs

Keep this separate from normal student permissions.

------------------------------------------------------------------------

# 81. Implementation Order

Gemini should implement in this order.

## Step 1: Inspect

Before changing code:

-   inspect repository
-   inspect current routes
-   inspect existing Supabase schema
-   inspect existing migrations
-   inspect current flashcard implementation
-   inspect existing study engine
-   inspect existing auth
-   inspect existing UI primitives

Use Supabase MCP to verify the actual production schema.

Do not assume the handover document is perfectly synchronized with
production.

------------------------------------------------------------------------

## Step 2: Database

Create/update migrations for:

-   decks
-   cards
-   review states
-   review events
-   collaborators
-   saves
-   likes
-   ratings
-   views
-   imports
-   notifications where missing

Add indexes.

Enable RLS.

Test policies with real user scenarios.

------------------------------------------------------------------------

## Step 3: Shared Types

Update:

``` text
lib/shared
```

with:

-   deck types
-   card types
-   content schemas
-   visibility enums
-   collaborator roles
-   review types
-   import types
-   notification types

Use Zod validation.

------------------------------------------------------------------------

## Step 4: Study Engine

Keep all scheduling logic in:

``` text
lib/study-engine
```

Test:

-   Retry
-   Hard
-   Good
-   Easy
-   due date
-   timezone
-   first review
-   repeat review
-   failed review
-   long intervals

------------------------------------------------------------------------

## Step 5: Deck Library

Implement:

-   search
-   tabs
-   filters
-   create
-   open
-   delete
-   saved
-   shared
-   discover

------------------------------------------------------------------------

## Step 6: Editor

Implement web simultaneous editor first.

Then mobile equivalent.

Test:

-   keyboard
-   image paste
-   rich formatting
-   equations
-   code
-   long content
-   card reorder
-   deletion
-   autosave
-   collaboration

------------------------------------------------------------------------

## Step 7: Import

Implement:

1.  Bulk Paste
2.  Quizlet file import

Always use:

``` text
Parse → Validate → Preview → Confirm → Commit
```

------------------------------------------------------------------------

## Step 8: Study Player

Implement:

-   standard SRS
-   authored MCQ
-   authored True/False
-   Match

Connect review events to analytics.

------------------------------------------------------------------------

## Step 9: Social

Implement:

-   friends
-   deck sharing
-   saved decks
-   collaborators
-   notifications
-   creator profiles

------------------------------------------------------------------------

## Step 10: Home

Integrate:

-   SRS due
-   study statistics
-   weekly graph
-   schedule
-   tasks
-   assessments
-   notifications
-   social activity
-   quick actions

Home must pull from the actual underlying modules rather than
duplicating data.

------------------------------------------------------------------------

# 82. Testing Requirements

Before calling MVP complete, test:

## Deck

-   create
-   update
-   delete
-   duplicate
-   visibility

## Cards

-   create
-   update
-   delete
-   reorder
-   duplicate
-   rich content

## SRS

-   all four ratings
-   due date
-   timezone
-   review state isolation

## Import

-   valid bulk paste
-   malformed rows
-   Quizlet export
-   duplicate content
-   empty file
-   partial parse failure
-   transaction rollback

## Collaboration

-   owner
-   editor
-   add
-   remove
-   undo
-   stale update
-   concurrent edit

## Security

-   private deck cannot be read by unauthorized user
-   public deck can be read
-   public deck cannot be edited
-   friend-only deck cannot be read by non-friend
-   review state is private to the student
-   notification is private
-   saved copy belongs to saver

## Responsive UI

Test:

-   phone portrait
-   phone landscape
-   tablet
-   desktop
-   small laptop
-   keyboard open
-   long card content
-   large image
-   long equation
-   long code block

------------------------------------------------------------------------

# 83. Acceptance Criteria

The flashcard MVP is complete when a new student can:

``` text
Sign up
 ↓
Create/select a subject
 ↓
Create a deck
 ↓
Create multiple cards quickly
 ↓
Paste images/equations/rich content
 ↓
Import a Quizlet export
 ↓
Study the deck
 ↓
Rate cards Retry / Hard / Good / Easy
 ↓
Return later
 ↓
See cards scheduled by SRS
 ↓
See mastery/progress
 ↓
Save another student's public deck
 ↓
Share their deck
 ↓
Collaborate with a friend
 ↓
Remove a collaborator
 ↓
See the change reflected safely
 ↓
See flashcard statistics on Home
```

No step should require leaving Saktus unnecessarily.

------------------------------------------------------------------------

# 84. Non-Negotiable Rules for the Coding Agent

1.  Do not replace the current Saktus architecture without a concrete
    reason.
2.  Do not create a second database.
3.  Do not bypass Supabase RLS.
4.  Do not use `SELECT *`.
5.  Do not expose raw database errors.
6.  Do not put SRS calculations in UI components.
7.  Do not duplicate business logic between web and mobile.
8.  Do not make AI a requirement for MVP flashcard creation.
9.  Do not silently convert user cards into AI-generated MCQs.
10. Do not overwrite original card content during generated conversions.
11. Do not treat a saved deck as a live shared deck.
12. Do not allow public users to mutate public decks.
13. Do not hide important CRUD actions behind unexplained gestures.
14. Do not use emoji characters in UI.
15. Do not introduce glassmorphism or neon gradients.
16. Do not use fixed heights for content-heavy cards.
17. Do not ship broken keyboard behavior on mobile.
18. Do not silently swallow failed writes.
19. Do not partially import cards without telling the user.
20. Do not build the superadmin system as part of this MVP.

------------------------------------------------------------------------

# 85. Final Product Principle

Saktus should make the loop feel obvious:

``` text
PLAN
  ↓
ATTEND
  ↓
CAPTURE
  ↓
CREATE CARDS
  ↓
REVIEW
  ↓
SEE WEAK AREAS
  ↓
STUDY
  ↓
TRACK PROGRESS
  ↓
REPEAT
```

Flashcards are not an isolated feature.

They are the active-recall layer of the Saktus Academic OS.

The Home dashboard tells the student what needs attention.

Schedule tells them when.

Tasks and assessments tell them what is coming.

Flashcards tell them what they actually remember.

SRS decides when they should see it again.

Social keeps accountability present.

The focus timer gives them the environment to do the work.

That is the product loop this MVP must implement.
