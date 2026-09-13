# Saktus — Landing Page Copy + Platform Language Rules

---

## Part 1: Landing Page Copy

### Hero

**Headline:**
One app for your whole semester.

**Subhead:**
Timetable. Flashcards. Focus timer. Study group. Saktus runs all of it.

**CTA button:** Start studying

---

### Positioning line

You're using four apps to manage one semester. A calendar for classes, a flashcard app for exams, a timer for focus, a group chat for your study group. Saktus replaces all four.

---

### Feature: Calendar

**Heading:** Built for a semester

**Body:**
Add your classes once, including the ones that repeat every week. Track assignment deadlines and exam dates in the same view. No setup beyond the first ten minutes.

---

### Feature: Flashcards

**Heading:** Spaced repetition, done properly

**Body:**
Saktus schedules your reviews using the same spacing model researchers use to test memory retention. Tag your cards by subject and study whatever's actually due today.

---

### Feature: Focus Timer

**Heading:** Time you can actually see

**Body:**
Start a session. Saktus logs it. Check your total hours for the day, the week, the month. That's the whole feature.

---

### Feature: Squads & Streaks

**Heading:** Study with people, on your terms

**Body:**
Join a live study room with friends when you want company. Keep a streak going without a guilt notification. Check the leaderboard against people you know, not strangers on the internet.

---

### Closing CTA

**Heading:** Built for students, by a student

**Body:**
No ads. No tracking you didn't agree to. Just the tools for getting through the term.

**Button:** Get started

---

## Part 2: Platform-Wide Language Rules

Every piece of copy in Saktus — UI strings, marketing, emails, error messages — gets checked against this before it ships. The goal is copy that sounds like it was written by someone who uses the app, not generated to describe one.

### Voice Principles

1. **State the mechanic, not the feeling.** "Logs your focus session" beats "helps you find your flow." If a sentence describes an emotion instead of a function, cut it.
2. **No contrastive reframes.** Never write "It's not X, it's Y" or "not just X but Y." Say what it is, once, plainly.
3. **Vary sentence length on purpose.** A string of same-length sentences reads like it was generated. Mix short and shorter. Don't pad a sentence to match the one before it.
4. **No em dashes.** Use a period or a comma. If a sentence needs an em dash to hold together, it's two sentences.
5. **Cut filler adverbs.** "Importantly," "crucially," "essentially," "at its core" — these announce significance instead of demonstrating it. Delete and reread; the sentence is always fine without them.
6. **No manufactured authority.** Don't cite a statistic, study, or "research shows" without a real source. If you can't cite it, don't claim it.
7. **The delete test.** Read a sentence and ask: does the paragraph lose information if I cut this? If not, cut it.

### Banned Words & Phrases

- seamless / seamlessly
- unlock your potential
- empower / empowering
- revolutionize / revolutionary
- effortless / effortlessly
- next-level
- game-changer / game-changing
- leverage (as a verb)
- holistic
- ecosystem (unless literally describing integrated infrastructure)
- supercharge
- elevate your [anything]
- curated
- frictionless
- at your fingertips
- cutting-edge / state-of-the-art
- harness the power of
- unleash
- delve / delve into
- tapestry
- landscape (used metaphorically — "the study landscape")
- navigate (used metaphorically — "navigate your workload")
- testament / pivotal / transformative / paradigm-shifting
- in today's fast-paced world / in today's landscape
- it's important to note / it's worth noting
- journey (as a metaphor for using the app)
- robust
- intuitive (show it, don't claim it)
- "calm cockpit," "command center," "mission control," or any control-room metaphor for a dashboard

### Banned Sentence Patterns

- "It's not X, it's Y" or any variant of a contrastive reframe used for emphasis
- "Not just X, but Y"
- Rhetorical questions with an obvious answer ("Ever feel like there's not enough time in the day?")
- Every item in a list starting with a bolded phrase, repeated across every bullet
- Three examples in a row where one would do ("faster, easier, and simpler")
- Any sentence that survives deletion without the paragraph losing information

### Banned Design/UX Patterns

- **Green dot presence/online indicators** — no fake-social-network status dots anywhere in the app.
- **Glassmorphism / frosted glass panels.**
- **Gradient blobs or mesh backgrounds** used as decoration with no functional purpose.
- **Sparkle (✨) icons or "AI-powered" badges** slapped on features to signal novelty.
- **Generic hero illustrations of people** (stock-style flat illustration humans at desks, etc.).
- **Emoji in UI copy or buttons** unless it's a reaction/status the user picked themselves.
- **Self-congratulatory feature naming** — no branding a plain dashboard as a "cockpit," "hub," or "command center." Call a calendar a calendar.
- **Loading/empty states with forced enthusiasm** ("Nothing here yet, time to get started!") — state the empty state plainly and give the next action.

### Quick Rewrite Reference

| Slop | Say instead |
|---|---|
| "Unlock your full study potential" | "See what's due and get it done" |
| "A seamless, all-in-one ecosystem" | "Your timetable, cards, and timer in one app" |
| "Supercharge your focus" | "Start a focus session" |
| "Your personalized study journey" | "Your study plan" |
| "A calm cockpit for your semester" | "Your dashboard" |
| "It's not just a timer, it's a system" | "It logs your focus hours" |