# Saktus Social Study, Copy & Design System V2

**Document Status:** Production Engineering & Design Specification  
**Target Systems:** Saktus Web (`apps/web`), Saktus Mobile (`apps/mobile`), Shared Core (`lib/shared`)  
**Backend Infrastructure:** Supabase PostgreSQL (`tyvwwgigdgcnpjceiavq`), Realtime Channels  
**Design Foundations:** Anti-AI Slop Standards, Apple Human Interface Guidelines, Emil Kowalski Tactile Interaction Craft, UI/UX Pro Max Engineering System  
**Last Updated:** October 2026  

---

## 1. Executive Summary & Design Philosophy

Saktus is a focused academic operating system built for university students navigating rigorous coursework. It replaces fragmented workflows (disjointed calendars, flashcard apps, focus timers, and group chats) with a single, cohesive academic workspace.

### 1.1 Core Tenets

1. **Anti-AI Slop Guarantee:**
   - **No Glassmorphism:** Blurry frosted glass (`backdrop-blur`) is completely eliminated. Surfaces are crisp, solid cards (`#FFFFFF` in light mode, `#09090B` in dark mode) defined by subtle 1px hairline borders (`rgba(0, 0, 0, 0.08)` / `rgba(255, 255, 255, 0.08)`).
   - **No Rainbow or Neon Gradients:** Zero purple-to-blue gradients, gradient-clipped headline text (`bg-clip-text text-transparent`), or neon card borders.
   - **Pure White Default / Pure Black OLED Dual-Mode:** Light mode is pure white (`#FFFFFF`); dark mode is pitch black (`#000000`). Both modes are first-class, supported by an instant, tactile 1-tap theme toggle.
   - **Zero Unicode Emojis:** System copy, notifications, badges, and action triggers strictly use Lucide SVG icons (`lucide-react` on web, `lucide-react-native` on mobile). Emojis are never used in UI chrome.

2. **Tactile Interaction Physics (Emil Kowalski Craft):**
   - **Spring Physics Over Robotic Curves:** Natural movement decelerates with momentum using calibrated cubic-bezier curves (`cubic-bezier(0.16, 1, 0.3, 1)` and `cubic-bezier(0.2, 0, 0, 1)`).
   - **Immediate Sensory Press States:** Every button and interactive card depresses on press (`.btn-press:active { transform: scale(0.97); }`) before asynchronous network requests complete.
   - **Tabular Stability (`tnum`):** Timers, streak counts, study metrics, and countdown clocks use tabular numbers to eliminate layout wobble and number jumping.

3. **Restrained Social Accountability (Zero Distraction):**
   - The social layer solves exactly two problems:
     1. *Who is studying right now?*
     2. *Can we jump into a synchronized focus block together?*
   - Zero open-ended textual chat feeds. Accountability is driven through live presence, synchronized countdown timers, mutual-friend study rooms, and zero-text tactile reaction cheers (`Zap`, `Flame`, `Coffee`, `ThumbsUp`).

---

## 2. Design System V2: Color, Typography & Spatial Foundation

### 2.1 Dual-Theme Color Palette

Saktus enforces high-contrast, tactile solid surfaces with zero blurry glassmorphism crutches.

| Semantic Token | Light Mode (`#FFFFFF` Canvas) | Dark Mode (`#000000` Canvas) | Purpose |
|---|---|---|---|
| `bg-base` | `#FFFFFF` (Pure White) | `#000000` (OLED Pure Black) | Primary canvas |
| `bg-surface` | `#FFFFFF` (Solid Card) | `#09090B` (Solid Zinc Surface) | Default cards, list tiles |
| `bg-elevated` | `#F4F4F5` (Soft Zinc) | `#121215` (Elevated Zinc) | Popovers, dropdown menus, modals |
| `bg-subtle` | `#FAFAFA` (Porcelain) | `#18181B` (Zinc 900) | Inactive tracks, secondary badges |
| `border-subtle` | `rgba(0, 0, 0, 0.08)` / `#E4E4E7` | `rgba(255, 255, 255, 0.08)` / `#27272A` | 1px hairline card borders |
| `border-strong` | `rgba(0, 0, 0, 0.16)` / `#D4D4D8` | `rgba(255, 255, 255, 0.16)` / `#3F3F46` | Focused inputs, active pills |
| `text-primary` | `#09090B` (Near Black, WCAG AAA) | `#FFFFFF` (Pure White, WCAG AAA) | Headlines, primary data |
| `text-secondary` | `#52525B` (Zinc 600) | `#A1A1AA` (Zinc 400) | Subheadings, section captions |
| `text-muted` | `#71717A` (Zinc 500) | `#71717A` (Zinc 500) | Timestamps, metadata, placeholders |
| `accent-emerald` | `#059669` (Light Emerald) | `#10B981` (Vibrant Emerald) | Active study states, streak fires |
| `accent-amber` | `#D97706` (Light Amber) | `#F59E0B` (Vibrant Amber) | Approaching deadlines, break states |
| `accent-rose` | `#DC2626` (Light Crimson) | `#EF4444` (Vibrant Red) | Overdue exams, destructive actions |
| `accent-blue` | `#2563EB` (Cobalt Blue) | `#3B82F6` (Electric Blue) | Course accents, focused primary buttons |

### 2.2 Typography Hierarchy & Optical Spacing

The font stack prioritizes native platform typography with high legibility.

```css
/* Web Typography Stack */
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;

/* Monospace Stack for Numbers, Timers, Course Codes */
font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
font-feature-settings: 'tnum' 1, 'zero' 1;
```

#### Scale & Letter-Spacing Standards

| Level | Size | Weight | Line Height | Tracking | Usage |
|---|---|---|---|---|---|
| **Display** | `2.25rem` (36px) – `3rem` (48px) | 700 / Bold | 1.15 | `-0.035em` | Hero titles, landing page anchors |
| **Title 1** | `1.5rem` (24px) – `1.875rem` (30px) | 700 / Bold | 1.25 | `-0.025em` | Main dashboard & room headers |
| **Title 2** | `1.125rem` (18px) – `1.25rem` (20px) | 600 / Semibold | 1.35 | `-0.02em` | Card titles, section headers |
| **Body** | `0.875rem` (14px) – `1rem` (16px) | 400 / Regular | 1.55 | `-0.01em` | Standard descriptions, study logs |
| **Callout** | `0.8125rem` (13px) | 500 / Medium | 1.40 | `0` | Form labels, helper text |
| **Caption** | `0.6875rem` (11px) – `0.75rem` (12px) | 600 / Semibold | 1.30 | `+0.04em` | Status pills, subject badges (Uppercase) |
| **Mono Timer** | `2rem` (32px) – `3.5rem` (56px) | 600 / Medium | 1.00 | `-0.02em` | Active countdown (`tnum` mandatory) |

### 2.3 Motion Tokens & Emil Kowalski Spring Mechanics

Transitions use snappy spring curves that feel physical, tactile, and intentional.

```css
:root {
  /* Snappy button presses and immediate triggers */
  --ease-spring: cubic-bezier(0.2, 0, 0, 1);

  /* Fluid deceleration for modal slide-ins and drawers */
  --ease-apple-out: cubic-bezier(0.16, 1, 0.3, 1);

  /* Sheet and bottom drawer physics (Vaul style) */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}

/* Global tactile button feedback */
.btn-press {
  transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1),
              background-color 150ms ease,
              border-color 150ms ease;
  will-change: transform;
}

.btn-press:active {
  transform: scale(0.97);
}

/* Tabular numerals for jitter-free counters */
.tnum {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}
```

#### React Native Reanimated Spring Config (Mobile)

```typescript
export const SPRING_PRESETS = {
  tactilePress: {
    damping: 18,
    stiffness: 350,
    mass: 0.6,
  },
  modalSlide: {
    damping: 24,
    stiffness: 220,
    mass: 0.8,
  },
  counterTick: {
    damping: 15,
    stiffness: 400,
    mass: 0.4,
  },
};
```

---

## 3. Platform Copy & Anti-AI Slop Rules

Saktus is built for university students studying real coursework, not generic enterprise SaaS. All copy across web and mobile is held to the following standards.

### 3.1 Tier 1 Kill-On-Sight Banned Words (Never Ship in Saktus)

The following words and expressions are strictly prohibited across all code, marketing copy, tooltips, buttons, and error messages:

| Banned Tier 1 Word | Why It Fails | Permitted Saktus Replacement |
|---|---|---|
| `delve` | Academic pretension | "Explore", "open", "read" |
| `tapestry` | Empty metaphor | "Overview", "system", "all together" |
| `testament` | Hyperbolic filler | State the concrete metric directly |
| `underscore` | Academic buzzword | "Highlights", "shows", "indicates" |
| `showcase` | Sales fluff | "Displays", "shows", "lists" |
| `meticulous` / `intricate` | Unearned self-praise | Describe what the feature actually does |
| `realm` / `landscape` | AI fantasy metaphor | "App", "space", "workspace" |
| `journey` | Life coaching cliché | "Semester", "coursework", "progress" |
| `synergy` / `foster` | Corporate committee jargon | State the mechanic plainly |
| `embark` / `endeavor` | Victorian fiction tone | "Start", "begin", "create" |
| `groundbreaking` / `game-changer` | Overhyped marketing claim | Explain the time saved |
| `treasure trove` / `beacon` | Fairy-tale cliché | "Collection", "library", "deck" |
| `unlock` / `harness` | Video game marketing | "Access", "use", "view" |
| `elevate` / `supercharge` | Tech brochure cliché | "Improve", "increase", "speed up" |
| `empower` / `unleash` | Patronizing tech filler | "Lets you", "allows you to" |

### 3.2 Tier 2 Banned Marketing & UI Phrases

- `robust`, `seamless`, `vibrant`, `comprehensive`, `streamline`, `transformative`, `cutting-edge`.
- "In today's fast-paced world..."
- "Whether you're studying late or rising early..."
- "Not just an app, it's..."
- "No fluff, just results"
- Fake social proof ("Trusted by 10,000+ students")
- Em dash overuse (use standard commas, periods, or split into two sentences)

### 3.3 Core Voice Principles

1. **State the mechanic, not the emotion:**  
   - *Bad:* "Feel the satisfaction of flow as you conquer your academic journey."  
   - *Good:* "Logs each study block to your course total."
2. **No contrastive reframes:**  
   - *Bad:* "It's not just a timer, it's a focus companion."  
   - *Good:* "A synchronized countdown timer for group study."
3. **The Delete Test:**  
   - Read the sentence. Cut the first two words. If the sentence still communicates the exact same information, permanently cut those words.
4. **Vary sentence length naturally:**  
   - Avoid monotonous cadence. Mix short declarative statements with functional instructions.

---

## 4. Social Study Architecture & Realtime Engine

Saktus replaces noisy social feeds with focused co-working presence.

```
┌────────────────────────────────────────────────────────┐
│                   SAKTUS SOCIAL LAYER                  │
├──────────────────────────┬─────────────────────────────┤
│ 1. Asymmetric Follow     │ 2. Derived Mutual Circle    │
│    Graph (Zero Pending)  │    (A → B ∧ B → A)          │
├──────────────────────────┼─────────────────────────────┤
│ 3. Study Rooms           │ 4. Delta-Resilient Clock    │
│    (Broadcast + Presence)│    (Pause/Resume Math)      │
├──────────────────────────┼─────────────────────────────┤
│ 5. Haptic Cheers         │ 6. Privacy & POPIA Shield   │
│    (Zero-Chat Badges)    │    (Strict Data Isolation)  │
└──────────────────────────┴─────────────────────────────┘
```

### 4.1 Follow Graph & Derived Mutual Circle

Instead of bidirectional "friend requests" with pending approval states, Saktus implements an asynchronous **one-way follow model**:

- **Database Table:** `public.follows (follower_id UUID, followee_id UUID, created_at TIMESTAMPTZ)`
- **Derived Mutual Friend Formula:**
  $$\text{IsMutual}(A, B) \iff (A \to B \in \text{follows}) \land (B \to A \in \text{follows})$$
- **Privacy Boundary:**  
  Only mutual friends can view private study room codes or receive direct co-study notifications. Non-mutual follows can view public study activity streaks only if profile privacy is set to public.

### 4.2 Synchronized Study Rooms Architecture

A study room synchronizes 2 to 20 students in a single focus sprint (Pomodoro or custom blocks).

#### Realtime Communication Protocol

```
Host Client                     Supabase Realtime Channel                     Member Client
     │                                     │                                        │
     ├── 1. Broadcast: 'room_start' ──────►│── Broadcast: 'room_start' ────────────►│
     │   payload: { last_resumed_at }      │   payload: { last_resumed_at }         │ (Sync Clocks)
     │                                     │                                        │
     ├── 2. Broadcast: 'room_pause' ──────►│── Broadcast: 'room_pause' ────────────►│
     │   payload: { elapsed_seconds }      │   payload: { elapsed_seconds }         │ (Freeze Clocks)
     │                                     │                                        │
     ├── 3. Broadcast: 'cheer' ───────────►│── Broadcast: 'cheer' ─────────────────►│
     │   payload: { icon, sender_name }    │   payload: { icon, sender_name }       │ (Render Haptic)
     │                                     │                                        │
     ├── 4. Track Presence ───────────────►│── Presence Sync: Avatar Stack ────────►│
```

- **Broadcast Over Database Polling:**  
  Timer play/pause events and cheers transmit over Supabase Realtime Broadcast (`channel.send({ type: 'broadcast', event: '...' })`). Broadcast has sub-50ms latency worldwide and zero database disk writes.
- **Presence Tracking:**  
  Realtime Presence synchronizes active participant avatar stacks, degree info, and current subject focus.

### 4.3 Delta-Resilient Clock Math (Handling Pauses Accurately)

Static `ends_at` timestamps break whenever a study room pauses. Saktus stores time invariants and computes remaining time dynamically on every client tick:

```typescript
interface StudyRoomClockState {
  durationSeconds: number;         // Total planned duration (e.g. 1500 for 25m)
  elapsedSecondsAtPause: number;   // Cumulative seconds elapsed before current run
  lastResumedAt: string | null;    // ISO timestamp when current run started
  status: 'active' | 'paused' | 'completed';
}

export function calculateRemainingSeconds(state: StudyRoomClockState): number {
  if (state.status === 'completed') return 0;

  if (state.status === 'paused' || !state.lastResumedAt) {
    const remaining = state.durationSeconds - state.elapsedSecondsAtPause;
    return Math.max(0, remaining);
  }

  // Active state: calculate elapsed delta against local clock
  const nowMs = Date.now();
  const resumedMs = new Date(state.lastResumedAt).getTime();
  const currentRunSeconds = Math.max(0, Math.floor((nowMs - resumedMs) / 1000));
  const totalElapsed = state.elapsedSecondsAtPause + currentRunSeconds;
  const remaining = state.durationSeconds - totalElapsed;

  return Math.max(0, remaining);
}
```

### 4.4 Haptic Cheers: Zero-Chat Accountability

During active study blocks, textual chat invites procrastination. Saktus replaces chat with **Haptic Cheers**:

1. **Cheer Triggers (Pure Lucide Icons):**
   - `Zap` &mdash; "Energy / Lock In"
   - `Flame` &mdash; "Streak on Fire"
   - `Coffee` &mdash; "Break Time Soon"
   - `ThumbsUp` &mdash; "Solid Work"
2. **Animation & Sensory Feedback:**
   - On tap, the sender's device triggers a light haptic tap (`Haptics.impactAsync(ImpactFeedbackStyle.Light)` on mobile).
   - The event broadcasts to all room members.
   - A floating pill appears over the sender's avatar, floats upward 40px, and fades out over 1.2 seconds using `--ease-apple-out`.
   - Receiving devices execute a subtle sensory vibration.

---

## 5. UI Component Specifications & Design Tokens

### 5.1 Dynamic Presence Avatar Stack

Displays students currently studying in a room or active on the platform.

```tsx
// React (Web) Component Specification
import React from 'react';
import { Radio } from 'lucide-react';

interface AvatarItem {
  id: string;
  name: string;
  avatarUrl?: string;
  isStudying: boolean;
  subject?: string;
}

export function PresenceAvatarStack({ members }: { members: AvatarItem[] }) {
  const visible = members.slice(0, 5);
  const remaining = members.length - visible.length;

  return (
    <div className="flex items-center -space-x-2 overflow-hidden">
      {visible.map((m) => (
        <div key={m.id} className="relative group inline-block">
          <div className="h-8 w-8 rounded-full border-2 border-white dark:border-black bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-900 dark:text-white overflow-hidden shadow-xs">
            {m.avatarUrl ? (
              <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
            ) : (
              m.name.charAt(0).toUpperCase()
            )}
          </div>
          {m.isStudying && (
            <span
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black"
              title={`Studying: ${m.subject || 'Focus'}`}
            />
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="h-8 w-8 rounded-full border-2 border-white dark:border-black bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
          +{remaining}
        </div>
      )}
    </div>
  );
}
```

### 5.2 Segmented Control (Apple HIG Specification)

Tabbed filters (e.g. `All Students`, `Mutual Friends`, `Active Rooms`) use a solid tactile track with an elevated sliding pill.

- **Track Container:** `bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1 border border-zinc-200/60 dark:border-zinc-800/60`
- **Active Pill:** `bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg shadow-xs font-semibold`
- **Inactive Pill:** `text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-900 dark:hover:text-white`
- **Motion:** Spring transition `transform 160ms cubic-bezier(0.16, 1, 0.3, 1)`

### 5.3 Live Study Room Card

```tsx
// Live Study Room Card (Tactile Solid Surface)
import React from 'react';
import { Users, Clock, ArrowRight } from 'lucide-react';

interface RoomCardProps {
  name: string;
  hostName: string;
  durationMinutes: number;
  activeCount: number;
  onJoin: () => void;
}

export function StudyRoomCard({
  name,
  hostName,
  durationMinutes,
  activeCount,
  onJoin,
}: RoomCardProps) {
  return (
    <div className="btn-press rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-5 shadow-xs transition-colors duration-150">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sprint
          </div>
          <h3 className="font-semibold text-base text-zinc-900 dark:text-white tracking-tight">
            {name}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Hosted by {hostName}
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs font-mono font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span className="tnum">{durationMinutes}m</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Users className="w-3.5 h-3.5 text-zinc-400" />
          <span className="tnum font-medium">{activeCount} studying</span>
        </div>

        <button
          type="button"
          onClick={onJoin}
          className="btn-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black shadow-xs cursor-pointer"
        >
          <span>Join Sprint</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
```

---

## 6. Micro-Copy Matrix: Social & Study Room States

Every screen state must have precise, student-grounded copy that explains the mechanic cleanly.

| Scenario | Component / Context | Anti-AI Slop Compliant Copy |
|---|---|---|
| **Empty Social State** | Friends tab when following 0 students | **Heading:** "No students followed yet."<br>**Body:** "Follow classmates from your course to view their active study sessions and join co-working sprints."<br>**Action:** "Find Classmates" |
| **Empty Rooms State** | Study rooms feed when no rooms are active | **Heading:** "No active study sprints."<br>**Body:** "Start a synchronized sprint or share a 6-digit room code with classmates."<br>**Action:** "Create Sprint" |
| **Room Code Modal** | Join room input modal | **Label:** "Enter 6-digit sprint code"<br>**Placeholder:** "e.g. 849-201"<br>**Helper:** "Room codes are shared directly by the sprint host." |
| **Streak Milestone** | Student completes 7-day streak | **Title:** "7-day study streak"<br>**Body:** "You earned +1 streak freeze. Total available freezes: 2/3." |
| **Streak Broken** | Student missed 2 days without freeze | **Title:** "Streak reset"<br>**Body:** "Starting fresh today. Complete a 25-minute session to begin a new streak." |
| **Active Cheer Sent** | User taps `Zap` reaction icon | **Toast / Micro-HUD:** "Cheered bryson with energy." (Subtle 800ms pill) |
| **Room Completed** | Countdown reaches 00:00 | **Heading:** "Focus sprint complete."<br>**Body:** "25 minutes logged to your course total. Take a 5-minute break."<br>**Action:** "Leave Room" / "Log Break" |

---

## 7. Implementation Checklist & Verification Standards

To guarantee compliance with this specification:

- [ ] **Dual-Mode Contrast Validation:** Light mode verified at pure `#FFFFFF` background; dark mode verified at pure `#000000` with solid cards (`#09090B`).
- [ ] **No Glassmorphism:** All instances of `backdrop-blur` in social and study room components eliminated.
- [ ] **Tabular Numerals (`tnum`):** All timers, seconds displays, and metrics wrapped with tabular figure styling.
- [ ] **Anti-AI Slop Copy Check:** Zero Tier 1 buzzwords present in `apps/web/src/app/(dashboard)/friends/page.tsx` and `apps/mobile/app/(tabs)/social.tsx`.
- [ ] **Realtime Latency Test:** Study room timer start/pause broadcast sync verified under 100ms between browser and mobile client.
- [ ] **Mutual Friend Guard:** Private room codes masked from users unless mutual follow condition ($A \to B \land B \to A$) is satisfied.
- [ ] **Haptic Cheer Delivery:** Cheer reactions trigger sensory haptic feedback on mobile without generating database rows.
