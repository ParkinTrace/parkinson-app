import type { SessionRow } from "@/lib/types";

/** Client-side baseline progress mirror (display only; the backend gate is
 *  authoritative). Rules: 10+ valid sessions, 5+ distinct days, 21-day
 *  window, one anchor device. Blocking flags exclude; unusual_hour never
 *  excludes (spec 10.1). */
const BLOCKING = new Set(["too_short", "too_few_keystrokes"]);

export interface BaselineProgress {
  status: "building" | "established";
  sessions: number;
  required: number;
  distinctDays: number;
  requiredDays: number;
  anchorDevice: string | null;
}

export function baselineProgress(sessions: SessionRow[], deviceId: string): BaselineProgress {
  const eligible = sessions.filter(
    (s) => s.valid && !(s.quality_flags ?? []).some((f) => BLOCKING.has(f)),
  );
  if (eligible.length < 10) {
    return {
      status: "building", sessions: eligible.length, required: 10,
      distinctDays: new Set(eligible.map((s) => s.started_at.slice(0, 10))).size,
      requiredDays: 5, anchorDevice: null,
    };
  }
  const sorted = [...eligible].sort((a, b) => a.started_at.localeCompare(b.started_at));
  const start = new Date(sorted[0].started_at).getTime();
  const inWindow = sorted.filter((s) => new Date(s.started_at).getTime() - start <= 21 * 86400_000);
  const counts = new Map<string, number>();
  for (const s of inWindow) counts.set(s.device_id, (counts.get(s.device_id) ?? 0) + 1);
  const [anchor, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const anchored = inWindow.filter((s) => s.device_id === anchor);
  const days = new Set(anchored.map((s) => s.started_at.slice(0, 10))).size;
  const established =
    inWindow.length >= 10 && days >= 5 && (count ?? 0) >= 10 && anchored.length >= 10 && anchor === deviceId;
  return {
    status: established ? "established" : "building",
    sessions: anchored.length, required: 10,
    distinctDays: days, requiredDays: 5, anchorDevice: anchor,
  };
}

export interface BaselineStanding {
  building: boolean;
  /** Valid sessions recorded so far. */
  recorded: number;
  /** The number of the session about to be recorded (1-based). */
  next: number;
  /** Recording days so far. */
  days: number;
  /** Recording days counting today, if today is not already recorded. */
  daysWithToday: number;
  required: number;
  requiredDays: number;
  recordedToday: boolean;
}

/**
 * Where you are in your own baseline, in the two numbers that move
 * independently: sessions and recording days. Two sessions in one day advance
 * the first and not the second, which is the whole reason a baseline needs
 * several visits — so a single "3 of 10" would hide the part that matters.
 */
export function baselineStanding(rows: SessionRow[], deviceId: string): BaselineStanding {
  const p = baselineProgress(rows, deviceId);
  const valid = rows.filter((s) => s.valid !== false);
  const today = new Date().toISOString().slice(0, 10);
  const recordedToday = valid.some((s) => s.started_at.slice(0, 10) === today);
  return {
    building: p.status === "building",
    recorded: p.sessions,
    next: p.sessions + 1,
    days: p.distinctDays,
    daysWithToday: recordedToday ? p.distinctDays : p.distinctDays + 1,
    required: p.required,
    requiredDays: p.requiredDays,
    recordedToday,
  };
}
