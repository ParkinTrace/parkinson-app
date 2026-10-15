import { describe, expect, it } from "vitest";
import { isGatedPath, isPublicPath } from "../src/lib/routes";

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

describe("isGatedPath", () => {
  const configured = { supabaseConfigured: true, bypassGuard: false };

  it("gates a private path when Supabase is configured", () => {
    expect(isGatedPath("/dashboard", configured)).toBe(true);
  });

  it("never gates a public path", () => {
    expect(isGatedPath("/", configured)).toBe(false);
    expect(isGatedPath("/login", configured)).toBe(false);
    expect(isGatedPath("/signup", configured)).toBe(false);
  });

  it("does not gate when Supabase is unconfigured (demo mode)", () => {
    expect(isGatedPath("/dashboard", { supabaseConfigured: false, bypassGuard: false })).toBe(false);
  });

  it("does not gate when the e2e bypass is active", () => {
    expect(isGatedPath("/dashboard", { supabaseConfigured: true, bypassGuard: true })).toBe(false);
  });
});
