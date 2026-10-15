import { expect, type Page } from "@playwright/test";

/**
 * Session PIN used across the e2e suite. Every spec configures/verifies the
 * SAME PIN on purpose: the FastAPI backend is a single process shared for the
 * whole run (`reuseExistingServer`), so a PIN set by one spec is already
 * configured when the next spec reaches `/test`. Using one constant keeps the
 * outcome deterministic whether a spec is the first or a later one.
 */
export const E2E_SESSION_PIN = "4826";

const SETUP_HEADING = /Create 4-Digit Session PIN|Change Session PIN/i;
const VERIFY_HEADING = "Session Access PIN";

/**
 * Drive the real 4-digit session-PIN gate on `/test` so a typing session can
 * start. Nothing is bypassed — this exercises the actual product flow:
 *
 *   Start session → (first run) setup modal → confirm modal, or
 *                 → (later runs) verify modal
 *
 * Both branches are handled because the backend keeps the PIN in memory for
 * the duration of the run. On return the page has an ACTIVE session: the
 * textarea is enabled and "Finish & analyze" is showing.
 */
export async function unlockSessionWithPin(page: Page): Promise<void> {
  // Button reads "🔒 Unlock & Start session" when locked and "Start session"
  // once unlocked; the substring match covers both.
  await page.getByRole("button", { name: /Start session/i }).click();

  const setupHeading = page.getByRole("heading", { name: SETUP_HEADING });
  const verifyHeading = page.getByRole("heading", { name: VERIFY_HEADING });
  await expect(setupHeading.or(verifyHeading)).toBeVisible({ timeout: 15_000 });

  // The modal is mounted one at a time, so `input[type=password]` is exactly
  // the 8 setup boxes (4 create, then 4 confirm) or the 4 verify boxes.
  const boxes = page.locator('input[type="password"]');

  if (await setupHeading.isVisible()) {
    for (let i = 0; i < E2E_SESSION_PIN.length; i++) {
      await boxes.nth(i).fill(E2E_SESSION_PIN[i]);
    }
    for (let i = 0; i < E2E_SESSION_PIN.length; i++) {
      await boxes.nth(E2E_SESSION_PIN.length + i).fill(E2E_SESSION_PIN[i]);
    }
    await page.getByRole("button", { name: /Save PIN & Continue/i }).click();
    // Setup success chains straight into the verify modal.
    await expect(verifyHeading).toBeVisible({ timeout: 15_000 });
  }

  // Filling the 4th digit auto-submits verification.
  for (let i = 0; i < E2E_SESSION_PIN.length; i++) {
    await boxes.nth(i).fill(E2E_SESSION_PIN[i]);
  }

  await expect(page.getByRole("button", { name: "Finish & analyze" })).toBeVisible({
    timeout: 15_000,
  });
}
