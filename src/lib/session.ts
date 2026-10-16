import { API_URL } from "@/lib/config";
import { clearPending, forgetLocalHistory, readPending } from "@/lib/localCache";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { SessionNotFoundError, type SessionPayload, type SessionRow } from "@/lib/types";

export function newSessionId(): string {
  return crypto.randomUUID();
}

export function stableDeviceId(): string {
  const key = "parkintrace-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `browser-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

async function api(path: string, body: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const supa = supabaseBrowser();
  if (supa) {
    try {
      const { data } = await supa.auth.getSession();
      if (data?.session?.access_token) {
        headers["authorization"] = `Bearer ${data.session.access_token}`;
      }
    } catch {
      // Fallback
    }
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Analysis service ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

/** Canonical lifecycle (spec 14): persist session, analyze with the SAME id,
 *  persist metrics against the SAME id. Never mints a second id. */
export async function persistAndAnalyze(
  payload: SessionPayload,
  opts: { baseline?: Record<string, unknown> | null; recent?: Record<string, unknown>[] } = {},
): Promise<{ analysis: Record<string, unknown>; persisted: boolean }> {
  const supa = supabaseBrowser();
  let persisted = false;
  // Owner-only persistence (spec 18/RLS): persist only for a signed-in
  // owner. Signed-out visitors get analysis-only + local snapshot — never
  // a write with a placeholder user id (FK + RLS reject it, and the throw
  // used to block navigation to the session insight entirely).
  let ownerId: string | null = null;
  if (supa) {
    const { data: auth } = await supa.auth.getUser();
    ownerId = auth.user?.id ?? null;
  }
  if (supa && ownerId) {
    const { error } = await supa.from("sessions").upsert(
      {
        id: payload.sessionId,
        user_id: ownerId,
        started_at: payload.startedAt,
        ended_at: payload.endedAt,
        session_type: payload.sessionType,
        device_id: payload.deviceId,
        device_metadata: { layer: payload.layer ?? "layer2" },
        valid: true,
        quality_flags: payload.qualityFlags,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(`Session persist failed: ${error.message}`);
    persisted = true;
  }

  const analysis = await api("/api/v1/analysis/session", {
    ...payload,
    baseline: opts.baseline ?? null,
    recent: opts.recent ?? [],
  });

  if (supa && ownerId) {
    const layer1 = (analysis as Record<string, Record<string, unknown>>)["layer1"] ?? null;
    const layer2 = (analysis as Record<string, Record<string, unknown>>)["layer2"] ?? null;
    const features = (analysis as Record<string, Record<string, number>>)["features"] ?? {};
    const series = (analysis as Record<string, unknown>)["withinSessionSeries"] ?? null;
    const { error } = await supa.from("session_metrics").upsert(
      {
        session_id: payload.sessionId,
        user_id: ownerId,
        features,
        quality_metrics: { keystrokeCount: payload.keystrokeCount, qualityFlags: payload.qualityFlags },
        layer1_result: layer1,
        layer2_result: layer2,
        within_session_series: series,
      },
      { onConflict: "session_id" },
    );
    if (error) throw new Error(`Metrics persist failed: ${error.message}`);
  }
  return { analysis: analysis as Record<string, unknown>, persisted };
}

export async function claimLocalSessions(): Promise<number> {
  const pending = readPending();
  if (!pending.length) return 0;

  const supa = supabaseBrowser();
  if (!supa) return 0;
  const { data } = await supa.auth.getUser();
  if (!data.user) return 0;

  const claimed: string[] = [];
  // Only claim Layer 2 sessions; Layer 1 is strictly a sample screening test
  const eligible = pending.filter((p) => p.layer !== "layer1");
  for (const payload of eligible) {
    try {
      await persistAndAnalyze(payload);
      claimed.push(payload.sessionId);
    } catch {
      break;
    }
  }

  // Also clear any accidental pending layer1 items so they don't linger
  const allToClear = [...claimed, ...pending.filter((p) => p.layer === "layer1").map((p) => p.sessionId)];
  if (allToClear.length) {
    clearPending(allToClear);
    forgetLocalHistory(claimed);
  }
  return claimed.length;
}

/** Exact retrieval (spec 16): the requested id or SessionNotFoundError.
 *  NEVER falls back to another session. */
export async function fetchSessionExact(sessionId: string): Promise<{ session: SessionRow; metrics: unknown }> {
  const supa = supabaseBrowser();
  if (!supa) throw new Error("Backend not configured");
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) throw new Error("Sign-in required");
  const { data: row, error } = await supa.from("sessions").select("*").eq("id", sessionId).limit(1).maybeSingle();
  if (error) throw new Error(`Session fetch failed: ${error.message}`);
  if (!row) throw new SessionNotFoundError(sessionId);
  const { data: metrics } = await supa.from("session_metrics").select("*").eq("session_id", sessionId).limit(1).maybeSingle();
  const meta = (row.device_metadata as Record<string, unknown> | null) ?? {};
  const layer = (meta.layer as "layer1" | "layer2" | undefined) ?? (row.layer as "layer1" | "layer2" | undefined) ?? (row.session_type === "motor_task" ? "layer2" : undefined);
  return { session: { ...row, layer } as SessionRow, metrics };
}

export async function fetchHistory(limit = 200): Promise<SessionRow[]> {
  const supa = supabaseBrowser();
  if (supa) {
    const { data: auth } = await supa.auth.getUser();
    if (auth.user) {
      const { data } = await supa
        .from("sessions")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("started_at", { ascending: true })
        .limit(limit);
      return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
        const meta = (r.device_metadata as Record<string, unknown> | null) ?? {};
        const layer =
          (meta.layer as "layer1" | "layer2" | undefined) ??
          (r.layer as "layer1" | "layer2" | undefined) ??
          (r.session_type === "motor_task" ? "layer2" : undefined);
        return {
          ...r,
          layer,
        } as SessionRow;
      });
    }
  }
  // Local storage fallback for offline / test environments
  if (typeof window !== "undefined") {
    try {
      const local = localStorage.getItem("parkintrace_local_history");
      if (local) {
        const parsed = JSON.parse(local) as Array<Record<string, unknown>>;
        return parsed.map((r) => {
          const meta = (r.device_metadata as Record<string, unknown> | null) ?? {};
          const layer =
            (r.layer as "layer1" | "layer2" | undefined) ??
            (meta.layer as "layer1" | "layer2" | undefined) ??
            (r.session_type === "motor_task" ? "layer2" : undefined);
          return {
            ...r,
            layer,
          } as SessionRow;
        });
      }
    } catch {}
  }
  return [];
}
