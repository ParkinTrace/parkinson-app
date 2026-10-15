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
