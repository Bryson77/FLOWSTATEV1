# Saktus — Master System Handover & Technical Specification (A to Z)

**Repository**: `FLOWSTATEV1`  
**Brand Identity**: Saktus (`SaktusAppIcon.png` / Pure White & Pure Black OLED)  
**Target Audience**: University and tertiary students managing coursework, exams, and active recall  
**Production Status**: Ready for Cloudflare Workers, Web, and Expo EAS deployment  
**Last Updated**: September 14, 2026  

---

## Table of Contents
1. [System Overview & Architecture Principles](#1-system-overview--architecture-principles)
2. [Monorepo Structure & File-by-File Directory Guide](#2-monorepo-structure--file-by-file-directory-guide)
3. [Tech Stack, Complete Dependencies & Tooling](#3-tech-stack-complete-dependencies--tooling)
4. [Developer Commands & Workflow Scripts](#4-developer-commands--workflow-scripts)
5. [Environment Variables & Security Configuration](#5-environment-variables--security-configuration)
6. [Complete Database Schema, Tables, Constraints & Indexes](#6-complete-database-schema-tables-constraints--indexes)
7. [Row-Level Security (RLS) Policies & Database Security](#7-row-level-security-rls-policies--database-security)
8. [Spaced Repetition (SM-2) Engine & Flashcard Architecture](#8-spaced-repetition-sm-2-engine--flashcard-architecture)
9. [Streak Mechanics, Freeze Engine & Timezone Safety](#9-streak-mechanics-freeze-engine--timezone-safety)
10. [Timetable, Calendar & "Next Up" Scheduling System](#10-timetable-calendar--next-up-scheduling-system)
11. [Social System, Squads & Synchronized Study Rooms](#11-social-system-squads--synchronized-study-rooms)
12. [Cloudflare Workers, Edge Functions & Email Services](#12-cloudflare-workers-edge-functions--email-services)
13. [Design System, UI/UX Craft & Anti-AI Slop Rules](#13-design-system-uiux-craft--anti-ai-slop-rules)
14. [Mobile Application Architecture (Expo & React Native)](#14-mobile-application-architecture-expo--react-native)
15. [Web Application Architecture (Next.js 15 & React 19)](#15-web-application-architecture-nextjs-15--react-19)
16. [Input Validation, Zod Schemas & Error Masking](#16-input-validation-zod-schemas--error-masking)
17. [CI/CD Pipelines, Build Policy & Deployment Strategy](#17-cicd-pipelines-build-policy--deployment-strategy)
18. [Troubleshooting Runbook & Maintenance Reference](#18-troubleshooting-runbook--maintenance-reference)

---

## 1. System Overview & Architecture Principles

**Saktus** is an all-in-one student productivity and focus operating system designed specifically for the rigorous demands of higher education. Unlike generic enterprise task managers or bloated gamified habit apps, Saktus is engineered with mathematical rigor, high contrast, and tactile physical feedback.

### Architectural Core Principles
1. **Zero AI Slop**:
   - **No Frosted Glassmorphism**: Blurry `backdrop-blur` overlays are strictly rejected. Surfaces are solid `#FFFFFF` in light mode and `#09090B` in dark mode, bordered by crisp 1px hairline strokes (`#E4E4E7` / `#27272A`).
   - **No Neon Gradients**: Gradient-clipped text (`bg-clip-text text-transparent`) and purple-to-blue neon borders are banned.
   - **Zero Emojis**: Unicode emojis are replaced across all UI components and copy with crisp, vector Lucide icons.
   - **Pure White & Pure Black OLED**: True `#FFFFFF` default light canvas and true `#000000` pitch-black OLED canvas for maximum battery preservation and zero eye strain during late-night study sessions.
2. **Emil Kowalski Tactile Physics**:
   - Micro-spring scaling on button presses (`.btn-press:active { transform: scale(0.97); }` with `cubic-bezier(0.16, 1, 0.3, 1)`).
   - Numerical and tabular stability (`tnum` / `fontVariant: ['tabular-nums']`) for all countdown timers, intervals, and analytical metrics.
3. **Pure Separation of Concerns**:
   - Domain logic (spaced repetition, streak math, timezone resolution, validation schemas) is decoupled into standalone shared packages (`lib/study-engine`, `lib/shared`, `lib/ui`), ensuring identical algorithmic outcomes across Web and Mobile.
4. **Zero Heavy Local Builds**:
   - Heavy production compilation (`next build`, `pnpm run build`, `turbo run build`, `eas build`) is offloaded to automated GitHub Actions CI/CD runners, keeping the developer environment snappy and lightweight.

---

## 2. Monorepo Structure & File-by-File Directory Guide

The monorepo uses PNPM workspaces (`pnpm-workspace.yaml`) coordinated by Turborepo (`turbo.json`).

```
FLOWSTATEV1/
├── apps/
│   ├── mobile/                                # Universal React Native mobile client
│   │   ├── app/                               # Expo Router file-based route tree
│   │   │   ├── (tabs)/                        # Bottom Tab Navigator
│   │   │   │   ├── _layout.tsx                # Tab bar layout, tactile styling, Lucide icons
│   │   │   │   ├── index.tsx                  # Home Dashboard (Next Class, Metrics Grid, Open Cards, Tasks, Exams, Courses)
│   │   │   │   ├── schedule.tsx               # Timetable calendar & class scheduler
│   │   │   │   ├── timer.tsx                  # Focus Pomodoro & Stopwatch study timer
│   │   │   │   ├── cards.tsx                  # Flashcard decks & interactive SM-2 study session
│   │   │   │   ├── social.tsx                 # Friends list, student search, mutuals, live study rooms
│   │   │   │   └── profile.tsx                # Academic details, daily goal, streak counters, timezone
│   │   │   ├── _layout.tsx                    # Root navigation stack, fonts, splash screen, auth gate
│   │   │   └── login.tsx                      # Tactile authentication (Sign In / Register / Reset)
│   │   ├── assets/                            # Branded icons (SaktusAppIcon.png), adaptive icons, splashes
│   │   ├── lib/                               # Mobile clients & utilities
│   │   │   ├── auth-context.tsx               # React Context providing session & profile state
│   │   │   ├── errors.ts                      # Client-side user-safe error masking
│   │   │   └── supabase.ts                    # Supabase client with AsyncStorage session persistence
│   │   ├── app.json                           # Expo app manifest & mobile permissions
│   │   ├── package.json                       # Mobile workspace dependencies
│   │   └── tsconfig.json                      # Mobile TypeScript configuration
│   │
│   └── web/                                   # Next.js 15 App Router web client
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/                    # Public authentication pages
│       │   │   │   ├── login/page.tsx         # Web login with tactile credentials form
│       │   │   │   ├── register/page.tsx      # Student signup & university selection
│       │   │   │   └── forgot/page.tsx        # Password reset request
│       │   │   ├── (dashboard)/               # Authenticated application shell
│       │   │   │   ├── layout.tsx             # Master sidebar navigation, header, theme toggle
│       │   │   │   ├── loading.tsx            # Tactile skeleton loader
│       │   │   │   ├── home/page.tsx          # Web Dashboard (Schedule, Metrics HUD, Tasks, Exams, Decks, Courses)
│       │   │   │   ├── timetable/page.tsx     # Weekly interactive timetable grid
│       │   │   │   ├── flashcards/page.tsx    # Deck management, AI generation trigger, card viewer
│       │   │   │   ├── timer/page.tsx         # Full-screen focus timer with session logging
│       │   │   │   ├── exams/page.tsx         # Assessment deadlines, mark weight tracking
│       │   │   │   ├── friends/page.tsx       # Student network, squad management, study rooms
│       │   │   │   └── analytics/page.tsx     # Weekly study hours graphs, subject breakdowns
│       │   │   ├── layout.tsx                 # Root HTML document, fonts, Toast provider
│       │   │   └── page.tsx                   # Public landing page with product overview
│       │   ├── components/                    # Reusable web components
│       │   │   ├── ui/toast.tsx               # Tactile notification toast system
│       │   │   └── theme-toggle.tsx           # 1-tap pure white / OLED black theme switch
│       │   ├── lib/                           # Web utilities & Supabase clients
│       │   │   ├── supabase/                  # SSR-safe Supabase browser & server clients
│       │   │   ├── errors.ts                  # Error masking & sanitization
│       │   │   └── schemas.ts                 # Form validation schemas via Zod
│       │   └── styles/globals.css             # Tailwind CSS tokens, .btn-press, .tnum definitions
│       ├── public/                            # Static web assets (SaktusAppIcon.png, favicons, robots.txt)
│       ├── package.json                       # Web workspace dependencies
│       └── next.config.ts                     # Next.js 15 configuration
│
├── lib/
│   ├── shared/                                # Monorepo shared models & contracts
│   │   ├── src/
│   │   │   ├── database.types.ts              # Generated Supabase TypeScript database schema
│   │   │   ├── errors.ts                      # Universal getSafeErrorMessage() error masker
│   │   │   ├── schemas.ts                     # Universal Zod validation schemas
│   │   │   ├── types.ts                       # Domain types (User, Deck, Class, Task, Exam, Room)
│   │   │   └── index.ts                       # Package barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── study-engine/                          # Pure algorithmic study mathematics
│   │   ├── src/
│   │   │   ├── sm2.ts                         # SuperMemo SM-2 interval & ease factor calculation
│   │   │   ├── streaks.ts                     # Daily study streak math, freeze handling, getLocalISODate
│   │   │   └── index.ts                       # Engine barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                                    # Shared UI styling utilities
│       ├── src/
│       │   ├── utils.ts                       # cn() class merging utility (clsx + tailwind-merge)
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── worker/                                    # Cloudflare Worker for background microservices
│   ├── index.js                               # Resend transactional email handler & weekly cron dispatcher
│   └── wrangler.toml                          # Cloudflare Worker configuration & environment bindings
│
├── supabase/
│   ├── functions/                             # Supabase Edge Functions (Deno runtime)
│   │   ├── generate-deck/index.ts             # AI-powered flashcard generation edge function
│   │   └── daily-summary/index.ts             # Daily study summary digest generator
│   └── migrations/                            # Versioned SQL migration scripts
│       ├── 20260912_initial_study_os_schema.sql
│       ├── 20260913_saktus_master.sql
│       ├── 20260913_study_sessions_attachments.sql
│       ├── 20260913_user_onboarding_timezone_tier.sql
│       └── 20260914_database_integrity_and_performance.sql
│
├── email-templates/                           # Responsive, inline-styled transactional HTML email templates
│   ├── contact-template.html
│   ├── magic-link.html
│   ├── reset-password.html
│   ├── signup-confirmation.html
│   ├── squad-invite.html
│   └── weekly-summary.html
│
├── SaktusAppIcon.png                          # Primary official branded app icon (512x512)
├── package.json                               # Root workspace script runner
├── pnpm-workspace.yaml                        # Monorepo packages & catalog definitions
├── turbo.json                                 # Turborepo task pipeline configuration
├── AGENTS.md                                  # Repository development rules and constraints
├── AI SLOP PREVENTION GUIDELINE.MD            # Detailed design & anti-slop guidelines
└── handover.md                                # This document
```

---

## 3. Tech Stack, Complete Dependencies & Tooling

### Core Package Catalog (`pnpm-workspace.yaml`)
All shared dependencies are managed via PNPM's catalog system to guarantee version uniformity across every workspace:

- **React Core**: `react: 19.1.0`, `react-dom: 19.1.0`
- **Validation**: `zod: ^3.25.76`
- **Icons**: `lucide-react: ^0.545.0` (Web), `lucide-react-native: ^0.475.0` (Mobile)
- **Styling**: `tailwindcss: ^4.3.0`, `tailwind-merge: ^3.5.0`, `clsx: ^2.1.1`
- **Animation**: `framer-motion: ^12.23.24` (Web), `react-native-reanimated: ~4.6.0` (Mobile)
- **State & Data**: `@tanstack/react-query: ^5.90.21`, `@supabase/supabase-js: ^2.49.1`
- **Cloudflare Edge**: `workerd`, `wrangler: ^3.x`, `resend: ^4.0.0`

### Workspace Dependencies Matrix

| Workspace | Key Dependencies | Role |
| :--- | :--- | :--- |
| `apps/web` | Next.js 15, React 19, Lucide, Tailwind, Supabase SSR | Web frontend, server components, dashboard |
| `apps/mobile` | Expo SDK 52, Expo Router, React Native 0.86, Lucide Native, Reanimated | iOS/Android native mobile application |
| `lib/study-engine` | Zero external dependencies (Pure TypeScript) | SM-2 calculation, streaks, date safety |
| `lib/shared` | Zod, TypeScript | Shared database types, safe error sanitizer, Zod schemas |
| `lib/ui` | clsx, tailwind-merge | Styling primitives and class merging |
| `worker` | Resend | Cloudflare Workers edge emailer and cron jobs |

---

## 4. Developer Commands & Workflow Scripts

### Root Monorepo Commands
Run from repository root:

```bash
# Install all dependencies across all workspaces
pnpm install

# Start development servers in parallel (Web, Mobile, Worker)
pnpm run dev

# Fast typecheck all workspaces without running heavy local builds
pnpm --filter @saktus/study-engine typecheck
pnpm --filter @saktus/shared typecheck
pnpm --filter @saktus/api typecheck
pnpm --filter @saktus/mobile typecheck

# Code formatting & linting
pnpm run lint
```

### Individual Workspace Commands

```bash
# Start Next.js 15 Web Dashboard (http://localhost:3000)
pnpm --filter @saktus/web dev

# Start Expo Mobile App with Expo Go (Interactive Terminal QR)
pnpm --filter @saktus/mobile start

# Run Cloudflare Worker locally (http://localhost:8787)
pnpm --filter @saktus/worker dev
```

---

## 5. Environment Variables & Security Configuration

### 1. Web Application (`apps/web/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL="https://maftkhcqxhjhhmkkgmpi.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<SUPABASE_ANON_KEY>"
NEXT_PUBLIC_WORKER_URL="https://worker.saktus.com"
```

### 2. Mobile Application (`apps/mobile/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL="https://maftkhcqxhjhhmkkgmpi.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="<SUPABASE_ANON_KEY>"
```

### 3. Cloudflare Worker (`worker/wrangler.toml`)
```toml
name = "saktus-email-worker"
main = "index.js"
compatibility_date = "2024-01-01"

[triggers]
crons = ["0 9 * * 1"] # Weekly summary email: Mondays 09:00 UTC

[vars]
# Non-secret variables
```
*Secrets configured via Cloudflare Dashboard or `wrangler secret put`:*
- `RESEND_API_KEY`: API key from resend.com for sending transactional emails.
- `SUPABASE_URL`: `https://maftkhcqxhjhhmkkgmpi.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key used by background crons to aggregate weekly study hours.

---

## 6. Complete Database Schema, Tables, Constraints & Indexes

All data lives in Supabase PostgreSQL (Project ID: `maftkhcqxhjhhmkkgmpi`, Region: `eu-central-1`).

### Detailed Table Specifications

#### 1. `profiles`
Stores student accounts, university affiliations, study streaks, and study goals.
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  email text,
  full_name text,
  avatar_url text,
  university text,
  degree text,
  timezone text DEFAULT 'UTC',
  study_streak_days integer DEFAULT 0,
  longest_streak_days integer DEFAULT 0,
  last_study_date date,
  streak_freezes_available integer DEFAULT 1,
  daily_study_goal_minutes integer DEFAULT 120,
  is_studying_now boolean DEFAULT false,
  current_subject text,
  session_ends_at timestamp with time zone,
  has_completed_onboarding boolean DEFAULT false,
  email_notifications_opt_in boolean DEFAULT true,
  tier text DEFAULT 'free',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_studying_now ON public.profiles(is_studying_now) WHERE is_studying_now = true;
```

#### 2. `courses`
Academic subjects enrolled by the student.
```sql
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  color text DEFAULT '#3B82F6',
  target_hours_per_week numeric DEFAULT 6,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_courses_user ON public.courses(user_id);
```

#### 3. `timetable_classes`
Weekly recurring class schedule.
```sql
CREATE TABLE public.timetable_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Mon, 7=Sun
  start_time time NOT NULL,
  end_time time NOT NULL,
  venue text,
  class_type text DEFAULT 'Lecture',
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_timetable_user_day ON public.timetable_classes(user_id, day_of_week, start_time);
```

#### 4. `flashcard_decks` & `flashcards`
Active recall decks and card items managed by the SM-2 algorithm.
```sql
CREATE TABLE public.flashcard_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front_text text NOT NULL,
  back_text text NOT NULL,
  card_type text DEFAULT 'standard', -- 'standard', 'multiple_choice', 'true_false'
  options jsonb DEFAULT '[]',
  correct_answer text,
  repetition_number integer DEFAULT 0,
  interval_days integer DEFAULT 1,
  ease_factor numeric(4,2) DEFAULT 2.50,
  due_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_flashcards_due_user ON public.flashcards(user_id, due_date);
CREATE INDEX idx_flashcards_deck ON public.flashcards(deck_id);
```

#### 5. `tasks`
Daily action items and checklist.
```sql
CREATE TABLE public.tasks (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  text text NOT NULL,
  done boolean DEFAULT false,
  prio text DEFAULT 'normal' CHECK (prio IN ('normal', 'high', 'urgent', 'low')),
  due date,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_tasks_user_done ON public.tasks(user_id, done, created_at DESC);
```

#### 6. `assessments`
Exams, tests, and assignments with mark weights.
```sql
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date timestamp with time zone NOT NULL,
  weight_percentage numeric(5,2),
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_assessments_user_due ON public.assessments(user_id, completed, due_date ASC);
```

#### 7. `study_sessions`
Completed focus intervals for metrics and analytics.
```sql
CREATE TABLE public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  task_id text REFERENCES public.tasks(id) ON DELETE SET NULL,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  duration_seconds integer NOT NULL,
  mode text DEFAULT 'pomodoro', -- 'pomodoro', 'stopwatch'
  notes text,
  completed_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_study_sessions_user_date ON public.study_sessions(user_id, completed_at DESC);
```

#### 8. `follows` & `friendships`
Social connections between students.
```sql
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(follower_id, followee_id)
);

CREATE INDEX idx_follows_pair ON public.follows(follower_id, followee_id);
```

#### 9. `study_rooms` & `study_room_members`
Synchronized collaborative study rooms.
```sql
CREATE TABLE public.study_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  duration_seconds integer DEFAULT 1500,
  elapsed_seconds_at_pause integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  last_resumed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.study_room_members (
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT now(),
  completed boolean DEFAULT false,
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX idx_study_rooms_active ON public.study_rooms(status, code);
```

---

## 7. Row-Level Security (RLS) Policies & Database Security

Every table in Saktus has RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`). All policies use `(select auth.uid())` to enable PostgreSQL's InitPlan query optimizer.

### Core Policies Overview

```sql
-- 1. Profiles: Public can search student handles, but only owner can mutate
CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- 2. Courses & Timetable: Strict owner isolation
CREATE POLICY "Users can manage own courses"
  ON public.courses FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own timetable"
  ON public.timetable_classes FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 3. Flashcards: Personal isolation or public deck reads
CREATE POLICY "Users can read public decks or their own"
  ON public.flashcard_decks FOR SELECT
  TO authenticated
  USING (is_public = true OR (select auth.uid()) = user_id);

CREATE POLICY "Users can mutate own decks"
  ON public.flashcard_decks FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own flashcards"
  ON public.flashcards FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 4. Social & Study Rooms: Mutual visibility
CREATE POLICY "Authenticated users can read study rooms"
  ON public.study_rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hosts can create and update study rooms"
  ON public.study_rooms FOR ALL
  TO authenticated
  USING ((select auth.uid()) = host_id)
  WITH CHECK ((select auth.uid()) = host_id);

CREATE POLICY "Users can join and leave study rooms"
  ON public.study_room_members FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
```

---

## 8. Spaced Repetition (SM-2) Engine & Flashcard Architecture

Implemented in `lib/study-engine/src/sm2.ts`, Saktus implements the standardized SuperMemo-2 active recall interval algorithm.

### Mathematical Formalization

Let:
- $q \in \{0, 1, 2, 3, 4, 5\}$ be the user's recall rating.
- $n$ be the repetition number (consecutive successful reviews).
- $I_n$ be the interval in days until the next review.
- $EF$ be the ease factor (initial default: $2.50$, minimum floor: $1.30$).

#### 1. Quality Mapping from UI
The 4-button review interface maps into SM-2 quality grades:
- `again` $\rightarrow q = 0$ (Complete blackout / forgot)
- `hard` $\rightarrow q = 2$ (Incorrect recall; remembered upon seeing answer)
- `good` $\rightarrow q = 4$ (Correct recall with slight hesitation)
- `easy` $\rightarrow q = 5$ (Perfect, immediate recall)

#### 2. Interval Calculation
If $q \ge 3$ (Success):
$$I_1 = 1 \text{ day}$$
$$I_2 = 6 \text{ days}$$
$$I_n = \lceil I_{n-1} \times EF \rceil \quad (\text{for } n \ge 3)$$
$$n \leftarrow n + 1$$

If $q < 3$ (Failure):
$$I = 1 \text{ day}$$
$$n \leftarrow 0$$

#### 3. Ease Factor Update Equation
$$EF' = EF + \left(0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02)\right)$$
$$\text{Constraint: } EF' = \max(1.30, EF')$$

### Implementation (`lib/study-engine/src/sm2.ts`)
```typescript
export function calculateSM2(input: SM2Input): SM2Output {
  const quality = Math.max(0, Math.min(5, Math.round(input.quality)));
  let { repetitionNumber, intervalDays, easeFactor } = input;

  if (quality >= 3) {
    if (repetitionNumber === 0) {
      intervalDays = 1;
    } else if (repetitionNumber === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitionNumber += 1;
  } else {
    repetitionNumber = 0;
    intervalDays = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + intervalDays);

  return { repetitionNumber, intervalDays, easeFactor, dueDate };
}
```

### Review Queue Query
Cards due for review are queried using:
```typescript
supabase
  .from('flashcards')
  .select('*, flashcard_decks(title)')
  .eq('user_id', user.id)
  .lte('due_date', getLocalISODate(new Date(), userTimezone));
```

---

## 9. Streak Mechanics, Freeze Engine & Timezone Safety

Implemented in `lib/study-engine/src/streaks.ts`, Saktus ensures student study streaks survive leap years, daylight saving time shifts (23h/25h days), and international timezones.

### Timezone Date Normalization (`getLocalISODate`)
```typescript
export function getLocalISODate(date: Date = new Date(), timezone?: string): string {
  try {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}
```

### Streak Transition State Machine
- **Studied Today** ($\Delta\text{days} = 0$): Streak maintains; freezes unchanged.
- **Consecutive Day** ($\Delta\text{days} = 1$): Streak increments by $+1$. Every 7 consecutive days, the student earns $+1$ streak freeze (capped at 3 max).
- **Missed 1 Day with Freeze** ($\Delta\text{days} = 2 \land \text{freezes} > 0$): Freeze consumed ($\text{freezes} - 1$), streak increments.
- **Missed 2+ Days or No Freeze**: Streak resets to $1$ today.

---

## 10. Timetable, Calendar & "Next Up" Scheduling System

The timetable system detects upcoming commitments dynamically.

### Next Class Detection Logic
1. Reads device local time and maps to `day_of_week` ($1 = \text{Mon}, \dots, 7 = \text{Sun}$).
2. Converts current time into an ISO time string `HH:MM`.
3. Selects all records from `timetable_classes` matching today's `day_of_week` ordered by `start_time ASC`.
4. Checks for classes where `start_time >= current_time`.
5. If found, displays `NEXT CLASS` card with course code, time span, and venue.
6. If all classes today have completed, surfaces the next day's first class or confirms "No classes scheduled for today".

---

## 11. Social System, Squads & Synchronized Study Rooms

The social system fosters university accountability without the toxic algorithms of typical social media.

### 1. Follows & Mutual Friendships
- When User A follows User B, a row is inserted in `follows`.
- Mutual friendship is computed dynamically when both $(A, B) \in \text{follows}$ and $(B, A) \in \text{follows}$, unlocking direct study room invites.

### 2. Live Presence Tracking (`is_studying_now`)
- Starting a timer or study room updates `profiles`:
  ```sql
  UPDATE profiles
  SET is_studying_now = true,
      current_subject = 'Organic Chemistry',
      session_ends_at = now() + interval '25 minutes'
  WHERE id = auth.uid();
  ```
- Friends see real-time pulsing green beacons indicating active focus.

### 3. Synchronized Study Rooms
Study rooms allow multiple students to Pomodoro together.

#### Timer Synchronization Math
When a host pauses or resumes, the room state in `study_rooms` tracks:
- `duration_seconds`: Total block duration (e.g., 1500s for 25m).
- `elapsed_seconds_at_pause`: Total accumulated seconds prior to the latest pause.
- `last_resumed_at`: Timestamp when the room was most recently set to `'active'`.
- `status`: `'active' | 'paused' | 'completed'`.

When any member's client calculates remaining seconds:
```typescript
let elapsed = room.elapsed_seconds_at_pause;
if (room.status === 'active' && room.last_resumed_at) {
  const additionalSeconds = (Date.now() - new Date(room.last_resumed_at).getTime()) / 1000;
  elapsed += additionalSeconds;
}
const timeRemaining = Math.max(0, room.duration_seconds - Math.floor(elapsed));
```

#### Realtime Subscription
Clients subscribe to `postgres_changes` on table `study_rooms` filtered to `id=eq.${roomId}` for zero-latency sync. When the timer reaches 0, a completed session row is automatically appended to `study_sessions` for all participants.

---

## 12. Cloudflare Workers, Edge Functions & Email Services

### Cloudflare Worker (`worker/index.js`)
Handles contact form submissions and scheduled email digests using **Resend**:
- `POST /`: Validates name, email, and message payloads; dispatches styled HTML emails via `resend.emails.send()`.
- `scheduled()`: Cron trigger running every Monday at 09:00 UTC to distribute weekly study hours summaries.

### Supabase Edge Functions (`supabase/functions/`)
- `generate-deck`: Accepts lecture notes, text transcripts, or PDF snippets and uses LLMs to generate structured SM-2 flashcard decks with verified front/back pairs.
- `daily-summary`: Compiles today's completed study minutes, flashcard review statistics, and upcoming deadlines.

---

## 13. Design System, UI/UX Craft & Anti-AI Slop Rules

Saktus strictly implements the **Anti-AI Slop Standards** (`AI SLOP PREVENTION GUIDELINE.MD`):

### Visual Rules
- **No Glassmorphism**: Blurry frosted glass (`backdrop-blur`) is explicitly rejected.
- **Surfaces**: Solid `#FFFFFF` in light mode; `#09090B` in dark mode with 1px hairline borders (`border-zinc-200` / `border-zinc-800`).
- **Canvases**: Pure White `#FFFFFF` and Pure Black OLED `#000000`.
- **Zero Unicode Emojis**: Replaced everywhere with clean Lucide icons.
- **Tactile Physics**: Snappy button press scaling:
  ```css
  .btn-press:active {
    transform: scale(0.97);
    transition: transform 0.1s cubic-bezier(0.16, 1, 0.3, 1);
  }
  ```
- **Tabular Numerals**: Every timer, metric, countdown, and percentage uses `tnum` (`font-variant-numeric: tabular-nums`).

### Tone & Copy Standards
Saktus speaks directly to university students.
- **Tier 1 Banned Words (Kill on sight)**: `delve`, `tapestry`, `testament`, `underscore`, `supercharge`, `empower`, `elevate`, `unlock`, `harness`, `unleash`, `embark`, `endeavor`.
- **Tier 2 Avoid Words**: `robust`, `seamless`, `vibrant`, `comprehensive`, `streamline`, `transformative`, `holistic`.

---

## 14. Mobile Application Architecture (Expo & React Native)

The mobile client is built on **Expo SDK 52** and **Expo Router** (`apps/mobile`):

### Tab Hierarchy & Navigation Order
1. **Home (`(tabs)/index.tsx`)**:
   - **Header**: Official tactile emblem, personalized greeting, streak pill.
   - **Today's Schedule**: Next class details or current schedule status.
   - **Analytics & Metrics Grid (2x2)**: Study time vs daily goal progress bar, Cards due count, Upcoming deadlines count, Tasks completed ratio.
   - **Scrollable Modules**:
     - Flashcards Review Card with prominent **"Open Cards"** CTA button.
     - Today's Tasks with in-line task creation and strike-through toggle.
     - Upcoming Assessments & Exams with days-remaining urgency pills.
     - Courses & Subjects with weekly target hours.
   - **Floating Focus Timer**: Persistent quick-start bottom action bar.
2. **Schedule (`(tabs)/schedule.tsx`)**: Full weekly calendar timetable with class add modal.
3. **Timer (`(tabs)/timer.tsx`)**: Tactile Pomodoro/Stopwatch focus session screen.
4. **Cards (`(tabs)/cards.tsx`)**: Spaced repetition deck browser and interactive SM-2 study session.
5. **Social (`(tabs)/social.tsx`)**: Student search, mutual followers, study squads, and live study rooms.
6. **Profile (`(tabs)/profile.tsx`)**: University degree, study goals, streak freeze count, timezone settings.

---

## 15. Web Application Architecture (Next.js 15 & React 19)

The web dashboard is built on **Next.js 15 App Router** (`apps/web`):

### Route Architecture
- `(auth)`: Login, Register, Forgot Password.
- `(dashboard)`:
  - `home/page.tsx`: Web dashboard mirroring the mobile structure with desktop-optimized metric HUD cards, progress bars, and in-place modals.
  - `timetable/page.tsx`: Grid-based weekly calendar.
  - `flashcards/page.tsx`: Deck management, card authoring, and SM-2 player.
  - `timer/page.tsx`: Focus study timer with ambient background.
  - `exams/page.tsx`: Assessment deadlines and mark weight calculations.
  - `friends/page.tsx`: Social network, squads, live study rooms.
  - `analytics/page.tsx`: Study hours visualizations and subject breakdown charts.

---

## 16. Input Validation, Zod Schemas & Error Masking

Implemented in `lib/shared/src/schemas.ts` and `lib/shared/src/errors.ts`:

### Zod Validation Schemas
- `loginSchema`: Email validation and min 6-character password constraint.
- `signUpSchema`: Full name (1–100 chars), valid email, username alphanumeric validation (`^[a-zA-Z0-9_]+$`).
- `createClassSchema`: Start/end time in `HH:MM` format with validation ensuring `startTime < endTime`.
- `createTaskSchema`: Task text (1–300 chars), priority enum (`urgent`, `high`, `normal`, `low`).
- `createAssessmentSchema`: Title (1–150 chars), valid ISO due date, weight percentage bounded between $0$ and $100\%$.
- `createCardSchema`: Validates card types (`standard`, `true_false`, `multiple_choice`) and verifies non-empty answers.
- `createRoomSchema`: Room name (1–60 chars), duration (5–180 minutes).
- `joinRoomSchema`: Exact 6-character alphanumeric room code validation.

### User-Safe Error Sanitizer (`getSafeErrorMessage`)
Intercepts raw database errors (e.g. `duplicate key value violates unique constraint "profiles_username_key"`) and translates them into clean, friendly student messages (e.g. `"This username is already taken. Please pick another."`), ensuring database connection strings and schema internals are never exposed.

---

## 17. CI/CD Pipelines, Build Policy & Deployment Strategy

### Deployment Pipeline
- **Cloudflare Worker**: Deployed automatically via GitHub Actions upon merge to `main`.
- **Next.js Web Client**: Deployed to Cloudflare / Vercel with preview deployments on pull requests.
- **Expo Mobile App**: Built remotely via **Expo Application Services (EAS Build)** triggered by `.github/workflows/mobile-ci.yml`.

### Strict Local Resource Rule
Per repository rules (`DONOTTOUCH.MD` & `AGENTS.md`):
- **Never execute heavy production builds on the local developer PC**.
- Local validation is performed exclusively using fast, lightweight typechecks:
  ```bash
  pnpm --filter @saktus/study-engine typecheck
  pnpm --filter @saktus/shared typecheck
  pnpm --filter @saktus/api typecheck
  ```

---

## 18. Troubleshooting Runbook & Maintenance Reference

### Common Questions & Solutions

#### 1. Profile updates fail with PostgREST column missing error
- **Cause**: The `profiles` table in Supabase was missing columns (`timezone`, `has_completed_onboarding`, `daily_study_goal_minutes`, `email_notifications_opt_in`, `tier`).
- **Fix**: Run migration `20260913_user_onboarding_timezone_tier.sql` via Supabase SQL editor or MCP tool. (This has already been applied to production).

#### 2. Flashcard next review date is off by a day
- **Cause**: Using UTC dates causes timezone shift at midnight.
- **Fix**: Always use `getLocalISODate(date, userTimezone)` from `@saktus/study-engine`.

#### 3. Study room timer appears out of sync between users
- **Cause**: Local clock drift or calculating elapsed time using local countdown intervals.
- **Fix**: Calculate remaining time strictly against the database's `last_resumed_at` and `elapsed_seconds_at_pause` timestamp attributes.

---

*Handover document complete and verified against the production codebase. Saktus is fully aligned, cleanly architected, and ready for deployment.*
