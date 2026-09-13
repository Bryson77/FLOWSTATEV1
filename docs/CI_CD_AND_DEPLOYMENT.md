# Saktus CI/CD Pipelines & Edge Deployment Architecture

## 1. Overview

Saktus enforces a strict **Zero Heavy Local Builds** policy. All production builds, bundling, native compilation, and edge deployments are automated via **GitHub Actions** workflows.

---

## 2. Web Deployment Pipeline: Next.js to Cloudflare Workers

### 2.1 The OpenNext Edge Adapter
The web application is packaged for Cloudflare Workers using `@opennextjs/cloudflare` (`apps/web/open-next.config.ts`), bridging Next.js 15 App Router server components to the Cloudflare `workerd` V8 runtime.

### 2.2 CI/CD Workflow: `.github/workflows/deploy-web.yml`
1. **Trigger**: Push to `main` branch or manual `workflow_dispatch`.
2. **Environment Setup**:
   - `actions/setup-node` with Node.js 20.
   - `pnpm/action-setup` using `pnpm@11.5.2`.
3. **Pipeline Steps**:
   - `pnpm install --frozen-lockfile`
   - `pnpm turbo run typecheck` (verifies TypeScript types across the monorepo)
   - `pnpm --filter @flowstate/web build` (builds Next.js and generates OpenNext Cloudflare artifacts)
   - `cloudflare/wrangler-action` deploying `.open-next/worker.js` and static assets to Cloudflare Workers.

### 2.3 Cloudflare Runtime Configuration (`apps/web/wrangler.jsonc`)
- **Compatibility Flags**: `nodejs_compat` (enables Node.js runtime APIs inside Cloudflare Workers).
- **Static Assets**: Automatically served from Cloudflare's distributed edge cache with zero SSR execution cost.

---

## 3. Mobile Deployment Pipeline: Expo EAS

### 3.1 Expo SDK 52 & EAS Workflows (`.github/workflows/deploy-mobile.yml`)
1. **Trigger**: Git tags (e.g. `v*.*.*`) or manual trigger.
2. **Toolchain**: EAS CLI (`eas-cli`) via `expo/expo-github-action`.
3. **Build Target**: Remote Expo Cloud servers compile Android APK / AAB and iOS IPA without consuming any local PC resources.

---

## 4. Environment Secrets & Access Controls

Secrets are stored securely in **GitHub Repository Secrets** and injected strictly at deploy-time:

| Secret Name | Scope | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Web Deploy | Scoped strictly to `Workers Scripts: Edit`. |
| `CLOUDFLARE_ACCOUNT_ID` | Web Deploy | Cloudflare account identifier. |
| `NEXT_PUBLIC_SUPABASE_URL` | Web & Mobile | Supabase project API endpoint. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web & Mobile | Public client anonymous key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Edge | Protected service role key (strictly server-side). |
| `EXPO_TOKEN` | Mobile Deploy | Expo authentication token for remote EAS builds. |

---

## 5. Branching & Release Strategy

- **`main`**: Production-ready branch. Every merged PR triggers automatic testing and edge deployment.
- **`WorkingBranch`**: Active development branch for feature staging and review.
