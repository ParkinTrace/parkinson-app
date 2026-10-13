"use client";
/** On-device snapshot cache keyed by EXACT session id. Lets the detail page
 *  show the just-finished session even before/without cloud persistence.
 *  Never used as a fallback for a DIFFERENT id (spec 16). */

export interface Snapshot {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  sessionType: string;
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

    // Maintain parkintrace_local_history for seamless offline/local Layer 2 longitudinal trends
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
