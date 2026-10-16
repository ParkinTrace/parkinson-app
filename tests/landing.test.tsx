import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * The front door stays put. It used to replace itself with /dashboard or
 * /consent as soon as a session existed, which made the landing page impossible
 * to read while signed in — and the replace() was invisible in the browser
 * suite because every e2e run is signed out.
 */
const h = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  state: "anonymous" as "anonymous" | "incomplete" | "complete",
  email: null as string | null,
  signOut: vi.fn(),
  lockSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push, replace: h.replace }),
}));

vi.mock("@/lib/config", () => ({ isSupabaseConfigured: true }));

vi.mock("@/lib/onboarding", () => ({
  getOnboardingState: () => Promise.resolve(h.state),
}));

vi.mock("@/lib/pinClient", () => ({ lockSession: h.lockSession }));

vi.mock("@/lib/supabaseClient", () => ({
  supabaseBrowser: () => ({
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: h.email ? { user: { email: h.email } } : null } }),
      signOut: h.signOut,
    },
  }),
}));

import LandingPage from "../src/app/page";

afterEach(cleanup);

describe("landing page", () => {
  beforeEach(() => {
    h.push.mockReset();
    h.replace.mockReset();
    h.signOut.mockReset();
    h.lockSession.mockReset();
    h.signOut.mockResolvedValue({ error: null });
    h.state = "anonymous";
    h.email = null;
  });

  it("offers the unsigned Layer 1 and never redirects", async () => {
    render(<LandingPage />);

    expect(
      await screen.findByRole("button", { name: /Give consent and try Layer 1/i }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log in" })).toBeTruthy();
    expect(screen.getByText(/What happens next/i)).toBeTruthy();
    expect(h.replace).not.toHaveBeenCalled();
  });

  it("stays on the landing for a finished account and offers the dashboard", async () => {
    h.state = "complete";
    render(<LandingPage />);

    expect(await screen.findByRole("button", { name: /Go to dashboard/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /New typing session/i })).toBeTruthy();
    // The sign-up walkthrough is advice for someone who has not signed up.
    expect(screen.queryByText(/What happens next/i)).toBeNull();
    expect(h.replace).not.toHaveBeenCalled();
  });

  it("stays on the landing for a half-finished account and offers to resume", async () => {
    h.state = "incomplete";
    render(<LandingPage />);

    expect(await screen.findByRole("button", { name: /Resume setup/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Go to dashboard/i })).toBeNull();
    expect(h.replace).not.toHaveBeenCalled();
  });

  it("does not send a signed-in visitor to the dashboard by itself", async () => {
    h.state = "complete";
    render(<LandingPage />);
    await screen.findByRole("button", { name: /Go to dashboard/i });

    // Going to the dashboard is a choice the visitor makes, not something the
    // page does on their behalf.
    expect(h.push).not.toHaveBeenCalled();
    expect(h.replace).not.toHaveBeenCalled();
  });

  it("names the account that is signed in", async () => {
    h.state = "complete";
    h.email = "someone@example.test";
    render(<LandingPage />);

    expect(await screen.findByText(/someone@example\.test/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Sign in with another account/i })).toBeTruthy();
  });

  it("logs out from the landing and drops back to the signed-out panel", async () => {
    h.state = "complete";
    h.email = "someone@example.test";
    render(<LandingPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    await waitFor(() => expect(h.signOut).toHaveBeenCalled());
    // The PIN unlock must not survive a logout — it is the thing standing
    // between the next person at this browser and a recorded session.
    await waitFor(() => expect(h.lockSession).toHaveBeenCalled());
    expect(
      await screen.findByRole("button", { name: /Give consent and try Layer 1/i }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Log out" })).toBeNull();
    // Logging out leaves you where you are, on the landing.
    expect(h.push).not.toHaveBeenCalled();
  });

  it("switches account by signing out and going to the login page", async () => {
    h.state = "complete";
    h.email = "someone@example.test";
    render(<LandingPage />);

    fireEvent.click(await screen.findByRole("button", { name: /Sign in with another account/i }));

    await waitFor(() => expect(h.signOut).toHaveBeenCalled());
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/login"));
    expect(h.lockSession).toHaveBeenCalled();
  });
});
