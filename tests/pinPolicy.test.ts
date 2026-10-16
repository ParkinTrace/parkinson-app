import { describe, expect, it } from "vitest";
import { pinRequired } from "../src/lib/pinPolicy";

describe("pinRequired", () => {
  it("never asks an unsigned Layer 1 visitor for a PIN", () => {
    // The whole point of the funnel change: consent → type, with nothing between.
    expect(pinRequired("signed-out")).toBe(false);
  });

  it("locks every session once there is an account", () => {
    expect(pinRequired("signed-in")).toBe(true);
  });

  it("does not ask while the session state is still unknown", () => {
    expect(pinRequired("loading")).toBe(false);
  });
});
