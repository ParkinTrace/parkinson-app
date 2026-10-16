"use client";
import { use, useEffect, useState } from "react";
import { Card, EmptyState, PageHeader, Readout, SecondaryButton, StatusBadge } from "@/components/ui";
import { RhythmChart } from "@/components/charts";
import { fetchSessionExact } from "@/lib/session";
import { loadSnapshot, type Snapshot } from "@/lib/localCache";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { SessionNotFoundError } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/config";

/** Exact session detail (spec 16): the requested id, or "Session not
 *  found". Never another session, never a redirect to one. */
export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      // Supabase is authoritative only for a signed-in owner. Signed-out
      // visitors (analysis-only + local snapshot) go straight to the
      // exact-id local snapshot — otherwise "Sign-in required" would hide
      // their just-completed session insight.
      if (isSupabaseConfigured) {
        const supa = supabaseBrowser();
        const { data } = supa ? await supa.auth.getUser() : { data: { user: null } };
        if (data.user) {
          try {
            const { session, metrics } = await fetchSessionExact(id);
            const m = (metrics ?? {}) as Record<string, Record<string, number | null> | null>;
            setSnap({
              sessionId: session.id, startedAt: session.started_at, endedAt: session.ended_at,
              sessionType: session.session_type, deviceId: session.device_id,
              features: (m["features"] as Record<string, number | null>) ?? {},
              layer1: (m["layer1_result"] as Record<string, unknown>) ?? null,
              layer2: (m["layer2_result"] as Record<string, unknown>) ?? null,
              series: (m["within_session_series"] as Snapshot["series"]) ?? null,
              persisted: true, localPreview: false,
            });
            return;
          } catch (e) {
            if (!(e instanceof SessionNotFoundError)) {
              setError(e instanceof Error ? e.message : "Fetch failed");
              return;
            }
          }
        }
      }
      const local = loadSnapshot(id);
      if (local) setSnap(local);
      else setMissing(true);
    };
    run();
  }, [id]);

  if (missing) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Exact session" title="Session insight" />
        <EmptyState
          title="Session not found"
          body={`No session with id ${id} exists for this user. Another session is never substituted.`}
        />
        <div>
          <SecondaryButton href="/dashboard">Back to dashboard</SecondaryButton>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Exact session" title="Session insight" />
        <p className="rounded-md border border-alert/25 bg-alert-wash px-3 py-2 text-sm text-alert">{error}</p>
      </div>
    );
  }

  if (!snap) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Exact session" title="Session insight" />
        <p className="text-sm text-muted">Loading session…</p>
      </div>
    );
  }

  const l1 = (snap.layer1 ?? {}) as Record<string, unknown>;
  const l2 = (snap.layer2 ?? {}) as Record<string, unknown>;
  const f = snap.features;
  const ms = (v: number | null | undefined) => (typeof v === "number" ? v.toFixed(0) : "—");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Exact session"
        title="Session insight"
        description={`${snap.startedAt.slice(0, 16).replace("T", " ")} · ${snap.sessionType} · device ${snap.deviceId}${
          snap.localPreview ? " · on-device preview (not yet analysed)" : ""
        }`}
        actions={<SecondaryButton href="/history">All sessions</SecondaryButton>}
      />

      <p className="font-mono text-[11px] text-muted">session {snap.sessionId}</p>

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-hair pb-3">
          <h2 className="label">Measured timing</h2>
          <StatusBadge status={String(l1["status"] ?? l2["status"] ?? "preview")} />
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {String(
            l1["message"] ?? l2["message"] ?? "Session saved. Baseline status: building.",
          )}
        </p>

        {typeof l2["baselineStatus"] === "string" && (
          <p className="mt-1 text-xs text-muted">Baseline: {l2["baselineStatus"]}</p>
        )}

        <dl className="mt-4 flex flex-col">
          <Readout label="Hold time" value={ms(f.ht_mean)} unit="ms" hint="How long each key stays down" />
          <Readout label="Flight time" value={ms(f.ft_mean)} unit="ms" hint="Gap before the next keypress" />
          <Readout label="Inter-key latency" value={ms(f.ikl_mean)} unit="ms" hint="Press to press" />
          <Readout
            label="Typing speed"
            value={typeof f.typing_speed === "number" ? f.typing_speed.toFixed(2) : "—"}
            unit="keys/s"
          />
          <Readout
            label="Rhythm consistency"
            value={typeof f.session_consistency === "number" ? f.session_consistency.toFixed(2) : "—"}
            unit="CV"
            hint="Variability divided by mean"
          />
          <Readout
            label="Pause frequency"
            value={typeof f.pause_frequency === "number" ? f.pause_frequency.toFixed(1) : "—"}
            unit="per min"
            hint="Hesitations over 500 ms"
          />
        </dl>
      </Card>

      <RhythmChart series={snap.series} />
    </div>
  );
}
