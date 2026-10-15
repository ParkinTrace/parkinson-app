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
