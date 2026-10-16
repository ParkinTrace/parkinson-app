import { expect, test } from "@playwright/test";

/**
 * Layer 1 with no account — the funnel the product is built around.
 *
 * Nothing here fabricates a measurement. An unsigned session is seeded exactly
 * as the app leaves it: a summary row in `parkintrace_local_history` plus the
 * per-session snapshot, with `persisted: false`, which is what marks it as a
 * Layer 1 session that no account has claimed yet.
 */
const SID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

const HISTORY = [
  {
    id: SID,
    user_id: "local-user",
    started_at: "2026-10-12T09:14:00.000Z",
    ended_at: "2026-10-12T09:16:00.000Z",
    session_type: "structured",
    device_id: "keyboard-alpha-desktop",
    valid: true,
    quality_flags: [],
    features: {
      ht_mean: 112.5,
      ft_mean: 198.0,
      ikl_mean: 310.5,
      hand_asymmetry: 0.027,
      pause_frequency: 1.1,
      typing_speed: 2.7,
      session_consistency: 0.13,
    },
  },
];

const SNAPSHOT = {
  sessionId: SID,
  startedAt: "2026-10-12T09:14:00.000Z",
  endedAt: "2026-10-12T09:16:00.000Z",
  sessionType: "structured",
  deviceId: "keyboard-alpha-desktop",
  features: {
    ht_mean: 112.5,
    ft_mean: 198.0,
    ikl_mean: 310.5,
    typing_speed: 2.7,
    pause_frequency: 1.1,
    session_consistency: 0.13,
  },
  layer1: { status: "watch", message: "Timing sat slightly outside the research reference." },
  layer2: { status: "watch", baselineStatus: "building" },
  series: {
    elapsed_ms: [180, 420, 690, 950, 1240, 1520],
    rolling_ht_ms: [118, 114, 110, 116, 121, 112],
    rolling_ft_ms: [201, 196, 208, 192, 203, 199],
    rolling_ikl_ms: [319, 310, 318, 308, 324, 311],
  },
  persisted: false,
  localPreview: false,
};

async function seedUnsignedSession(page: import("@playwright/test").Page) {
  await page.addInitScript(
    ({ sid, history, snapshot }) => {
      localStorage.setItem("parkintrace_local_history", JSON.stringify(history));
      localStorage.setItem("parkintrace-last-session", sid);
      sessionStorage.setItem(`parkintrace-snapshot-${sid}`, JSON.stringify(snapshot));
    },
    { sid: SID, history: HISTORY, snapshot: SNAPSHOT },
  );
}

test("the landing is where an unsigned visitor starts, every time", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$|\/\?/);
  await expect(page.getByRole("button", { name: /Give consent and try Layer 1/i })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Give consent and try Layer 1/i })).toBeVisible();
});

test("Layer 1 explains itself before anything has been measured", async ({ page }) => {
  await page.goto("/layer1");
  await expect(page.getByText(/What this measures/i)).toBeVisible();
  await expect(page.getByText(/no practice run/i)).toBeVisible();
  // Nothing to mark complete, and no Layer 2 offer yet.
  await expect(page.getByText(/Layer 1 — complete/i)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Start your first session/i })).toBeVisible();
});

test("an unsigned session shows the Layer 1 mark and the door to Layer 2", async ({ page }) => {
  await seedUnsignedSession(page);
  await page.goto(`/session/${SID}`);

  await expect(page.getByRole("heading", { name: "Session insight" })).toBeVisible();
  await expect(page.getByText(/Layer 1 — complete/i)).toBeVisible();

  const onward = page.getByRole("link", { name: /Continue to Layer 2/i });
  await expect(onward).toBeVisible();
  await onward.click();
  await expect(page).toHaveURL(/\/signup/);
});

test("Layer 1 keeps the mark once a session exists", async ({ page }) => {
  await seedUnsignedSession(page);
  await page.goto("/layer1");
  await expect(page.getByText(/Layer 1 — complete/i)).toBeVisible();
  // Still not a diagnosis, on any Layer 1 screen.
  await expect(page.getByText(/Parkinson's detected|You have Parkinson|Diagnosis confirmed/i)).toHaveCount(0);
});
