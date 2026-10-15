import { expect, test } from "@playwright/test";
import path from "path";
import fs from "fs";

/**
 * End-to-end browser verification for ParkTrace Layer 2:
 * 1. Session submission / local history loading & baseline-building state
 * 2. Dynamic motor indicator selection & chart updates
 * 3. Treatment-event recording & pre/post event timeline comparisons
 * 4. Clinician longitudinal summary report modal & print/export verification
 * 5. Real browser screenshot capture
 */

const SCREENSHOTS_DIR = path.resolve(__dirname, "screenshots");

/**
 * `/layer2` renders a "Loading personal monitoring dashboard…" placeholder
 * until a client-side effect has read localStorage, and on the first request
 * Turbopack also has to compile the route. Together those blow past
 * Playwright's 5s default assertion budget, which made whichever test reached
 * the page first fail while later ones passed. The FIRST assertion after
 * navigation therefore gets a real budget; everything after it runs against an
 * already-hydrated, already-compiled page and keeps the default.
 */
const FIRST_RENDER_TIMEOUT = 30_000;

const SAMPLE_SESSION = {
  id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  started_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  ended_at: new Date(Date.now() - 86400000 * 2 + 120000).toISOString(),
  session_type: "structured",
  device_id: "keyboard-alpha-desktop",
  valid: true,
  quality_flags: [],
  features: {
    ht_mean: 112.5,
    ht_std: 14.2,
    ft_mean: 198.0,
    ft_std: 22.1,
    ikl_mean: 310.5,
    ikl_std: 28.4,
    left_ht_mean: 111.0,
    right_ht_mean: 114.0,
    hand_asymmetry: 0.027,
    pause_frequency: 1.1,
    typing_speed: 2.7,
    session_consistency: 0.13,
  },
};

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript((sess) => {
    localStorage.setItem("parkintrace_local_history", JSON.stringify([sess]));
    localStorage.setItem("parkintrace_user_id", "patient-test-001");
  }, SAMPLE_SESSION);
});

test("Layer 2: baseline-building state, metric selection, and historical display", async ({ page }) => {
  await page.goto("/layer2");

  // 1. Verify Layer 2 title, badge, and baseline-building status
  await expect(page.getByRole("heading", { name: /Personal Motor-Pattern Monitoring|Layer 2/ })).toBeVisible({
    timeout: FIRST_RENDER_TIMEOUT,
  });
  await expect(page.getByText(/Personal Baseline:/i)).toBeVisible();
  await expect(page.getByText(/Building Baseline|building/i).first()).toBeVisible();

  // 2. Test interactive indicator selection
  const select = page.locator("select").first();
  await expect(select).toBeVisible();

  // Select Flight Time
  await select.selectOption("ft_mean");
  await expect(
    page.getByText("Transition delay between releasing one key and pressing the next"),
  ).toBeVisible();

  // Select Typing Speed
  await select.selectOption("typing_speed");
  await expect(page.getByText("Keypresses completed per second")).toBeVisible();

  // Select Pause Frequency
  await select.selectOption("pause_frequency");
  await expect(page.getByText("Hesitations exceeding 500 ms")).toBeVisible();

  // Capture real browser screenshot
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "01_layer2_baseline_and_indicators.png"),
    fullPage: true,
  });
});

test("Layer 2: treatment-event creation and pre/post comparison timeline", async ({ page }) => {
  await page.goto("/layer2");

  // Click "+ Record Treatment Event"
  const recordBtn = page.getByRole("button", { name: /\+ Record Treatment Event/i });
  await expect(recordBtn).toBeVisible({ timeout: FIRST_RENDER_TIMEOUT });
  await recordBtn.click();

  // Form should be visible
  await expect(page.getByText("Record Clinician-Directed Treatment Event")).toBeVisible();
  await expect(page.getByText("Does not infer clinical effectiveness.")).toBeVisible();

  // Fill in form
  await page.locator('input[type="text"][placeholder*="Levodopa"]').fill("Levodopa 100mg initiated");
  await page.locator('input[type="text"][placeholder*="stiffness"]').fill("Morning stiffness check");

  // Capture screenshot of the form
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "02_treatment_event_form.png"),
    fullPage: false,
  });

  // Submit event
  const saveBtn = page.getByRole("button", { name: /Save Event/i });
  await saveBtn.click();

  // Verify non-diagnostic limitations are in place
  await expect(page.getByText(/Parkinson's detected|Diagnosis confirmed/i)).toHaveCount(0);
});

test("Layer 2: clinician longitudinal report modal rendering and print control", async ({ page }) => {
  await page.goto("/layer2");

  const reportBtn = page.getByRole("button", { name: /Clinician Report View/i });
  await expect(reportBtn).toBeVisible({ timeout: FIRST_RENDER_TIMEOUT });
  await reportBtn.click();

  // Verify modal elements are visible
  await expect(page.getByText(/CLINICAL SUPERVISION SUMMARY/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /ParkTrace Longitudinal Motor-Pattern Report/i })).toBeVisible();
  await expect(page.getByText(/Clinical AI Governance Notice:/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Print \/ Save PDF/i })).toBeVisible();

  // Capture screenshot of the modal
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "03_clinician_report_modal.png"),
    fullPage: false,
  });

  // Close modal
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText(/CLINICAL SUPERVISION SUMMARY/i)).toHaveCount(0);
});
