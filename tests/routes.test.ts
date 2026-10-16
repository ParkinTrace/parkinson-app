import { describe, expect, it } from "vitest";
import { isGatedPath, isPublicPath } from "../src/lib/routes";

describe("isPublicPath", () => {
  it("treats the landing and the two auth pages as public", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/signup")).toBe(true);
  });

  it("treats Layer 1 as public — it needs no account", () => {
    expect(isPublicPath("/consent")).toBe(true);
    expect(isPublicPath("/layer1")).toBe(true);
    expect(isPublicPath("/test")).toBe(true);
    expect(isPublicPath("/session/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
  });

  it("keeps Layer 2 and the account pages private", () => {
    for (const path of [
      "/demographics",
      "/layer",
      "/dashboard",
      "/layer2",
      "/motor-task",
      "/history",
    ]) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it("does not treat nested auth paths as public", () => {
    expect(isPublicPath("/login/help")).toBe(false);
    expect(isPublicPath("/signup/confirm")).toBe(false);
  });

  it("does not treat a lookalike session path as public", () => {
    expect(isPublicPath("/session")).toBe(false);
    expect(isPublicPath("/sessions")).toBe(false);
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
