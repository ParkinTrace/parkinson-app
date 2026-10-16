import { expect, test } from "@playwright/test";
import { unlockSessionWithPin } from "./helpers/pin";
import { onboardedInitScript, SEEDED_EMAIL, seedSignedInSession } from "./helpers/session";

/**
 * The signed-in half of the app. Every other spec runs signed out, so without
 * this the account panel on the landing page and the PIN gate on a personal
 * session are never exercised in a browser. Nothing is stubbed: the session
 * cookie is the real format, and the PIN modal is the real product flow.
 */
test.describe("a signed-in visitor", () => {
  test.beforeEach(async ({ context, page }) => {
    await seedSignedInSession(context);
    await page.addInitScript(onboardedInitScript);
  });

  test("the landing names the account and offers a way out", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(SEEDED_EMAIL)).toBeVisible();
    await expect(page.getByRole("button", { name: /Go to dashboard/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Sign in with another account/i }),
    ).toBeVisible();
    // The landing stays put for a signed-in visitor: going to the dashboard is
    // a choice here, not something the page does on their behalf.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: /Give consent and try Layer 1/i })).toHaveCount(0);
  });

  test("logging out stays on the landing and drops the account", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Log out" }).click();

    await expect(
      page.getByRole("button", { name: /Give consent and try Layer 1/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);
    await expect(page.getByText(SEEDED_EMAIL)).toHaveCount(0);
    // Logging out does not throw you off the page you were on.
    await expect(page).toHaveURL(/\/$/);
  });

  test("switching account signs out and opens the login page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Sign in with another account/i }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  });

  test("a returning signed-in visitor is not asked to log in again", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("a personal session drives the real 4-digit PIN gate", async ({ page }) => {
    await page.goto("/test");

    const setup = page.getByRole("heading", { name: /Create 4-Digit Session PIN|Change Session PIN/i });
    const verify = page.getByRole("heading", { name: "Session Access PIN" });
    await page.getByRole("button", { name: /Start session/i }).click();
    await expect(setup.or(verify)).toBeVisible({ timeout: 20_000 });

    // The real setup/verify flow, not a stub: the textarea only unlocks once
    // the PIN has been entered.
    await unlockSessionWithPin(page, { started: true });
    await expect(page.locator("textarea")).toBeEnabled();
    await expect(page.getByRole("button", { name: "Finish & analyze" })).toBeVisible();
  });
});
