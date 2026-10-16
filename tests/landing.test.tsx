import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

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
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push, replace: h.replace }),
}));

vi.mock("@/lib/config", () => ({ isSupabaseConfigured: true }));

vi.mock("@/lib/onboarding", () => ({
  getOnboardingState: () => Promise.resolve(h.state),
}));

import LandingPage from "../src/app/page";

afterEach(cleanup);

describe("landing page", () => {
  beforeEach(() => {
    h.push.mockReset();
    h.replace.mockReset();
    h.state = "anonymous";
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
});
