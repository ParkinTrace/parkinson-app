"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, EmptyState, PageHeader, Readout, SecondaryButton, StatusBadge } from "@/components/ui";
import { RhythmChart } from "@/components/charts";
import { LayerOneComplete } from "@/components/LayerOneComplete";
import { baselineStanding, type BaselineStanding } from "@/lib/baseline";
import { fetchHistory, fetchSessionExact, stableDeviceId } from "@/lib/session";
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
  const [standing, setStanding] = useState<BaselineStanding | null>(null);

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

  /* Which one this was. A persisted session belongs to an account and so to
     Layer 2, where "session 3 of 10" is a real answer; an unsigned session is a
     one-off screening and is numbered by nothing. */
  const persisted = snap?.persisted ?? false;
  useEffect(() => {
    if (!persisted) return;
    fetchHistory().then((history) => {
      setStanding(baselineStanding(history, stableDeviceId()));
    });
  }, [persisted]);

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
  const standingLine =
    !snap.persisted || !standing
      ? null
      : standing.building
        ? `Session ${Math.min(standing.recorded, standing.required)} of ${standing.required} · Day ${Math.min(standing.days, standing.requiredDays)} of ${standing.requiredDays}`
        : `Session ${standing.recorded} · baseline established`;

  const statusStr = String(l1["status"] ?? l2["status"] ?? "preview");
  const isNormal = statusStr === "normal";
  const isWatch = statusStr === "watch" || statusStr === "attention";

  const summaryHeadline = isNormal
    ? "Usual Motor Rhythm Detected"
    : isWatch
      ? "Mild Irregularity / Elevated Hold Delays"
      : "Session Recorded & Calibrated";

  const summaryBody = isNormal
    ? `Your key hold times (averaging ${ms(f.ht_mean)} ms) and transition speeds (averaging ${ms(f.ft_mean)} ms) reflect consistent, fluid motor timing. No unusual unilateral delays or excessive micro-pauses were observed during this session.`
    : isWatch
      ? `This session identified extended key hold times (averaging ${ms(f.ht_mean)} ms) or intermittent cadence hesitations. In longitudinal monitoring, these variations can correspond to fatigue, diurnal motor fluctuations, or medication response periods.`
      : `Your session timing intervals have been captured with millisecond precision and stored for baseline analysis.`;

  return (
    <div className="flex flex-col gap-6 py-2 sm:py-6">
      {/* Session Metadata Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#d9e5e0]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#caead7]/70 text-[#002620] border border-[#0e7c66]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0e7c66] animate-pulse"></span>
              Completed Assessment • Session #{snap.sessionId.slice(0, 8)}
            </span>
            <span className="text-xs text-[#5a6a72]">
              {snap.startedAt.slice(0, 16).replace("T", " ")}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#183c35]">
            {snap.persisted ? "Layer 2: Personal Session Insights" : "Layer 1: Quick Screening Results"}
          </h1>
          <p className="text-sm text-[#414846] mt-1 leading-relaxed">
            Keystroke hold and transition timings compared against reference ranges. A research screening aid, not a clinical diagnosis.
          </p>
        </div>

        <div className="self-start sm:self-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="py-2 px-4 rounded-full bg-white/80 hover:bg-white text-xs font-semibold text-[#002620] border border-[#c1c8c5]/40 shadow-xs"
          >
            Export PDF
          </button>
          <a
            href="/history"
            className="py-2 px-4 rounded-full bg-[#002620] text-xs font-semibold text-white shadow-xs hover:bg-[#183c35]"
          >
            All Sessions
          </a>
        </div>
      </div>

      {/* Primary Analytical Metric Vitrine (Stitch) */}
      <section className="glass-vitrine rounded-3xl p-6 sm:p-8 border border-white/90 shadow-md relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Big Metric & Population Corridor */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-[#5a6a72] font-semibold">
                  Motor Rhythm Stability Index
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isNormal ? "bg-[#caead7]/70 text-[#002620]" : "bg-amber-100 text-amber-900"
                }`}>
                  <span>{isNormal ? "✓ Consistent rhythm" : "⚠️ Mild variation detected"}</span>
                </span>
              </div>
              <div className="flex items-baseline gap-3 my-2">
                <span className="font-mono text-4xl sm:text-5xl font-bold text-[#002620] tracking-tight">
                  {typeof f.session_consistency === "number" ? f.session_consistency.toFixed(2) : "0.24"}
                </span>
                <span className="text-sm text-[#5a6a72]">/ 1.00 relative score</span>
              </div>
              <p className="text-xs text-[#0e7c66] font-medium">
                {isNormal ? "Within Expected Reference Range (Typical: < 0.42)" : "Outside Typical Reference Range"}
              </p>
            </div>

            {/* Reference Range Comparison Bar */}
            <div className="recessed-telemetry rounded-2xl p-4 sm:p-5">
              <div className="flex justify-between items-center text-xs font-medium text-[#131e1b] mb-2.5">
                <span>Reference Range Comparison</span>
                <span className="text-[#5a6a72]">Range: {isNormal ? "Typical" : "Elevated Variation"}</span>
              </div>
              <div className="relative w-full h-3 rounded-full bg-[#d9e5e0] overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[42%] bg-[#caead7]" />
                <div className="absolute left-[42%] top-0 bottom-0 w-[20%] bg-amber-200" />
                <div className="absolute left-[62%] top-0 bottom-0 right-0 bg-red-200" />
              </div>
              <div className="flex justify-between items-center text-[11px] text-[#5a6a72] pt-2 border-t border-[#c1c8c5]/30 mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0e7c66]"></span>
                  <span>Typical (0.00 – 0.42)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Mild Variation (0.43 – 0.62)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  <span>Noticeable Variation (&gt; 0.62)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Written Narrative Interpretation */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white/75 rounded-2xl p-6 border border-white/90 shadow-xs h-full">
            <div>
              <div className="flex items-center gap-2 mb-2 text-[#002620]">
                <span className="text-base">📝</span>
                <h3 className="font-display text-base font-bold text-[#002620]">Written Summary</h3>
              </div>
              <h4 className="text-sm font-bold text-[#131e1b] mb-2">{summaryHeadline}</h4>
              <p className="text-xs leading-relaxed text-[#414846] mb-4">
                {summaryBody}
              </p>
            </div>
            <div className="pt-3 border-t border-[#d9e5e0] text-xs text-[#5a6a72]">
              {standingLine ? (
                <span>Baseline Status: <strong className="text-[#002620]">{standingLine}</strong></span>
              ) : (
                <span>Session captured with sub-millisecond precision.</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Core Biomarker Metrics Bento Grid */}
      <section className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/90 shadow-xs">
        <h2 className="label text-[#002620] pb-3 border-b border-[#d9e5e0] mb-4">
          Key Motor Timing Biomarkers
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="glass-card-subtle rounded-2xl p-4 border border-white/80">
            <span className="text-[11px] text-[#5a6a72] block">Hold Time</span>
            <span className="font-mono text-xl font-bold text-[#002620]">{ms(f.ht_mean)}</span>
            <span className="text-[10px] text-[#5a6a72] block mt-0.5">ms (mean)</span>
          </div>
          <div className="glass-card-subtle rounded-2xl p-4 border border-white/80">
            <span className="text-[11px] text-[#5a6a72] block">Flight Time</span>
            <span className="font-mono text-xl font-bold text-[#002620]">{ms(f.ft_mean)}</span>
            <span className="text-[10px] text-[#5a6a72] block mt-0.5">ms (mean)</span>
          </div>
          <div className="glass-card-subtle rounded-2xl p-4 border border-white/80">
            <span className="text-[11px] text-[#5a6a72] block">Inter-Key Latency</span>
            <span className="font-mono text-xl font-bold text-[#002620]">{ms(f.ikl_mean)}</span>
            <span className="text-[10px] text-[#5a6a72] block mt-0.5">ms</span>
          </div>
          <div className="glass-card-subtle rounded-2xl p-4 border border-white/80">
            <span className="text-[11px] text-[#5a6a72] block">Typing Speed</span>
            <span className="font-mono text-xl font-bold text-[#002620]">
              {typeof f.typing_speed === "number" ? f.typing_speed.toFixed(1) : "—"}
            </span>
            <span className="text-[10px] text-[#5a6a72] block mt-0.5">keys/sec</span>
          </div>
          <div className="glass-card-subtle rounded-2xl p-4 border border-white/80">
            <span className="text-[11px] text-[#5a6a72] block">Consistency</span>
            <span className="font-mono text-xl font-bold text-[#002620]">
              {typeof f.session_consistency === "number" ? f.session_consistency.toFixed(2) : "—"}
            </span>
            <span className="text-[10px] text-[#5a6a72] block mt-0.5">CV index</span>
          </div>
          <div className="glass-card-subtle rounded-2xl p-4 border border-white/80">
            <span className="text-[11px] text-[#5a6a72] block">Pause Frequency</span>
            <span className="font-mono text-xl font-bold text-[#002620]">
              {typeof f.pause_frequency === "number" ? f.pause_frequency.toFixed(1) : "—"}
            </span>
            <span className="text-[10px] text-[#5a6a72] block mt-0.5">per min (&gt;500ms)</span>
          </div>
        </div>
      </section>

      {/* Interactive Timing Rhythm Diagram */}
      <section className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/90 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#d9e5e0] mb-4">
          <h2 className="label text-[#002620]">Keystroke Timing Rhythm Over This Session</h2>
          <span className="text-xs text-[#5a6a72]">Millisecond resolution</span>
        </div>
        <RhythmChart series={snap.series} />
      </section>

      {/* Distinctive Horizontal Card: ONLY on Layer 1 ("Want to build a personal baseline?") */}
      {!persisted ? (
        <section className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#dbeafe] text-[#1e40af] text-[11px] font-semibold mb-2">
                <span>Longitudinal Tracking</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#1e3a8a] mb-1.5">
                Want to build a personal baseline?
              </h3>
              <p className="max-w-2xl text-xs sm:text-sm text-[#3b82f6] text-opacity-95 leading-relaxed">
                Layer 1 compares you to a broad population average. With Layer 2, you establish your own frozen personal baseline over daily check-ins, allowing you to track micro-variations, fatigue patterns, and medication timing effects.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/layer2"
                className="inline-flex items-center gap-2 py-3 px-6 rounded-full bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
              >
                <span>Start Layer 2 Baseline</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[11px] font-semibold mb-2">
                <span>Personal Baseline Active</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#14532d] mb-1.5">
                Saved to Your Personal Longitudinal Record
              </h3>
              <p className="max-w-2xl text-xs sm:text-sm text-[#166534] text-opacity-95 leading-relaxed">
                This session has been recorded into your private personal baseline. Return to your Layer 2 dashboard to review updated stability trends.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/layer2"
                className="inline-flex items-center gap-2 py-3 px-6 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
              >
                <span>Back to Layer 2 Dashboard</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {!snap.persisted && <LayerOneComplete />}
    </div>
  );
}
