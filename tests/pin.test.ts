import { beforeEach, describe, expect, it } from "vitest";
import {
  isSessionUnlocked,
  lockSession,
  markSessionUnlocked,
  setupPin,
  verifyPin,
} from "../src/lib/pinClient";

describe("4-digit session PIN frontend client", () => {
  beforeEach(() => {
    // Clear storage before each test
    sessionStorage.clear();
    localStorage.clear();
  });

  it("manages session unlock token lifecycle correctly", () => {
    expect(isSessionUnlocked()).toBe(false);

    markSessionUnlocked("test-token-1234");
    expect(isSessionUnlocked()).toBe(true);

    lockSession();
    expect(isSessionUnlocked()).toBe(false);
  });

  it("validates 4-digit numeric format on setup", async () => {
    // Length errors
    const shortRes = await setupPin("12", "12", "user-1");
    expect(shortRes.ok).toBe(false);
    expect(shortRes.error).toContain("4 numeric digits");

    const longRes = await setupPin("12345", "12345", "user-1");
    expect(longRes.ok).toBe(false);

    // Non-numeric
    const charRes = await setupPin("12ab", "12ab", "user-1");
    expect(charRes.ok).toBe(false);

    // Mismatch
    const mismatchRes = await setupPin("1234", "5678", "user-1");
    expect(mismatchRes.ok).toBe(false);
    expect(mismatchRes.error).toContain("do not match");
  });

  it("supports offline dev fallback for setup and verification", async () => {
    const userId = "test-frontend-user";

    // Setup 4-digit PIN
    const setupResult = await setupPin("7890", "7890", userId);
    expect(setupResult.ok).toBe(true);

    // Wrong PIN fails verification
    const badVerify = await verifyPin("1111", userId);
    expect(badVerify.ok).toBe(false);
    expect(isSessionUnlocked()).toBe(false);

    // Correct PIN succeeds and unlocks session
    const goodVerify = await verifyPin("7890", userId);
    expect(goodVerify.ok).toBe(true);
    expect(goodVerify.token).toBeDefined();
    expect(isSessionUnlocked()).toBe(true);
  });
});
