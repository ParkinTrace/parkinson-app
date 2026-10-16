# Anonymous Layer 1, account at the Layer 2 boundary

**Date:** 2026-10-16
**Status:** design approved, not implemented

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
on the account's own dashboard with no login, and this is worth an explicit e2e
assertion because it is a stated requirement.

## PIN policy

The 4-digit Session PIN exists to stop the next person at this browser from
recording a session as you. Before there is an account there is no record to
protect, so:

- **signed out** — no PIN. `handleStartSessionClick` starts the session directly.
- **signed in** — unchanged. PIN set up on the first session, verified before
  every later one, `lockSession()` after each.

Decision recorded here because it changes the shape of the funnel: a first-time
visitor must be able to go consent → type with nothing in between.

## The finish mark

"Layer 1 — complete" means one thing only: at least one valid session exists for
this browser or this account (`fetchHistory()` returns a row with `valid` and no
`insufficient` quality flag). Under it, the block:

> **Layer 1 — complete.** You have a reading against the research ranges.
> Layer 2 compares you against your own baseline instead, which has to follow you
> across days and devices — that needs an account.

with a **Continue to Layer 2** primary button → `/signup`, and a secondary
"Already have an account — log in" → `/login`.

The block appears in two places: under the readout on `/session/<id>` right after
the session that completed Layer 1, and permanently on `/layer1`. It is never
shown when the history is empty.

## Landing

The right-hand panel keeps Sign up / Log in. A primary "Give consent and try
Layer 1" button is added above them, pointing at `/consent`. The existing
auto-redirect stays: signed in and complete → `/dashboard`; signed in and
incomplete → `/consent`; signed out → stay on the landing.

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
- **PIN coverage** — every e2e run is signed out, so with this change nothing
  drives the PIN modal. Mitigate by seeding a synthetic signed-in session
  (`sb-<ref>-auth-token` with a far-future expiry) in one spec so the PIN path
  stays covered, and keep `tests/pin.test.ts` as the unit-level check.

## Risks

- The claim step writes to the account on sign up. If it throws, the user must
  still reach the dashboard — it is best-effort by design.
- Storing pending events locally grows `localStorage`. Cap it (e.g. the 20 most
  recent pending sessions) and say nothing in the UI about the cap, since it only
  ever trims data that has not been claimed.
