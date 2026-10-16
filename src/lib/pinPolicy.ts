import { E2E_BYPASS_GUARD } from "@/lib/config";
import type { SessionStatus } from "@/lib/useSession";

/**
 * Whether a typing session has to be unlocked with the 4-digit PIN.
 *
 * The PIN protects a person's record. Layer 1 is the unsigned screener: there
 * is no account and no record, so it never asks. Layer 2 is the account, where
 * every measurement is written down and locked — that is the daily entry the
 * PIN exists for.
 *
 * `E2E_BYPASS_GUARD` is the browser suite saying "pretend someone is signed in",
 * which is exactly how the app header already reads it. That keeps the locked
 * path covered by the suite instead of silently dropping it.
 */
export function pinRequired(
  status: SessionStatus,
  bypass: boolean = E2E_BYPASS_GUARD,
): boolean {
  return status === "signed-in" || bypass;
}
