import type { SessionStatus } from "@/lib/useSession";

/**
 * Whether a typing session has to be unlocked with the 4-digit PIN.
 *
 * The PIN protects a person's record. Layer 1 is the unsigned screener: there
 * is no account and no record, so it never asks. Layer 2 is the account, where
 * every measurement is written down and locked — that is the daily entry the
 * PIN exists for.
 *
 * This briefly also answered true under `E2E_BYPASS_GUARD`, because the browser
 * suite could not create a signed-in session and the PIN flow would otherwise
 * have gone untested. `e2e/helpers/session.ts` can seed a real session cookie,
 * so the product rule is only the rule again, and the suite tests the real
 * thing instead of a flag that only exists for tests.
 */
export function pinRequired(status: SessionStatus, layer: "layer1" | "layer2" = "layer2"): boolean {
  if (layer === "layer1") return false;
  return status === "signed-in";
}
