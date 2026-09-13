# Saktus Development & Build Protocol — DO NOT TOUCH

> **CRITICAL DEVELOPER DIRECTIVE**: This document defines the non-negotiable operational invariants, CI/CD build processes, architectural guardrails, and prohibited operations across the Saktus repository (`FLOWSTATEV1`). Every human contributor and AI agent must adhere strictly to these rules.

---

## 1. Zero Heavy Local Builds Policy

### ⚠️ RULE #1: NEVER RUN HEAVY BUILDS LOCALLY
The developer machine is strictly for editing code, managing git, and running lightweight dev servers. 
- **PROHIBITED COMMANDS ON LOCAL MACHINE**:
  - `pnpm run build` / `turbo run build`
  - `next build` / `opennextjs-cloudflare build`
  - `eas build` (local native compilation)
  - `wrangler deploy` (production deployments run via GitHub Actions)
- **WHY**: Local PC hardware must not be saturated or throttled by heavy multi-gigabyte builds, native compiler toolchains, or worker bundle serialization.
- **WHERE BUILDS OCCUR**:
  - Web Application: Cloudflare Workers build and deployment pipeline runs entirely in **GitHub Actions** (`.github/workflows/deploy-web.yml`).
  - Mobile Application: Expo EAS Build runs entirely in **Expo Cloud Infrastructure** triggered by GitHub Actions (`.github/workflows/deploy-mobile.yml`).
  - CI Checks: Typechecking and linting run within GitHub Actions test runners.

---

## 2. Monorepo Package Management & Dependency Protocol

- **Package Manager**: Strictly `pnpm@11.5.2`. Never execute `npm install` or `yarn`.
- **Catalogs**: Shared dependencies (`react`, `react-dom`, `framer-motion`, `lucide-react`, `tailwindcss`, `zod`, `@tanstack/react-query`) are declared in `pnpm-workspace.yaml` under `catalog:`.
  - In workspace `package.json` files, depend on them via `"catalog:"`.
- **Workspace Packages**: Internal packages (`@flowstate/shared`, `@flowstate/study-engine`, `@flowstate/ui`) are referenced via `"workspace:*"`.
- **Locked Versions**:
  - React: `19.1.0` (pinned via `overrides` in `pnpm-workspace.yaml`).
  - Next.js: `15.2.0` (OpenNext Cloudflare Worker compatible).
  - Expo: SDK 52.

---

## 3. Anti-AI Slop & Visual Design Law

All code and UI components must observe the guidelines defined in `AI SLOP PREVENTION GUIDELINE.MD` and `AGENTS.md`:

1. **No Glassmorphism**:
   - Explicitly rejected: Blurry frosted surfaces (`backdrop-blur`) as a personality substitute.
   - Required: Clean, solid tactile cards (`#FFFFFF` in light mode, `#09090B` in dark mode) with 1px hairline borders (`border-zinc-200` / `border-zinc-800`).
2. **No Purple/Blue Gradients or Neon Glows**:
   - Never use `from-purple-500 to-blue-500` or neon cyan/violet glowing card borders.
3. **Pure White Default / Pure Black OLED**:
   - Default theme is Luminous Pure White (`#FFFFFF`).
   - Dark mode is Pure Black OLED (`#000000`).
   - Switching is handled by the tactile 1-tap `ThemeToggle` component.
4. **Zero Unicode Emojis**:
   - Strictly Lucide SVG icons (`lucide-react` on Web, `lucide-react-native` on Mobile).
   - Zero emojis in UI, copy, buttons, badges, or notifications.
5. **Emil Kowalski Tactile Physics**:
   - Active press states must use `.btn-press:active { transform: scale(0.97); }` with `cubic-bezier(0.16, 1, 0.3, 1)`.
   - All timers, metrics, and countdowns must use tabular numbers (`tnum` / `font-variant-numeric: tabular-nums`).
6. **Student-Grounded Tone**:
   - Zero generic marketing SaaS fluff. Kill Tier 1 words on sight (`delve`, `tapestry`, `unlock`, `supercharge`, `empower`, `elevate`, `journey`).

---

## 4. Database & Remote Migration Protocol

- **Database Provider**: Supabase Managed PostgreSQL.
- **Migration Location**: All schema changes must be committed as numbered SQL files in `supabase/migrations/`.
- **Zero Destructive Alterations**:
  - Never drop tables or columns with active user data in production.
  - Always use `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS`.
- **Row Level Security (RLS)**:
  - Every single table MUST have `ENABLE ROW LEVEL SECURITY`.
  - Never use insecure `USING (true)` policies for private tenant data.
  - Study room visibility must check mutual follows (`EXISTS` in `follows` table both directions) or shared squads, never public `USING (true)`.
  - Notifications must be inserted by server-side DB triggers or Edge Functions via `SECURITY DEFINER`, never client-side arbitrary inserts.

---

## 5. Security & Secrets Management

- **No Secrets in Git**:
  - Never place service-role keys, database passwords, or OAuth client secrets in any tracked file.
  - `.dev.vars` and `.env.local` are strictly gitignored.
- **Client vs Server Key Boundary**:
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Safe for public client bundle.
  - `SUPABASE_SERVICE_ROLE_KEY`: Strictly server-side; configured as an encrypted secret in Cloudflare Workers and GitHub Actions Secrets.

---

## 6. Protected Architecture & Files

Do not delete, move, or destructively rewrite these architectural anchor files without explicit directive:
- `pnpm-workspace.yaml` (workspace topology and catalog definitions)
- `pnpm-lock.yaml` (deterministic dependency lock)
- `turbo.json` (pipeline cache and dependency DAG)
- `apps/web/open-next.config.ts` (Cloudflare Workers compilation configuration)
- `apps/web/wrangler.jsonc` (Cloudflare Workers runtime bindings)
- `apps/mobile/app.json` (Expo SDK 52 application configuration and scheme)
- `lib/study-engine/src/index.ts` (SuperMemo-2 SRS core algorithm)
- `AGENTS.md` & `.agents/rules/anti-ai-slop.md` (Agent behavioral laws)
