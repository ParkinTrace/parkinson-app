# Landing Page and Account-Based Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the landing page a login/signup-only entry point, make "first-time user" an account property stored in Supabase, and require a session for every private route.

**Architecture:** A new `src/lib/onboarding.ts` module owns the question "has this account finished onboarding?" and is the only place that reads `profiles.onboarding_completed`. A new `src/lib/useSession.ts` hook exposes Supabase auth state to any component. `src/components/RequireAuth.tsx` wraps the layout and redirects signed-out visitors to `/`. The top bar and landing/login pages consume the same two modules, so there is exactly one source of truth for each decision.

**Tech Stack:** Next.js 16 (App Router, client components), React 19, TypeScript, Supabase (`@supabase/ssr`), Zustand, Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-10-16-landing-and-onboarding-flow-design.md`

## Global Constraints

- **No new dependencies.** Everything needed is already in `package.json`.
- **Offline/demo mode must never gate.** If `isSupabaseConfigured` (from `src/lib/config.ts`) is false, `getOnboardingState()` returns `"anonymous"` and `RequireAuth` renders children unconditionally.
- **`supabaseBrowser()` can return `null`.** Every call site must handle it. It is a cached singleton (`createBrowserClient`), so calling it repeatedly is safe.
- **`profiles.onboarding_completed` is the source of truth.** `localStorage["parkintrace-onboarded"]` and the Zustand `onboardingCompleted` field are offline fallbacks only.
- **Redirects use `router.replace`, never `router.push`.**
- **No Supabase read may throw.** Every DB access in `onboarding.ts` is wrapped; on failure it falls back to `localStorage`.
- **Private paths** (everything not `/`, `/login`, `/signup`) require a session: `/consent`, `/demographics`, `/layer`, `/dashboard`, `/layer1`, `/layer2`, `/test`, `/motor-task`, `/history`, `/session/[id]`.
- **Tests** live in `tests/` and run under jsdom (`vitest.config.ts` includes `tests/**/*.test.ts`). Run a single file with `npx vitest run tests/<file>`.
- **Note identified during planning:** `src/app/login/page.tsx` is also a consumer of onboarding state (it currently reads the Zustand flag on line 39). The spec's consumer list omitted it; Task 6 covers it.

---

### Task 1: Account-based onboarding state module

**Files:**
- Create: `src/lib/onboarding.ts`
- Test: `tests/onboarding.test.ts`

**Interfaces:**
- Consumes: `isSupabaseConfigured` from `@/lib/config`; `supabaseBrowser()` from `@/lib/supabaseClient`; `useAppStore` from `@/store/useAppStore`.
- Produces:
  - `type OnboardingState = "incomplete" | "complete" | "anonymous"`
  - `getOnboardingState(): Promise<OnboardingState>`
  - `markOnboardingComplete(): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `tests/onboarding.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  configured: true,
  getSession: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  get isSupabaseConfigured() {
    return h.configured;
  },
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabaseBrowser: () => ({
    auth: { getSession: h.getSession, getUser: h.getUser },
    from: h.from,
  }),
}));

import { getOnboardingState, markOnboardingComplete } from "../src/lib/onboarding";

/** Build the .select().eq().limit().maybeSingle() chain Supabase exposes. */
function profilesRow(value: boolean | null, error: unknown = null) {
  return vi.fn().mockReturnValue({
    select: () => ({
      eq: () => ({
        limit: () => ({
          maybeSingle: async () => ({ data: value === null ? null : { onboarding_completed: value }, error }),
        }),
      }),
    }),
  });
}

const signedIn = { data: { session: { user: { id: "user-1" } } } };

describe("account-based onboarding state", () => {
  beforeEach(() => {
    h.configured = true;
    h.getSession.mockReset();
    h.getUser.mockReset();
    h.from.mockReset();
    localStorage.clear();
  });

  it("returns anonymous when Supabase is not configured", async () => {
    h.configured = false;
    expect(await getOnboardingState()).toBe("anonymous");
  });

  it("returns anonymous when there is no session", async () => {
    h.getSession.mockResolvedValue({ data: { session: null } });
    expect(await getOnboardingState()).toBe("anonymous");
  });

  it("returns complete when the account finished onboarding", async () => {
    h.getSession.mockResolvedValue(signedIn);
    h.from.mockImplementation(profilesRow(true));
    expect(await getOnboardingState()).toBe("complete");
  });

  it("returns incomplete when the account has not finished onboarding", async () => {
    h.getSession.mockResolvedValue(signedIn);
    h.from.mockImplementation(profilesRow(false));
    expect(await getOnboardingState()).toBe("incomplete");
  });

  it("ignores a stale localStorage flag when the account says incomplete", async () => {
    localStorage.setItem("parkintrace-onboarded", "1");
    h.getSession.mockResolvedValue(signedIn);
    h.from.mockImplementation(profilesRow(false));
    expect(await getOnboardingState()).toBe("incomplete");
  });

  it("falls back to localStorage when the profiles read throws", async () => {
    h.getSession.mockResolvedValue(signedIn);
    h.from.mockImplementation(() => {
      throw new Error("database unreachable");
    });
    localStorage.setItem("parkintrace-onboarded", "1");
    expect(await getOnboardingState()).toBe("complete");
  });

  it("falls back to incomplete when the profiles read throws and local is unset", async () => {
    h.getSession.mockResolvedValue(signedIn);
    h.from.mockImplementation(() => {
      throw new Error("database unreachable");
    });
    expect(await getOnboardingState()).toBe("incomplete");
  });

  it("marks onboarding complete in localStorage, the store and the database", async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    h.from.mockImplementation(() => ({ upsert }));

    await markOnboardingComplete();

    expect(localStorage.getItem("parkintrace-onboarded")).toBe("1");
    expect(upsert).toHaveBeenCalledWith({ id: "user-1", onboarding_completed: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/onboarding.test.ts`
Expected: FAIL — `Failed to resolve import "../src/lib/onboarding"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/onboarding.ts`:

```ts
/**
 * Account-based onboarding status.
 *
 * "First-time user" is a property of the account, not the browser. The
 * Supabase `profiles.onboarding_completed` column is the source of truth;
 * localStorage is only the offline fallback. Nothing here may throw.
 */
import { isSupabaseConfigured } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useAppStore } from "@/store/useAppStore";

export type OnboardingState = "incomplete" | "complete" | "anonymous";

const LOCAL_KEY = "parkintrace-onboarded";

function readLocalFlag(): boolean {
  try {
    return localStorage.getItem(LOCAL_KEY) === "1";
  } catch {
    return false;
  }
}

/** Ask the account whether onboarding finished. "anonymous" means do not gate. */
export async function getOnboardingState(): Promise<OnboardingState> {
  if (!isSupabaseConfigured) return "anonymous";

  const supa = supabaseBrowser();
  if (!supa) return "anonymous";

  let userId: string | null = null;
  try {
    const { data } = await supa.auth.getSession();
    userId = data.session?.user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return "anonymous";

  try {
    const { data, error } = await supa
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .limit(1)
      .maybeSingle();
    if (!error && data) return data.onboarding_completed ? "complete" : "incomplete";
  } catch {
    /* fall through to the offline fallback */
  }

  return readLocalFlag() ? "complete" : "incomplete";
}

/** Persist onboarding completion locally first, then best-effort to the account. */
export async function markOnboardingComplete(): Promise<void> {
  // Writes state + localStorage["parkintrace-onboarded"].
  useAppStore.getState().setOnboardingCompleted(true);

  const supa = supabaseBrowser();
  if (!supa) return;
  try {
    const { data } = await supa.auth.getUser();
    const id = data.user?.id;
    if (!id) return;
    await supa.from("profiles").upsert({ id, onboarding_completed: true });
  } catch {
    /* the local fallback is already written */
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/onboarding.test.ts`
Expected: PASS — 8 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/onboarding.ts tests/onboarding.test.ts
git commit -m "feat(onboarding): decide first-time user from the account, not the browser"
```

---

### Task 2: Session status hook

**Files:**
- Create: `src/lib/useSession.ts`
- Test: `tests/useSession.test.ts`

**Interfaces:**
- Consumes: `isSupabaseConfigured` from `@/lib/config`; `supabaseBrowser()` from `@/lib/supabaseClient`.
- Produces: `type SessionStatus = "loading" | "signed-in" | "signed-out"` and `useSession(): SessionStatus`, consumed by Tasks 3 and 4.

- [ ] **Step 1: Write the failing test**

Create `tests/useSession.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  configured: true,
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  get isSupabaseConfigured() {
    return h.configured;
  },
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabaseBrowser: () => ({
    auth: {
      getSession: h.getSession,
      onAuthStateChange: h.onAuthStateChange,
    },
  }),
}));

import { useSession } from "../src/lib/useSession";

describe("useSession", () => {
  beforeEach(() => {
    h.configured = true;
    h.getSession.mockReset();
    h.onAuthStateChange.mockReset();
    h.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("reports signed-out when Supabase is not configured", async () => {
    h.configured = false;
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current).toBe("signed-out"));
  });

  it("reports signed-in when a session exists", async () => {
    h.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current).toBe("signed-in"));
  });

  it("reports signed-out when there is no session", async () => {
    h.getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current).toBe("signed-out"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/useSession.test.ts`
Expected: FAIL — `Failed to resolve import "../src/lib/useSession"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/useSession.ts`:

```ts
"use client";
import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabaseClient";

export type SessionStatus = "loading" | "signed-in" | "signed-out";

/** Current Supabase auth state for the browser. "loading" only until the
 *  first resolve, so consumers never flash private UI to a signed-out user. */
export function useSession(): SessionStatus {
  const [status, setStatus] = useState<SessionStatus>(
    isSupabaseConfigured ? "loading" : "signed-out"
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supa = supabaseBrowser();
    if (!supa) {
      setStatus("signed-out");
      return;
    }

    let active = true;
    supa.auth
      .getSession()
      .then(({ data }) => {
        if (active) setStatus(data.session ? "signed-in" : "signed-out");
      })
      .catch(() => {
        if (active) setStatus("signed-out");
      });

    const { data: sub } = supa.auth.onAuthStateChange((_event, session) => {
      if (active) setStatus(session ? "signed-in" : "signed-out");
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return status;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/useSession.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useSession.ts tests/useSession.test.ts
git commit -m "feat(auth): add useSession hook for browser auth state"
```

---

### Task 3: Route guard for private pages

**Files:**
- Create: `src/lib/routes.ts`
- Create: `src/components/RequireAuth.tsx`
- Modify: `src/app/layout.tsx:19`
- Test: `tests/routes.test.ts`

**Interfaces:**
- Consumes: `useSession()` and `SessionStatus` from `@/lib/useSession` (Task 2); `isSupabaseConfigured` from `@/lib/config`.
- Produces: `isPublicPath(pathname: string): boolean` and `PUBLIC_PATHS` from `@/lib/routes`; `<RequireAuth>` component.

- [ ] **Step 1: Write the failing test**

Create `tests/routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isPublicPath } from "../src/lib/routes";

describe("isPublicPath", () => {
  it("treats the landing, login and signup pages as public", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/signup")).toBe(true);
  });

  it("treats every product page as private", () => {
    for (const path of [
      "/consent",
      "/demographics",
      "/layer",
      "/dashboard",
      "/layer1",
      "/layer2",
      "/test",
      "/motor-task",
      "/history",
      "/session/abc123",
    ]) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it("does not treat nested paths as public", () => {
    expect(isPublicPath("/login/help")).toBe(false);
    expect(isPublicPath("/signup/confirm")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/routes.test.ts`
Expected: FAIL — `Failed to resolve import "../src/lib/routes"`.

- [ ] **Step 3: Write `src/lib/routes.ts`**

```ts
/** Paths anyone may visit without a session. Everything else is private. */
export const PUBLIC_PATHS = ["/", "/login", "/signup"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/routes.test.ts`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Write `src/components/RequireAuth.tsx`**

```tsx
"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { isPublicPath } from "@/lib/routes";
import { useSession } from "@/lib/useSession";

/** Sends signed-out visitors to "/" for every private path. In demo mode
 *  (Supabase unconfigured) nothing is gated. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useSession();

  const gated = isSupabaseConfigured && !isPublicPath(pathname);

  useEffect(() => {
    if (gated && status === "signed-out") router.replace("/");
  }, [gated, status, router]);

  // Render nothing while an unknown session state would otherwise flash
  // private content before the redirect lands.
  if (gated && status !== "signed-in") return null;

  return <>{children}</>;
}
```

- [ ] **Step 6: Wire it into the layout**

In `src/app/layout.tsx`, add the import after line 5 and wrap the `<main>` contents.

Change:
```tsx
import { StoreHydrator } from "@/store/useAppStore";
```
to:
```tsx
import { StoreHydrator } from "@/store/useAppStore";
import { RequireAuth } from "@/components/RequireAuth";
```

Change:
```tsx
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
```
to:
```tsx
        <main className="mx-auto max-w-5xl px-4 py-6">
          <RequireAuth>{children}</RequireAuth>
        </main>
```

- [ ] **Step 7: Typecheck and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx vitest run`
Expected: all tests pass, including the pre-existing `tests/pin.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/routes.ts src/components/RequireAuth.tsx src/app/layout.tsx tests/routes.test.ts
git commit -m "feat(auth): require a session for private routes"
```

---

### Task 4: Hide private nav links when signed out

**Files:**
- Modify: `src/components/Nav.tsx:14-50`

**Interfaces:**
- Consumes: `useSession()` from `@/lib/useSession` (Task 2).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Replace the component body**

Replace the `TopBar` function (lines 14-50) in `src/components/Nav.tsx` with:

```tsx
export function TopBar() {
  const layer = useAppStore((s) => s.layer);
  const setLayer = useAppStore((s) => s.setLayer);
  const pathname = usePathname();
  const status = useSession();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Logo />
        <div className="mr-auto">
          <p className="font-bold text-slate-900">ParkinTrace</p>
          <p className="text-xs text-slate-500">Typing-pattern screening &amp; monitoring</p>
        </div>
        {status === "signed-in" && (
          <nav className="flex items-center gap-1" aria-label="Primary">
            {LINKS.map((l) => {
              const isLayerLink = l.href === "/layer1" || l.href === "/layer2";
              const active =
                pathname === l.href ||
                (isLayerLink &&
                  (l.href === "/layer1") === (layer === "layer1") &&
                  pathname.startsWith("/" + l.href.slice(1, 7)));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => {
                    if (l.href === "/layer1") setLayer("layer1");
                    if (l.href === "/layer2") setLayer("layer2");
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    active ? "bg-teal-100 text-teal-800" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        )}
        {status === "signed-out" && (
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Add the import**

In `src/components/Nav.tsx`, change:
```tsx
import { useAppStore } from "@/store/useAppStore";
```
to:
```tsx
import { useAppStore } from "@/store/useAppStore";
import { useSession } from "@/lib/useSession";
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Nav.tsx
git commit -m "feat(nav): hide private links from signed-out visitors"
```

---

### Task 5: Landing page becomes a login/signup-only entry point

**Files:**
- Modify: `src/app/page.tsx` (whole file)

**Interfaces:**
- Consumes: `getOnboardingState()` from `@/lib/onboarding` (Task 1); `isSupabaseConfigured` from `@/lib/config`.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Replace the file**

Replace the entire contents of `src/app/page.tsx` with:

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Logo, PrimaryButton } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/config";
import { getOnboardingState } from "@/lib/onboarding";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const go = async () => {
      if (!isSupabaseConfigured) return;
      const state = await getOnboardingState();
      if (!active || state === "anonymous") return;
      router.replace(state === "complete" ? "/dashboard" : "/consent");
    };
    go();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Logo size={72} />
      <h1 className="text-3xl font-bold">ParkinTrace</h1>
      <p className="max-w-md text-slate-600">
        Typing-based motor-pattern screening &amp; longitudinal monitoring. We analyze{" "}
        <strong>how you type, not what you type</strong>.
      </p>
      <Card className="max-w-md text-left">
        <p className="text-sm text-slate-600">
          This is a research aid — not a medical device, and never a diagnosis. The first typing
          session is a real measurement; there is no practice session.
        </p>
      </Card>
      <div className="flex gap-3">
        <PrimaryButton onClick={() => router.push("/login")}>Log in</PrimaryButton>
        <a
          href="/signup"
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Sign up
        </a>
      </div>
      {!isSupabaseConfigured && (
        <p className="text-sm text-amber-700">
          Backend not configured — connect Supabase to enable sign-in.
        </p>
      )}
    </div>
  );
}
```

The two shortcut anchors (`/layer2`, `/test`) and the `useAppStore` import are gone.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): remove no-login shortcuts, gate entry on account state"
```

---

### Task 6: Login redirect uses the account, not localStorage

**Files:**
- Modify: `src/app/login/page.tsx:22,39`

**Interfaces:**
- Consumes: `getOnboardingState()` from `@/lib/onboarding` (Task 1).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Swap the onboarding source**

In `src/app/login/page.tsx`, delete the line:
```tsx
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);
```

- [ ] **Step 2: Update the redirect**

Change:
```tsx
    setUserId(data.user?.id ?? null);
    router.replace(onboardingCompleted ? "/dashboard" : "/consent");
```
to:
```tsx
    setUserId(data.user?.id ?? null);
    const state = await getOnboardingState();
    router.replace(state === "complete" ? "/dashboard" : "/consent");
```

- [ ] **Step 3: Add the import**

Change:
```tsx
import { isSupabaseConfigured } from "@/lib/config";
```
to:
```tsx
import { isSupabaseConfigured } from "@/lib/config";
import { getOnboardingState } from "@/lib/onboarding";
```

`useAppStore` is still used for `setUserId`, so its import stays.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "fix(auth): route login by account onboarding state"
```

---

### Task 7: One-line layer descriptions and account-based completion

**Files:**
- Modify: `src/app/layer/page.tsx` (whole file)

**Interfaces:**
- Consumes: `markOnboardingComplete()` from `@/lib/onboarding` (Task 1); `useAppStore`, `Layer` from `@/store/useAppStore`.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Replace the file**

Replace the entire contents of `src/app/layer/page.tsx` with:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, SecondaryButton } from "@/components/ui";
import { markOnboardingComplete } from "@/lib/onboarding";
import { useAppStore, type Layer } from "@/store/useAppStore";

export default function LayerSelectionPage() {
  const router = useRouter();
  const setLayer = useAppStore((s) => s.setLayer);

  const choose = async (layer: Layer) => {
    setLayer(layer);
    await markOnboardingComplete();
    router.replace("/dashboard");
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Choose your starting view</h1>
      <p className="mt-1 text-sm text-slate-600">
        You can switch layers anytime. Your first typing session is a real measurement.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <Card>
          <h2 className="font-semibold">Layer 1 — Typing-pattern screening</h2>
          <p className="mt-1 text-sm text-slate-600">
            Compares your typing characteristics against the research population.
          </p>
          <div className="mt-3">
            <PrimaryButton onClick={() => choose("layer1")}>Start with Layer 1</PrimaryButton>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Layer 2 — Personal monitoring</h2>
          <p className="mt-1 text-sm text-slate-600">
            Tracks change against your own baseline across sessions and days.
          </p>
          <div className="mt-3">
            <SecondaryButton onClick={() => choose("layer2")}>Start with Layer 2</SecondaryButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
```

The direct `supabaseBrowser` upsert is replaced by `markOnboardingComplete()`, so there is one writer for onboarding completion instead of two.

- [ ] **Step 2: Typecheck and run the full suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/layer/page.tsx
git commit -m "feat(onboarding): one-line layer descriptions, single completion writer"
```

---

## Manual Verification (after all tasks)

Both servers must be running: backend on `:8000`, frontend on `:3000`.

1. **Signed out, `/`** — only logo, heading, pitch, disclaimer, Log in, Sign up. No Dashboard / Layer 1 / Layer 2 / History links in the top bar.
2. **Signed out, direct URLs** — `/layer2`, `/test`, `/dashboard`, `/history` all redirect to `/`.
3. **New account** — reaches the Layer 1 / Layer 2 chooser; each card shows exactly one description line.
4. **Finish onboarding** — lands on `/dashboard`. Log out, log back in → straight to `/dashboard`.
5. **Prove the DB is authoritative** — clear `localStorage`, log in again on the same account → still straight to `/dashboard`.

**Prerequisite for steps 3-5:** the Supabase project must be able to hand back a session. If email confirmation is enabled, `signUp` returns no session and you cannot reach onboarding — use a confirmed account, or disable confirmation in Supabase → Authentication → Providers → Email.
