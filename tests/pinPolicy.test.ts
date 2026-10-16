import { describe, expect, it } from "vitest";
import { pinRequired } from "../src/lib/pinPolicy";

describe("pinRequired", () => {
  it("never asks an unsigned Layer 1 visitor for a PIN", () => {
    expect(pinRequired("signed-out", false)).toBe(false);
  });

  it("locks every session once there is an account", () => {
    expect(pinRequired("signed-in", false)).toBe(true);
  });

  it("does not ask while the session state is still unknown", () => {
    expect(pinRequired("loading", false)).toBe(false);
  });

  it("locks the path for the browser suite, which pretends to be signed in", () => {
    expect(pinRequired("signed-out", true)).toBe(true);
    expect(pinRequired("signed-in", true)).toBe(true);
  });
});
