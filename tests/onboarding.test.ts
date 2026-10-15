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

  it("returns incomplete for a brand-new account with no profiles row, even if localStorage is stale", async () => {
    localStorage.setItem("parkintrace-onboarded", "1");
    h.getSession.mockResolvedValue(signedIn);
    h.from.mockImplementation(profilesRow(null));
    expect(await getOnboardingState()).toBe("incomplete");
  });

  it("falls back to localStorage when the profiles read returns a transport error", async () => {
    localStorage.setItem("parkintrace-onboarded", "1");
    h.getSession.mockResolvedValue(signedIn);
    h.from.mockImplementation(
      profilesRow(null, { message: "TypeError: Failed to fetch", code: "" })
    );
    expect(await getOnboardingState()).toBe("complete");
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
