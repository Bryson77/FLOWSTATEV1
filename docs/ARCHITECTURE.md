# Saktus Academic OS — System Architecture & Monorepo Topology

## 1. Executive Overview

**Saktus** is an opinionated, calm academic operating system designed for university students. It unifies timetable matrices, assessment countdowns, SuperMemo-2 (SM-2) spaced repetition flashcards, a delta-resilient procedural focus timer, and synchronized study rooms into a cohesive ecosystem with 1:1 parity between Web and Mobile clients.

---

## 2. Technical Stack & Invariants

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SAKTUS PLATFORM                               │
├────────────────────────────────────┬────────────────────────────────────┤
│           Web Cockpit              │             Mobile App             │
│   Next.js 15.2 (App Router)        │           Expo SDK 52              │
│   Tailwind CSS v4 + Motion         │      React Native Reanimated       │
│   Cloudflare Workers (OpenNext)    │         Expo Router v4             │
├────────────────────────────────────┴────────────────────────────────────┤
│                       Core Libraries (lib/*)                            │
│  @flowstate/shared       @flowstate/study-engine      @flowstate/ui     │
│  (Zod & Types)           (SM-2 Algorithm & Stats)     (Design Tokens)   │
├─────────────────────────────────────────────────────────────────────────┤
│                    Edge & Database Infrastructure                       │
│    Supabase Managed PostgreSQL (14 Tables · Row Level Security RLS)     │
│    Supabase Realtime Broadcast & Presence (Synchronized Study Rooms)    │
│    Cloudflare Workers Edge Network (Static & SSR compute)               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Technologies
- **Monorepo Engine**: `pnpm@11.5.2` workspaces + `turbo@2.9.18`.
- **Web Runtime**: Next.js 15.2.0 deployed to **Cloudflare Workers** using `@opennextjs/cloudflare`.
- **Mobile Runtime**: Expo SDK 52 with Expo Router file-system routing and React Native Reanimated.
- **Backend / DB**: Supabase PostgreSQL 15+ with Row Level Security (RLS) and Realtime WebSocket Engine.
- **Design System**: Apple Human Interface Guidelines + Emil Kowalski interaction physics. Solid tactile surfaces (`#FFFFFF` light mode, `#000000` dark mode).

---

## 3. Monorepo Directory Topology

```
FLOWSTATEV1/
├── apps/
│   ├── web/                     # Next.js 15 OpenNext Cloudflare Web Cockpit
│   │   ├── src/
│   │   │   ├── app/             # App Router pages ((auth), (dashboard), landing)
│   │   │   ├── components/      # Navigation (sidebar, bottom-nav), ThemeToggle, Toast
│   │   │   └── lib/             # Supabase SSR client, utilities
│   │   ├── open-next.config.ts  # OpenNext Cloudflare adapter configuration
│   │   └── wrangler.jsonc       # Cloudflare Workers configuration
│   ├── mobile/                  # Expo SDK 52 iOS & Android Client
│   │   ├── app/                 # Expo Router file-based screens ((tabs), login)
│   │   └── app.json             # Mobile app manifest & deep linking scheme
│   └── api/                     # Cloudflare Worker API edge service
├── lib/
│   ├── shared/                  # Shared TypeScript interfaces, types & Zod schemas
│   ├── study-engine/            # SM-2 SRS spaced repetition calculation engine
│   └── ui/                      # Shared component styles and motion constants
├── supabase/
│   └── migrations/              # Production PostgreSQL schema and RLS policies
├── docs/                        # System architecture specifications
├── .agents/                     # Antigravity agent skills and always-on rules
│   ├── rules/                   # anti-ai-slop.md rule
│   └── skills/                  # emil-kowalski, uiuxpromax, apple-design-system
├── DONOTTOUCH.MD                # Critical build directives & zero local build law
├── AGENTS.md                    # Agent behavioral laws
├── AI SLOP PREVENTION GUIDELINE.MD
├── pnpm-workspace.yaml          # Monorepo catalog definitions
└── turbo.json                   # Pipeline task dependencies
```

---

## 4. Architectural Principles

1. **Web & Mobile 1:1 Parity**:
   - Any business logic or feature present on Web (Assessment HUD, Timetable matrix, Flashcard CRUD, Study Rooms) is natively supported on Mobile, and vice versa.
2. **Delta-Resilient Timing**:
   - Time calculations never rely on active JS timer intervals (`setInterval`). Timers compute remaining duration using stored timestamp targets:
     `remaining = target_end_timestamp - Date.now()`
   - Sessions survive browser tab suspension, phone lock screens, backgrounding, and reloads.
3. **Pure White Default / Pure Black OLED Dual Mode**:
   - Default theme is luminous pure white (`#FFFFFF`) with crisp near-black typography (`#09090B`).
   - Pure black OLED mode (`#000000`) is accessible via a tactile 1-tap `ThemeToggle`.
   - In Zen Focus mode, users can switch between **White Paper** and **Obsidian Dark**.
4. **Anti-AI Slop Standards**:
   - Zero frosted glassmorphism blur (`backdrop-blur`).
   - Zero purple-to-blue gradients or neon glowing borders.
   - Zero unicode emojis; strictly Lucide SVG icons.
   - Grounded, plain English written for university students.
