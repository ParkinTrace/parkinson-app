"use client";
/** On-device snapshot cache keyed by EXACT session id. Lets the detail page
 *  show the just-finished session even before/without cloud persistence.
 *  Never used as a fallback for a DIFFERENT id (spec 16). */
import type { SessionPayload } from "@/lib/types";

export interface Snapshot {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  sessionType: string;
  layer?: "layer1" | "layer2";
  deviceId: string;
  features: Record<string, number | null>;
  layer1: Record<string, unknown> | null;
  layer2: Record<string, unknown> | null;
  series: {
    elapsed_ms: number[];
    rolling_ht_ms: number[];
    rolling_ft_ms: number[];
    rolling_ikl_ms: number[];
  } | null;
  persisted: boolean;
  localPreview: boolean;
}

const key = (id: string) => `parkintrace-snapshot-${id}`;

export function saveSnapshot(s: Snapshot) {
  try {
    sessionStorage.setItem(key(s.sessionId), JSON.stringify(s));
    localStorage.setItem("parkintrace-last-session", s.sessionId);

    // Maintain parkintrace_local_history with explicit layer distinction
    const historyKey = "parkintrace_local_history";
    const existingRaw = localStorage.getItem(historyKey);
    const history: Array<Record<string, unknown>> = existingRaw ? JSON.parse(existingRaw) : [];
    if (!history.some((item) => item.id === s.sessionId)) {
      history.push({
        id: s.sessionId,
        user_id: "local-user",
        started_at: s.startedAt,
        ended_at: s.endedAt,
        session_type: s.sessionType,
        layer: s.layer ?? (s.sessionType === "motor_task" ? "layer2" : "layer1"),
        device_id: s.deviceId,
        valid: true,
        quality_flags: [],
        features: s.features,
      });
      localStorage.setItem(historyKey, JSON.stringify(history));
    }
  } catch {
    /* private mode */
  }
}

export function loadSnapshot(id: string): Snapshot | null {
  try {
    const raw = sessionStorage.getItem(key(id));
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

export function lastSessionId(): string | null {
  try {
    return localStorage.getItem("parkintrace-last-session");
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- pending --
 * A session measured with no account cannot be written anywhere, but the
 * person who typed it should not lose it by signing up afterwards. The full
 * payload is held here — the timing events included, because the Layer 1
 * result cannot be rebuilt from summary numbers alone — and handed to the
 * account by claimLocalSessions() once one exists.
 *
 * Events carry hold/flight timing and key identity. They never carry the
 * characters typed; that is dropped before this is written.
 * -------------------------------------------------------------------------- */

const PENDING_KEY = "parkintrace_pending_sessions";

/** Local storage is not a database: keep enough to make a first session
 *  count, not an archive. Oldest entries are trimmed first. */
const PENDING_CAP = 20;

export function savePending(payload: SessionPayload): void {
  // Layer 1 is only a sample screening session and must NEVER be claimed into an account's baseline
  if (payload.layer === "layer1") return;

  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const list: SessionPayload[] = raw ? JSON.parse(raw) : [];
    if (list.some((p) => p.sessionId === payload.sessionId)) return;
    list.push(payload);
    while (list.length > PENDING_CAP) list.shift();
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch {
    /* private mode */
  }
}

export function readPending(): SessionPayload[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as SessionPayload[]) : [];
  } catch {
    return [];
  }
}

export function clearPending(sessionIds: string[]): void {
  try {
    const keep = readPending().filter((p) => !sessionIds.includes(p.sessionId));
    if (keep.length) localStorage.setItem(PENDING_KEY, JSON.stringify(keep));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* private mode */
  }
}

/** Drop claimed rows from the offline view so one session is never counted
 *  twice — once from the account, once from this browser. */
export function forgetLocalHistory(sessionIds: string[]): void {
  try {
    const raw = localStorage.getItem("parkintrace_local_history");
    if (!raw) return;
    const rows = (JSON.parse(raw) as Array<{ id?: string }>).filter(
      (r) => !sessionIds.includes(String(r.id)),
    );
    localStorage.setItem("parkintrace_local_history", JSON.stringify(rows));
  } catch {
    /* private mode */
  }
}

/** Whether this browser has already accepted the consent text, so a sign-up
 *  that follows a Layer 1 session does not ask for it twice. */
export function hasLocalConsent(): boolean {
  try {
    const raw = localStorage.getItem("parkintrace-consent");
    if (!raw) return false;
    return Boolean((JSON.parse(raw) as { agreed?: boolean }).agreed);
  } catch {
    return false;
  }
}
