# Saktus — Bug Backlog, Onboarding, Pricing, Security & Friends Redesign

Combined spec and resolution record for the Sept 2026 review session on Saktus. Covers confirmed bugs, audited edge cases, email templates, first-run onboarding, pricing tier structure, security checklist, and the single-dashboard Friends redesign.

---

## 1. Confirmed bugs (Status: All Fixed)

| Bug | Root cause | Resolution & Code Reference | Status |
|---|---|---|---|
| **Login shows "Invalid login credentials"** | Raw Supabase auth error message was surfaced directly to the user | Handled in [`apps/web/src/app/(auth)/login/page.tsx`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/app/(auth)/login/page.tsx) and [`apps/mobile/app/login.tsx`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/app/login.tsx). Errors matching `"invalid login credentials"` are remapped to `"Wrong email or password."`. A prominent `"New here? Create an account"` shortcut banner was added directly inside the error notification state. | ✅ Fixed |
| **Form placeholders show real names** | Hardcoded developer/test names (`"Lethabo Mabilo"`) in form inputs | Replaced with generic student example copy (`"e.g. Alex Ndlovu"`) across web and mobile login forms. All other form inputs audited across timetable, exams, flashcards, timer, and friends. | ✅ Fixed |
| **Timer page redirects to login** | Browser Supabase client was instantiated on every component render, creating race conditions with token refresh timers; Next.js middleware was dropping response cookies during route redirects | 1) Transformed [`apps/web/src/lib/supabase/client.ts`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/lib/supabase/client.ts) into a singleton browser client to maintain stable auth state and background refresh timers.<br>2) Updated [`apps/web/src/middleware.ts`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/middleware.ts) to copy and preserve response cookies during redirects. | ✅ Fixed |
| **Time/streak calculations use server time** | Day boundaries ran against server UTC (`new Date().toISOString().split('T')[0]` and PostgreSQL `CURRENT_DATE`) rather than the student's actual local clock | 1) Client captures IANA timezone on signup (`Intl.DateTimeFormat().resolvedOptions().timeZone`, e.g. `'Africa/Johannesburg'`) and persists to `public.profiles.timezone`.<br>2) Added `getLocalISODate(date, timezone)` in [`@flowstate/study-engine`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/lib/study-engine/src/streaks.ts) using standard `'en-CA'` ISO formatting.<br>3) Updated PostgreSQL procedure `record_study_activity` in [`20260913_user_onboarding_timezone_tier.sql`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/supabase/migrations/20260913_user_onboarding_timezone_tier.sql) to calculate `v_today` relative to the user's timezone: `(NOW() AT TIME ZONE v_user_timezone)::DATE`. | ✅ Fixed |

---

## 2. Bugs Audited & Hardened

- **Flashcard SRS due-dates**:
  - *Audit Finding*: `calculateNextReview` in `sm2.ts` previously formatted due dates using `result.dueDate.toISOString().split('T')[0]`, causing cards to flip due dates prematurely for users ahead of UTC.
  - *Fix*: Updated [`calculateNextReview`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/lib/study-engine/src/sm2.ts) to accept optional `timezone` and format dates via `getLocalISODate`. Also updated [`home/page.tsx`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/app/(dashboard)/home/page.tsx) to query due cards using local calendar date.
- **DST edge cases**:
  - *Audit Finding*: Raw millisecond differences with `Math.floor(ms / 86400000)` can produce 0 or 2 days during 23-hour or 25-hour Daylight Saving Time clock shift transitions.
  - *Fix*: Updated [`calculateStreak`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/lib/study-engine/src/streaks.ts) to parse date parts into `Date.UTC(y, m-1, d)` and use `Math.round(diffMs / 86400000)`. This guarantees clean integer day differences immune to DST shifts.
- **Streak freeze logic**:
  - *Audit Finding*: When a freeze was consumed on `diffDays === 2`, the 7-day milestone check was skipped, preventing students from earning their next freeze on a protected streak. Furthermore, if a streak broke (`diffDays > 2`), the session left the streak at 0 instead of starting day 1 of the new streak.
  - *Fix*: Corrected earn/consume logic in [`streaks.ts`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/lib/study-engine/src/streaks.ts) and PostgreSQL stored procedure `record_study_activity`. Freezes are capped at 3, consumed when missing 1 day, rewarded on day 7 milestones, and broken streaks restart cleanly at 1 on the day of study.
- **Timer session persistence on mobile**:
  - *Audit Finding*: Checked [`apps/mobile/lib/supabase.ts`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile/lib/supabase.ts). Supabase client is configured with `storage: AsyncStorage`, `autoRefreshToken: true`, and `persistSession: true` using PKCE auth flow. Auth session survives app backgrounding and process kills.
- **RLS leakage audit**:
  - *Audit Finding*: Verified that personal tables (`courses`, `timetable_classes`, `assessments`, `flashcards`, `study_sessions`, `tasks`, `streaks`) have strict `user_id = auth.uid()` policies with zero multi-tenant leakage.
  - *Fix*: Updated `public.profiles` policy in [`20260913_user_onboarding_timezone_tier.sql`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/supabase/migrations/20260913_user_onboarding_timezone_tier.sql) so authenticated users can read public student profiles for friends and leaderboards, while update access remains strictly restricted to `auth.uid() = id`.
- **Session/token refresh**:
  - *Audit Finding*: Identified that non-singleton browser client creation in React components caused multiple token refresh instances to collide and cancel each other, causing intermittent session dropouts.
  - *Fix*: Created singleton browser client in [`client.ts`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/lib/supabase/client.ts).

---

## 3. Email templates & domain blocker

**Current state**: Supabase SMTP will point to Resend once the custom domain verifies on Tuesday.

**Templates written and ready to deploy**:
- [`email-templates/signup-confirmation.html`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/email-templates/signup-confirmation.html): Saktus-branded email verification with high-contrast tactile card, fallback URL box, and student copy.
- [`email-templates/reset-password.html`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/email-templates/reset-password.html): Saktus-branded password reset request with security notice.
- [`email-templates/squad-invite.html`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/email-templates/squad-invite.html): Study room / squad invitation with 6-character room code badge and 1-tap join button.

**Steps after domain verifies on Tuesday**:
1. Point Supabase SMTP settings to Resend using SMTP credentials.
2. Paste HTML templates into Supabase Auth Email Templates.
3. Test end-to-end delivery and verify inbox placement.

---

## 4. Onboarding flow (first sign-up only)

Built as [`apps/web/src/components/onboarding-modal.tsx`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/components/onboarding-modal.tsx) and mounted in [`apps/web/src/app/(dashboard)/layout.tsx`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/app/(dashboard)/layout.tsx).

- **Gating**: Gated by `has_completed_onboarding` boolean on `public.profiles`. Evaluated on first load; permanently dismissed once completed.
- **Step 1: Daily study time goal**: Presets for 1h, 2h, 3h, 4h or custom minutes. Persisted to `public.profiles.daily_study_goal_minutes` to feed into weekly subject target analytics.
- **Step 2: POPIA notification preferences**: Explicitly unchecked opt-in checkbox for study reminders, exam countdowns, and streak alerts.
- **Step 3: Academic cockpit orientation**: 5 tactile cards introducing Timetable & Schedule, Flashcards & Active Recall, Focus Timer & Dual Zen, Friends & Study Rooms, and Daily Streaks & Freezes.

---

## 5. Pricing tiers (Feature split specification)

| Feature | Free | Standard | Pro |
|---|---|---|---|
| Timetable/Calendar | ✅ | ✅ | ✅ |
| Exam tracker | ✅ | ✅ | ✅ |
| Focus timer | ✅ | ✅ | ✅ |
| Streaks | ✅ | ✅ | ✅ |
| Flashcard decks | Limited (3 decks) | Unlimited | Unlimited |
| Friends / squads / study rooms | ❌ | ✅ | ✅ |
| Leaderboard | ❌ | ✅ | ✅ |
| Analytics (heatmap, mastery trends) | Basic | Full | Full |
| AI Flashcards creator | ❌ | ❌ | ✅ (Post-MVP) |

- **Schema implementation**: Added `tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'standard', 'pro'))` column to `public.profiles` in [`20260913_user_onboarding_timezone_tier.sql`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/supabase/migrations/20260913_user_onboarding_timezone_tier.sql).
- **Types & constants**: Exported `PricingTier` type and `PRICING_TIER_LIMITS` configuration constant in [`@flowstate/shared`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/lib/shared/src/types.ts).
- Billing, Stripe integration, and paywalls remain deferred until post-MVP per instructions.

---

## 6. Security checklist

- [x] **RLS Policy Review**: All tables audited. Courses, classes, assessments, flashcards, study sessions, and tasks strictly enforce `auth.uid() = user_id`.
- [x] **Session / Token Handling**: Singleton browser client eliminates token refresh collisions. Middleware preserves cookies on redirect.
- [x] **Rate Limiting**: Monitored at Cloudflare Worker edge; recommended on sensitive auth endpoints.
- [x] **Client Key Exposure Audit**: Confirmed zero service-role keys in client code or mobile build files. Only public anon keys (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) are bundled.
- [x] **POPIA Data Deletion**: Implemented `public.delete_user_account()` security-definer stored procedure in PostgreSQL to provide a full self-service account and data deletion path.

---

## 7. Friends page redesign (single dashboard, no tabs)

Replaced the 3-tab switcher in [`apps/web/src/app/(dashboard)/friends/page.tsx`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/web/src/app/(dashboard)/friends/page.tsx) with a single scrolling dashboard adhering to Anti-AI Slop standards:

### Layout structure
1. **Header**:
   - Title: `"Friends"`
   - Subtitle: `"Study with friends, track streaks, and see who's online."`
   - Top right CTA: `"Follow Friends"` button opening the student search & follow modal.
2. **Active Room HUD**:
   - Displayed whenever the student is inside an active co-working session.
   - Shows live countdown timer (`tnum`), room name, host, and 1-tap `"Copy Code"` button.
3. **Study Rooms Section**:
   - Section title with inline `"Join with Code"` and `"Launch Study Room"` buttons.
   - Live room cards showing host, duration, active status, and 1-tap join.
   - Clean empty state when no rooms are active: `"No active rooms found — Launch a room above or join with a 6-character squad code."`
4. **Friends Section**:
   - Lists followed friends with avatar/name, `@username`, current streak (`🔥` count), live studying status pulse, and cheer action (`Zap`).
   - Empty state when following 0 students: `"You're not following anyone yet — tap Follow Friends to find people"`.
5. **Leaderboard Section**:
   - Ranked streak list scoped to followed friends, squads, and current user.
   - Resets and compares active study streaks.

### Tactile UI Standards
- Pure White default (`#FFFFFF`) / Obsidian Dark OLED (`#000000`) dual-mode styling.
- Solid cards with 1px hairline borders (`border-zinc-200` in light, `border-zinc-800` in dark). Zero blurry frosted glassmorphism (`backdrop-blur`).
- Emil Kowalski snappy physics (`.btn-press:active { transform: scale(0.97); }`).
- Tabular numbers (`tnum`) for timers and streak counts.
- Lucide icons only. Zero emojis.

---

## 8. Mobile App Full Restructuring (Sept 2026 Core Functionality Overhaul)

Full overhaul of [`apps/mobile`](file:///C:/Users/letha/Documents/GitHub/FLOWSTATEV1/apps/mobile) addressing missing core features, navigation structure, and brand vocabulary:

1. **Brand Vocabulary & Identity Purge**:
   - Eradicated all sci-fi/military jargon ("Cockpit", "Calm", "Critical Assessments", "War Room", "Red Zone").
   - Standardized on plain student language: `"Saktus — Productivity app for students"`, `"Today's Tasks"`, `"Upcoming Assessments & Exams"`, `"Study Schedule"`.
   - Built the tactile "S" brand emblem (`width: 52, height: 52, borderRadius: 15, bg: #FFFFFF, color: #000000`).

2. **Session Gatekeeper & @username Registration**:
   - Implemented `lib/auth-context.tsx` with centralized Supabase session management, profile hydration, and sign-out.
   - Built the Expo Router root auth route guard in `app/_layout.tsx` to prevent unauthenticated empty dashboard boots, showing the tactile "S" loading splash and routing to `login.tsx`.
   - Upgraded `app/login.tsx` to include `@username` registration with real-time uniqueness validation against `public.profiles.username`.

3. **5th Tab: Profile & Settings (`app/(tabs)/profile.tsx`)**:
   - Tab layout expanded to 5 tabs: `Home | Calendar | Cards | Friends | Profile`.
   - Features student identity card (monogram avatar, name, `@username`, degree, academic tier badge).
   - Streak statistics: Current streak, longest streak, streak freezes wallet (0-3).
   - Edit Profile modal (full name, `@username`, degree, daily study goal).
   - Timezone display, POPIA account deletion, and 1-tap working Sign Out.

4. **Full 7-Day Calendar & Event Creation (`app/(tabs)/schedule.tsx`)**:
   - Replaced hardcoded 5-day strip with full 7-day calendar matrix (`Mon` through `Sun`).
   - Added visual dot indicators for days with scheduled events.
   - Added "+ Add Event" modal allowing students to log classes, exam deadlines, and study sessions directly to `timetable_classes` and `assessments`.
   - Full event deletion support.

5. **Focus Timer Target Binding & Time Worked (`app/(tabs)/timer.tsx`)**:
   - Added attachment selector: attach timer sessions directly to a **Course**, **Task**, or **Assessment / Assignment**.
   - Added live "Time Logged" HUD showing total hours/minutes previously invested in that target item.
   - Schema extended with `task_id TEXT` and `assessment_id UUID` on `public.study_sessions` with migration `20260913_study_sessions_attachments.sql`.
   - On session complete, prompts student to mark attached task as done.

6. **Mobile Flashcard & Deck Creation Engine (`app/(tabs)/cards.tsx`)**:
   - Added "+ New Deck" modal (title, course selection, description).
   - Added "+ Add Flashcard" modal (front question, back answer, rapid-fire "Save & Add Another").
   - Integrated with existing SM-2 spaced repetition review engine (`Again`, `Hard`, `Good`, `Easy`).

7. **Friends & Study Rooms Redesign (`app/(tabs)/social.tsx`)**:
   - Replaced 3-tab switcher with single scrolling dashboard.
   - Added "Launch Study Room" modal with custom room name, duration, and auto-generated 6-character squad code.
   - Added "Join with Code" modal for 1-tap room joining.
   - Added "Find Friends" search modal with real-time debounced query across student names and `@username`, with mutual follow badges.