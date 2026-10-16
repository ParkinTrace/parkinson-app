# Anonymous Layer 1, account at the Layer 2 boundary

**Date:** 2026-10-16
**Status:** implemented

## Problem

Today the order is sign up → consent → context → choose a layer → dashboard.
`/consent`, `/layer1` and `/test` are all private: `src/lib/routes.ts` has

```ts
export const PUBLIC_PATHS = ["/", "/login", "/signup"];
```

so a stranger has to create an account before they can read the consent text or
press a single key. That is backwards. Layer 1 is a population-reference
screener — it compares one session against research ranges and needs no account
at all. Layer 2 is the part that genuinely needs an account, because it freezes
a personal baseline that has to survive across days and devices.

The user's words: consent first, then Layer 1 should be shown; a proper
sign-up/log-in page at the point where the baseline starts; a mark when Layer 1
is actually finished; and after logging in the account persists until the user
logs out.

## Goal

Consent and Layer 1 work with no account. The account begins exactly where it is
needed: at the door to Layer 2.

## Non-goals

- No change to the analysis models, the extracted features, or the backend
  endpoints.
- No new account fields, no profile page, no settings page.
- No change to how the Layer 2 baseline is computed.
- No change to the PIN scheme itself — only to when it is demanded.

## The funnel

```
/  landing
   └─ primary: "Give consent and try Layer 1"

/consent          PUBLIC   tick the box, continue
/layer1           PUBLIC   what Layer 1 measures + "Start your first session"
/test             PUBLIC   the real typing session (no PIN while signed out)
/session/<id>     PUBLIC   the Layer 1 readout for what was just typed
     └─ "Layer 1 — complete" mark + "Continue to Layer 2"

/signup  /login   PUBLIC   the account starts here
     └─ claim this browser's sessions → /demographics → /layer → /dashboard

/demographics  /dashboard  /layer2  /history  /motor-task   PRIVATE
```

## Routes

`PUBLIC_PATHS` becomes, and `isPublicPath` gains prefix matching for the dynamic
session route:

```ts
export const PUBLIC_PATHS = ["/", "/login", "/signup", "/consent", "/layer1", "/test"];
export const PUBLIC_PREFIXES = ["/session/"];
```

Everything else stays gated exactly as it is now, including the
`E2E_BYPASS_GUARD` behaviour.

## Data

### An unsigned session

Already supported: `persistAndAnalyze` (`src/lib/session.ts:40-65`) deliberately
persists nothing for a signed-out visitor, calls the analysis endpoint without a
token, and the caller writes a local snapshot. `/layer1` already falls back to
`parkintrace_local_history` when there is no account.

The one gap: the local history row keeps only summary features
(`src/lib/localCache.ts:36-49`), so the Layer 1 result cannot be reconstructed
later. **Change:** an unsigned session also stores its own payload (session id,
times, device, duration, quality flags, keystroke events) under
`parkintrace_pending_sessions`. Events carry hold/flight timing and key identity
only — never characters, which is the rule the whole product already runs on.

### Claiming, on sign up or log in

New `claimLocalSessions()` in `src/lib/session.ts`:

1. Read `parkintrace_pending_sessions`.
2. For each one, re-run the existing `persistAndAnalyze` path with the now-known
   `ownerId`, so the session row, the metrics and the Layer 1 result are all
   written under the account with their original ids and timestamps.
3. Delete each claimed payload from local storage.
4. Drop the corresponding rows from `parkintrace_local_history` so nothing is
   counted twice.

Called after a successful sign up and after a successful log in. Failure is
non-fatal: the payload stays pending and the next sign-in tries again.

### Session persistence

Nothing to build. Supabase already keeps the session in this browser until
`auth.signOut()`, which lives on the dashboard. Coming back the next day lands
on the account's own dashboard with no login.

This is a stated requirement but it is not covered by the default e2e run: every
run is signed out, and a hand-seeded `sb-<ref>-auth-token` does not survive,
because supabase-js validates the session against the auth server on load and
discards a token it cannot verify (measured — see Testing). It is covered by the
cloud-gated specs when `PLAYWRIGHT_CLOUD` is set, against a real account.

## PIN policy — Layer 2 only

The 4-digit PIN exists to stop the next person at this browser from recording a
session **as you**. That only means something once a record exists, so the rule
follows the layer, not the page:

- **Layer 1 (signed out, the screener)** — no PIN, ever. Consent → type, with
  nothing in between.
- **Layer 2 (signed in, the daily record)** — the PIN is set up on the first
  session and verified before every later one, then `lockSession()` runs. Coming
  back tomorrow means entering the PIN and continuing; that daily entry is the
  point of the product.

A session is one measurement read two ways, so a session started while signed in
is a Layer 2 record even when it was opened from the Layer 1 page. It asks for
the PIN. Deliberate: the PIN protects the record, and a signed-in user has one.

Implementation: one predicate, `pinRequired(status, bypass)` in
`src/lib/pinPolicy.ts`, returns `status === "signed-in" || bypass`. The `bypass`
is `E2E_BYPASS_GUARD`, which the suite already uses to mean "pretend someone is
signed in" — the same expression the header reads to decide whether to render app
navigation. Layer 1 is the unsigned path, and the unsigned path never sees the
PIN. Because the browser suite runs with the bypass on, the locked path stays
covered instead of silently dropping out of the suite.

## The finish mark

"Layer 1 — complete" means one thing only: at least one valid session exists for
this browser or this account (`fetchHistory()` returns a row with `valid` and no
`insufficient` quality flag). Under it, the block:

> **Layer 1 — complete.** You have a reading against the research ranges.
> Layer 2 compares you against your own baseline instead, which has to follow you
> across days and devices — that needs an account.

with a **Continue to Layer 2 — create an account** primary button → `/signup`,
and a secondary "I already have an account" → `/login`. A signed-in visitor gets
**Continue to Layer 2** → `/dashboard` instead: the account already exists, so
there is nothing left to create.

The block appears in two places: under the readout on `/session/<id>` right after
the session that completed Layer 1, and permanently on `/layer1`. It is never
shown when the history is empty.

## Landing

The right-hand panel keeps Sign up / Log in. A primary "Give consent and try
Layer 1" button is added above them, pointing at `/consent`. The existing
auto-redirect stays: signed in and complete → `/dashboard`; signed in and
incomplete → `/consent`; signed out → stay on the landing.

## Hard refresh

A refresh is where the two visitors have to be told apart, and they are:

- **Signed out, on `/`** — `getOnboardingState()` reads `anonymous`, so the
  landing stays put and the whole funnel is offered again, from consent.
- **Signed out, on a route that already has history** (`/layer1`, `/session/<id>`)
  — those pages are public, so a refresh re-renders the reading from this
  browser's local history instead of throwing the visitor back to the landing.
  The measurement they just made is not lost by pressing F5.
- **Signed in** — the session is Supabase's own cookie, so a refresh on `/` goes
  straight to `/dashboard`, and no daily login is asked for. Nothing is
  re-consented and no Layer 1 step is repeated.

The one thing a refresh does drop is the *interpretation* of an unsigned session
once the snapshot is gone: the numbers survive in local history, the population
comparison does not. That is a deliberate limit of holding data in a browser, and
it is the reason the completion block says the account is what carries Layer 2
across days and devices.

## Edge cases

- **The pending session was made in a different browser.** Nothing to claim.
  Say so on the completion block rather than inventing a baseline.
- **Anonymous and never signs up.** Layer 1 stays readable from local history.
  Layer 2 shows the sign-in requirement; it never fabricates a baseline.
- **Two accounts on one browser.** Pending sessions are claimed by the first
  account that signs in, then deleted, so the second cannot inherit them.
- **A deployed backend with `SUPABASE_URL` set** enforces auth
  (`backend/app/core/auth.py:66`) and will 401 an unsigned analysis. The page
  must say the analysis needs an account rather than show a fabricated result.
- **`/session/<id>` for someone else's id.** Unchanged: "Session not found", or
  the sign-in requirement. Never falls back to a different session.

## Testing

- **unit** — `tests/routes.test.ts` public/gated lists including the new prefix;
  `tests/onboarding.test.ts` unchanged in substance; new tests for
  `claimLocalSessions` (claims once, deletes after, tolerates failure).
- **e2e** — new `e2e/anon-layer1.spec.ts`: signed out, consent → Layer 1 →
  session insight → the completion block is visible → Continue leaves for
  `/signup`. Update `e2e/session.spec.ts`, whose onboarding walk currently starts
  at sign up, to the new order.
- **PIN coverage** — every default e2e run is signed out, so without help nothing
  would drive the PIN modal. `pinRequired` takes the bypass as an argument and
  the component passes `E2E_BYPASS_GUARD`, so the suite's `/test` run still
  exercises the real setup/verify flow while an unsigned visitor in production
  never sees it. The rule itself is unit-tested in `tests/pinPolicy.test.ts`.

  Seeding a synthetic `sb-<ref>-auth-token` cookie was tried and does not work:
  the cookie lands (verified in the page) but supabase-js validates the session
  against the auth server during initialisation and clears a token it cannot
  verify, so the app correctly stays signed out. Do not reintroduce it.

## Verified

- `npx tsc --noEmit` — clean.
- `npx playwright test` — 18 passed, 4 skipped (the cloud-gated specs), 0 failed.
- `npm test` — 43 passed. `tests/pin.test.ts` can exceed vitest's 5s default when
  the local backend is cold; it passes with a longer timeout and is unrelated to
  this change.
- The whole funnel was driven once by hand in a real browser against the local
  backend: landing → consent → Layer 1 → typing → `/session/<id>` → the
  completion mark → `/signup`, with the header showing Log in / Sign up and no
  PIN at any point.

## Risks

- The claim step writes to the account on sign up. If it throws, the user must
  still reach the dashboard — it is best-effort by design.
- Storing pending events locally grows `localStorage`. Cap it (e.g. the 20 most
  recent pending sessions) and say nothing in the UI about the cap, since it only
  ever trims data that has not been claimed.
