# Saktus — Agent Build Directives
*Corrections and additions to `SAKTUS_IMPLEMENTATION_PLAN.md` v3.0.0. Feed this to Antigravity alongside the original plan — this file overrides it wherever they conflict.*

---

## 0. Naming & Design Law — non-negotiable

- Product name is **Saktus**. Everywhere. Repo, package scopes, bundle IDs, Supabase project name, env var prefixes.
- Design standard is **Apple HIG + Emil Kowalski craft, dark-mode, spring-physics** — same law as `STUDENT_OS_BLUEPRINT.md` v2.0.0 section 2.1. **Delete every reference to "visionOS Glassmorphism" in v3.0.0.** No frosted-glass panels, no generic purple/blue gradients, no `backdrop-blur` used as a personality substitute.
- Zero unicode emojis in code, copy, or UI. Lucide icons only.
- Every screen must pass: does this look intentionally designed, or does it look like 10 cards + gradient hero + huge rounded corners + generic dashboard stats? If the second, redo it.

---

## 1. Schema — corrections to the v3.0.0 migration

The v3 migration is incomplete for the features it describes in prose. Build these tables, not just `study_rooms`/`study_room_members`:

**`follows`** — one-way, not the old `friendships` two-way model:
- `follower_id`, `followee_id`, `created_at`, unique on the pair.
- A "friendship" (used for room visibility below) is derived, not stored: two rows exist, A→B and B→A.

**`squads`** / **`squad_members`** — carry over from v2.0.0 as-is (code-based join, `created_by`, membership table).

**`study_rooms`** — add pause support, the v3 schema doesn't have it:
- Replace the implicit "just use `ends_at`" model with: `duration_seconds`, `elapsed_seconds_at_pause` (default 0), `status` (`active` / `paused` / `completed`), `last_resumed_at` (nullable timestamp).
- Remaining time is *always computed*, never trusted from a stored `ends_at`: if `active`, remaining = `duration_seconds - elapsed_seconds_at_pause - (now - last_resumed_at)`; if `paused`, remaining = `duration_seconds - elapsed_seconds_at_pause`. This is the same timestamp-delta resilience principle already used correctly in the Module 4 focus timer — apply it here too.
- Sync mechanism: use **Supabase Realtime Broadcast** on a per-room channel for start/pause/resume/break events, not polling. Use **Presence** on the same channel for the live avatar stack. Do not build this on top of `postgres_changes` — too much latency for a "synchronized countdown" feel.

**Room visibility (RLS) — this is the one to get right:**
A user can `SELECT` a room if any of:
- they are the host,
- they are already a member,
- there exists a mutual follow (a row A→B **and** a row B→A) between them and the host,
- they share a squad with the host.

Write this as a policy with two `EXISTS` subqueries (mutual-follow check, shared-squad check) OR'd together — not `USING (true)`. Test it explicitly per your own checklist item #35: same tenant, non-friend, one-way-follow-only (must fail), mutual-follow (must pass), shared-squad-no-follow (must pass), stranger (must fail).

**`streaks`** table — in scope for MVP per decision below:
- `user_id`, `current_streak`, `longest_streak`, `last_active_date`, `freezes_available`, `freezes_used_total`.
- Streak-maintaining actions (25-min focus session completed OR 15 flashcards reviewed) update this via a server-side function, never a client-side increment — a client can't be trusted to report "I studied."

**`notifications`** — the v3 table is fine, but nothing populates it. Do not let the client INSERT arbitrary notification rows for itself with `type = 'social'` or `'system'`. Two ways to create notifications, pick one per event type:
- **Postgres trigger** on `follows`/`study_room_members`/`assessments` inserts a row via a `SECURITY DEFINER` function — for immediate, DB-local events (someone followed you, joined your room).
- **Supabase Edge Function on a cron schedule** — for time-based events (class in 15 min, assessment due in 3 days). This needs to query `timetable_classes` / `assessments` against `now()` on a schedule (every 5–10 min is fine), not be computed client-side.
- Client RLS should be `SELECT`/`UPDATE (read status only)`/`DELETE` for their own rows — remove `INSERT` from the "Users view and manage their own notifications" policy, or split it into separate policies per operation.

---

## 2. Auth — Google OAuth + email/password, web + mobile

**Web (Next.js):**
- `@supabase/ssr`, PKCE flow, HTTP-only cookies. Do not use the legacy `auth-helpers` package.
- Google OAuth: redirect URI registered in Google Cloud Console is Supabase's own callback (`https://<project-ref>.supabase.co/auth/v1/callback`), not the app's URL.
- Middleware calls `getUser()` on every request so expired access tokens refresh transparently and updated cookies get set on the response.
- `/auth/callback` route handler does `exchangeCodeForSession`. On failure (expired code, bad state), redirect to sign-in with a user-facing error, don't dump the raw error.
- Email/password: standard signup/login/reset. Password reset tokens must expire and be single-use — this is Supabase default behavior, don't override it.

**Mobile (Expo):**
- Session storage: `expo-secure-store` alone will fail once a real session (JWT + refresh token) exceeds ~2KB. Use a split adapter — random AES key in SecureStore, encrypted session blob in AsyncStorage. Don't discover this the hard way after a user's session includes real metadata.
- OAuth: `expo-web-browser`, `flowType: 'pkce'` on the Supabase client, `makeRedirectUri({ scheme, path })` — never a hardcoded redirect string. A `Linking` listener calls `exchangeCodeForSession(url)` when the deep link fires. Missing any one of these three leaves the user looking signed-in-but-not.
- `expo.scheme` in app config: lowercase, starts with a letter, not `http`/`https`.

**Sign-out, both platforms:** call `supabase.auth.signOut()` — this revokes the refresh token server-side. Don't build a "sign out" that just clears local storage and leaves the refresh token valid; that fails checklist item #13 outright.

---

## 3. Deploy — OpenNext, single production environment

- Use `@opennextjs/cloudflare`, not Cloudflare's default `vinext` scaffold. If `create-cloudflare` or an agent tries to auto-configure vinext, stop it — pin the OpenNext adapter manually.
- One production Cloudflare account/Worker and one production Supabase project for now — no separate staging project this phase. Structure the Wrangler config so a `[env.staging]` block can be added later without a rewrite (i.e., don't hardcode account-specific values outside of env blocks from day one), but don't build the actual staging infra yet.
- **No secret ever goes in `wrangler.toml` as a plain `vars` entry.** Local dev secrets live in `.dev.vars` (gitignored). Production secrets are pushed with `wrangler secret put`, or via CI using `cloudflare/wrangler-action`'s `secrets` input mapped from GitHub-stored secrets.
- Cloudflare API token used in CI: scope it to *Workers Scripts: Edit* only — not the global API key, not a broader template than needed. Store it as a **GitHub Environment secret** (create a `production` environment in repo settings), not a plain repo secret, and require a reviewer approval on that environment so a push to `main` can't silently deploy to prod.
- Supabase side: service-role key is a server-only secret — it goes in Worker secrets, never in `NEXT_PUBLIC_*` vars, never shipped to the client bundle. Anon key is the only Supabase key allowed client-side.
- Google OAuth client secret: server-side Supabase config only (set in the Supabase dashboard), never touches your repo or your Worker's env at all.

---

## 4. Sequencing given the 3-month clock

Given streaks stay in MVP and the social layer just grew (follow + squads + mutual-visibility RLS + realtime broadcast), that's now the largest single risk item in the plan. Recommend agent build order:
1. Schema + RLS (including the corrected study_rooms/follows/squads/notifications above) before any UI touches it.
2. Auth (both platforms) — nothing else is testable without it.
3. Cockpit + Timetable + Flashcards (Modules 1–3, already well-specified in v3.0.0, no changes needed there).
4. Focus Timer (Module 4, already correct — reuse its timestamp-delta pattern for study rooms).
5. Study Rooms + Social last — it's now the most architecturally involved piece (Realtime Broadcast/Presence, mutual-follow RLS, squads), not a bolt-on.

Do not let the agent start Module 5 UI before the RLS policies above are written and tested against the four cases listed in section 1.