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
 *   Start session → (first run) setup modal → confirm, or
 *                 → (later runs) verify modal
 *
 * Both branches are handled because the backend keeps the PIN in memory for
 * the duration of the run. On return the page has an ACTIVE session: the
 * textarea is enabled and "Finish & analyze" is showing.
 *
 * IMPORTANT: the digits are TYPED, never `fill()`ed. `PinSetupModal` moves
 * focus itself — it hops to the confirm row on a 100ms timer after the 4th
 * digit — and Playwright's `fill()` focuses a box and only afterwards inserts
 * text. When that timer fires between those two steps the digit is dropped and
 * "Save PIN & Continue" stays disabled forever. Typing lets the component's
 * own auto-advance drive, which is exactly how a person uses it.
 */
export async function unlockSessionWithPin(
  page: Page,
  { started = false }: { started?: boolean } = {},
): Promise<void> {
  // Button reads "🔒 Unlock & Start session" when locked and "Start session"
  // once unlocked; the substring match covers both. Skipped when the caller has
  // already pressed it and asserted the gate itself.
  if (!started) await page.getByRole("button", { name: /Start session/i }).click();

  const setupHeading = page.getByRole("heading", { name: SETUP_HEADING });
  const verifyHeading = page.getByRole("heading", { name: VERIFY_HEADING });
  await expect(setupHeading.or(verifyHeading)).toBeVisible({ timeout: 15_000 });

  // Only one modal is mounted at a time, so this is the 8 setup boxes
  // (4 create, then 4 confirm) or the 4 verify boxes.
  const boxes = page.locator('input[type="password"]');

  if (await setupHeading.isVisible()) {
    await boxes.first().click();
    await page.keyboard.type(E2E_SESSION_PIN, { delay: 30 });

    // The confirm row only takes focus 100ms after the last create digit.
    await expect(boxes.nth(E2E_SESSION_PIN.length)).toBeFocused({ timeout: 5_000 });
    await page.keyboard.type(E2E_SESSION_PIN, { delay: 30 });

    const save = page.getByRole("button", { name: /Save PIN & Continue/i });
    await expect(save).toBeEnabled({ timeout: 5_000 });
    await save.click();

    // Setup success chains straight into the verify modal.
    await expect(verifyHeading).toBeVisible({ timeout: 15_000 });
  }

  await boxes.first().click();
  // The 4th digit auto-submits verification.
  await page.keyboard.type(E2E_SESSION_PIN, { delay: 30 });

  await expect(page.getByRole("button", { name: "Finish & analyze" })).toBeVisible({
    timeout: 15_000,
  });
}
