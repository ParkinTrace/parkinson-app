# Landing page and first-time onboarding flow — design

Date: 2026-10-16
Status: approved for planning

## Problem

The app's public entry point does not match the intended product flow. Three concrete defects:

1. **The landing page advertises the product's inner pages to anonymous visitors.** `src/app/page.tsx`
   links directly to `/layer2` and `/test`, both of which open without an account.
2. **"First-time user" is a per-browser flag pretending to be a per-account flag.** Onboarding state
   lives in `localStorage` (`parkintrace-onboarded`, see `src/store/useAppStore.ts`). The
   `profiles.onboarding_completed` column is written by `/layer` but never read. Consequences:
   - a returning user on a new device or cleared browser is re-onboarded;
   - a genuinely new user on a browser where someone else finished onboarding is sent straight to
     `/dashboard` and never sees the Layer 1 / Layer 2 explanation.
3. **Private pages have no access control.** `src/components/Nav.tsx` renders Dashboard / Layer 1 /
   Layer 2 / History on every page, including logged-out ones. Every private route is reachable by
   direct URL regardless of session.

## Goals

- Logged-out visitors see one clear entry point: heading, one-line pitch, disclaimer, Log in, Sign up.
- Private routes require a session.
- "First-time user" is decided by the account, not the browser.
- A first-time user is shown Layer 1 (one-line description) and Layer 2 (personal monitoring) during
  onboarding.
- The existing onboarding order is preserved: signup → consent → context → choose layer → dashboard.

## Non-goals

- No redesign of Layer 1, Layer 2, dashboard, or session pages.
- No server-side middleware auth (this is a client-rendered Supabase app; see "Approaches" below).
- No change to the PIN feature or the FastAPI backend.
- No change to the landing page's visual style beyond what is specified.

## Current flow (as-is)

```
/                     landing: heading, pitch, disclaimer, Log in, Sign up
                      + shortcuts to /layer2 and /test (no auth)
/signup               supabase.auth.signUp -> /consent
/consent              agree -> /demographics      (writes profiles.parkinson_context)
/demographics         optional context -> /layer
/layer                choose Layer 1 or Layer 2 -> /dashboard
                      (writes profiles.onboarding_completed AND localStorage)
/dashboard            cards -> /layer1 /layer2 /test /motor-task
```

## Target flow (to-be)

```
/                     heading, one-line pitch, disclaimer, Log in, Sign up. Nothing else.
                      If a session exists:
                        onboarding incomplete -> /consent
                        onboarding complete   -> /dashboard
/login  /signup       public
/consent  /demographics  /layer  /dashboard  /layer1  /layer2
/test  /motor-task  /history  /session/[id]              require a session
```

## Change A — Landing page (`src/app/page.tsx`)

- Remove the two shortcut anchors (`/layer2`, `/test`) and the block that renders them.
- Keep: `Logo`, the `ParkinTrace` heading, the one-line pitch, the disclaimer `Card`, and the
  **Log in** / **Sign up** buttons.
- The existing logged-in auto-redirect stays, but reads onboarding status through the new helper
  (Change B) instead of `useAppStore.onboardingCompleted`.
- Keep the "Backend not configured" notice that renders when `isSupabaseConfigured` is false.

## Change B — Account-based first-time detection (new `src/lib/onboarding.ts`)

A single-purpose module that answers "has this account finished onboarding?"

```ts
export type OnboardingState = "incomplete" | "complete" | "anonymous";

export async function getOnboardingState(): Promise<OnboardingState>;
export async function markOnboardingComplete(): Promise<void>;
```

`"anonymous"` means "no account to ask about, do not gate anything". The transient
`"loading"` state lives only in the session hook (Change C), not here.

Rules:

- `getOnboardingState()`:
  - `isSupabaseConfigured` false → return `"anonymous"` (demo/offline mode, nothing is gated).
  - No Supabase session → return `"anonymous"`.
  - Session present → read `profiles.onboarding_completed` for `session.user.id`.
    - row present → `"complete"` if true, else `"incomplete"`;
    - **no row → `"incomplete"`.** A `profiles` row is only created when the app
      first writes one (there is no signup trigger in `0001_core.sql`), so a
      brand-new account legitimately has no row. It has therefore never
      completed onboarding, and `localStorage` must NOT be consulted here — on a
      shared browser a stale flag would skip the Layer 1 / Layer 2 explanation.
    - query returned an error (transport/DB failure) → fall back to
      `localStorage`; never throw.
- `markOnboardingComplete()`:
  - Upsert `{ id, onboarding_completed: true }` to `profiles` (best effort, ignore errors);
  - always set `localStorage["parkintrace-onboarded"] = "1"` as the offline fallback;
  - set `useAppStore.setOnboardingCompleted(true)` so in-session UI stays consistent.

The `localStorage` key and the zustand field are retained purely as the offline path. `profiles` is
the source of truth when it is reachable.

Consumers: `src/app/page.tsx` (redirect decision) and `src/app/layer/page.tsx` (call
`markOnboardingComplete()` instead of writing the column + store inline).

## Change C — Top bar visibility (`src/components/Nav.tsx`)

- The private nav links (Dashboard / Layer 1 / Layer 2 / History) render only when a session exists.
- When logged out, the top bar shows **Log in** and **Sign up** instead.
- Requires a session-aware bit of state. Use a small hook (`src/lib/useSession.ts`) returning
  `"loading" | "signed-in" | "signed-out"`, seeded from `supabaseBrowser().auth.getSession()` and
  kept current via `onAuthStateChange`.
- While `"loading"`, render neither set of links (avoids a flash of private links).

## Change D — Route guard (new `src/components/RequireAuth.tsx`)

- A client component in `src/app/layout.tsx`, wrapping `<main>` content.
- Public path prefixes: `/`, `/login`, `/signup`.
- Every other path requires a session. When signed out → `router.replace("/")` and render nothing.
- When `isSupabaseConfigured` is false → allow through (offline demo mode, consistent with Change B).
- While the session state is `"loading"` on a private route → render nothing, so private content
  never flashes before the redirect resolves.

### Test-only bypass

The guard breaks the existing Playwright specs (`e2e/session.spec.ts`,
`e2e/analysis.spec.ts`, `e2e/layer2-workflows.spec.ts`), which visit private routes with no
session because the app previously had no access control.

A single env-derived flag, `E2E_BYPASS_GUARD` (from `NEXT_PUBLIC_E2E_BYPASS_GUARD`), makes the
client treat a visitor as signed in. It is:

- set only by `playwright.config.ts` in the `next dev` web server's environment;
- hard-disabled when `NODE_ENV === "production"`, so a stray production build cannot honour it;
- consumed at exactly two decision points — the route guard and the top bar.

This is a test affordance, not a security control. The guard is client-side UX; it was never a
trust boundary, and it stays that way.

## Change E — Onboarding wording (`src/app/layer/page.tsx`)

One line per layer, as requested:

- **Layer 1 — Typing-pattern screening**
  "Compares your typing characteristics against the research population."
- **Layer 2 — Personal monitoring**
  "Tracks change against your own baseline across sessions and days."

Remove the trailing second sentence ("Session 1 is useful immediately while the baseline builds.")
and keep the top preamble to one short sentence.

## Interfaces and data flow

```
Supabase session ──► useSession ──► Nav (show links) , RequireAuth (allow/redirect)
                        │
                        └──► onboarding.ts ──► profiles.onboarding_completed
                                                   │
                                                   └──► / redirect: /consent vs /dashboard
```

- Auth state comes from `supabaseBrowser()` (already the pattern in `src/lib/supabaseClient.ts`).
- No new dependencies. No new database columns — `profiles.onboarding_completed` already exists in
  `supabase/migrations/0001_core.sql`.

## Error handling

- Every Supabase read in `onboarding.ts` is wrapped; on failure it falls back to `localStorage` and
  never throws. The app must stay usable when the DB is unreachable.
- `RequireAuth` treats "cannot determine session" as signed out only when Supabase *is* configured;
  in unconfigured/demo mode it allows through.
- Redirects use `router.replace`, not `push`, so back-button navigation does not bounce between the
  guard and the landing page.

## Testing

- Vitest (existing `npm test`) for `onboarding.ts`:
  - no session → `"anonymous"`;
  - session + `onboarding_completed: true` → `"complete"`;
  - session + `onboarding_completed: false` → `"incomplete"`;
  - session + DB error → falls back to `localStorage`.
- Manual, with both servers running:
  1. Logged out, open `/` → only heading/pitch/disclaimer/Log in/Sign up; no Dashboard/Layer 1/2/History nav.
  2. Logged out, open `/layer2`, `/test`, `/dashboard`, `/history` directly → redirected to `/`.
  3. New account → reaches the Layer 1 / Layer 2 chooser, each with a one-line description.
  4. Finish onboarding → `/dashboard`. Log out, log back in → straight to `/dashboard`, chooser skipped.
  5. Clear `localStorage`, log in again on the same account → still straight to `/dashboard`
     (proves the DB is authoritative, not the browser).

## Risks

- **Guard vs. demo mode.** `isSupabaseConfigured` is true in this repo's `.env.local`, so the guard
  is enforced locally. Anyone relying on the current no-login `/test` path will now have to sign in.
- **Existing seeded accounts.** Accounts created before this change may have no `profiles` row; they
  fall back to `localStorage` and may see onboarding once more. Acceptable and self-healing on the
  next `/layer` visit.
