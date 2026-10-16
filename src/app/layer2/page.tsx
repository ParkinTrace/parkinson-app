"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  EmptyState,
  Meter,
  PageHeader,
  PrimaryButton,
  Readout,
  SecondaryButton,
  StateDot,
  StatusBadge,
} from "@/components/ui";
import { LongitudinalChart, type TrendPoint } from "@/components/charts";
import { ClinicianReportModal } from "@/components/ClinicianReportModal";
import { baselineProgress } from "@/lib/baseline";
import { fetchHistory, stableDeviceId } from "@/lib/session";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { API_URL } from "@/lib/config";
import type { ClinicianReport, SessionRow, TreatmentComparison, TreatmentEvent } from "@/lib/types";

/** Robust z-score cut used for the scorecard state, matching the backend
 *  Layer 2 engine (ROBUST_Z_WATCH in app/core/constants.py). */
const ROBUST_Z_WATCH = 2.0;

/** A value is flagged only when it sits ROBUST_Z_WATCH robust SDs away
 *  from the user's OWN frozen baseline median/MAD. No clinical cutoff is
 *  hardcoded. Without a baseline the state is unknown. */
type BaselineStat = { median: number; mad: number };

/** "unknown" when the session has no value; "elevated" when the value is
 *  ROBUST_Z_WATCH robust SDs above the personal baseline; else "normal". */
function metricState(
  value: number | null,
  stat: BaselineStat | undefined,
): "unknown" | "normal" | "elevated" {
  if (value === null) return "unknown";
  if (!stat || !stat.mad) return "unknown";
  const robustZ = (value - stat.median) / (1.4826 * stat.mad);
  return robustZ >= ROBUST_Z_WATCH ? "elevated" : "normal";
}

const INDICATOR_OPTIONS = [
  { key: "ht_mean", label: "Hold Time (ms)", desc: "How long each key is held down, on average." },
  { key: "ft_mean", label: "Flight Time (ms)", desc: "Transition delay between releasing one key and pressing the next" },
  { key: "ikl_mean", label: "Inter-Key Latency (ms)", desc: "Total elapsed time between successive keypresses (typing pace)" },
  { key: "typing_speed", label: "Typing Speed (keys/s)", desc: "Keypresses completed per second" },
  { key: "pause_frequency", label: "Pause Frequency (/min)", desc: "Hesitations exceeding 500 ms" },
  { key: "session_consistency", label: "Rhythm Consistency", desc: "Variability normalised by mean rhythm (steadiness)" },
  { key: "hand_asymmetry", label: "Hand Asymmetry", desc: "Left versus right hand hold-duration difference" },
];

// Sample Research Cohort Profile (for demo / presentation evaluation)
function generateDemoData() {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 14);

  const demoSessions: SessionRow[] = [];
  const demoPoints: TrendPoint[] = [];

  const htValues = [84.2, 85.1, 83.9, 86.0, 85.5, 84.8, 87.2, 86.4, 85.0, 84.3, 76.5, 75.8];
  const ftValues = [98.1, 99.4, 97.5, 101.2, 99.0, 98.6, 102.1, 100.5, 99.2, 98.0, 91.2, 90.5];
  const iklValues = [182.3, 184.5, 181.4, 187.2, 184.5, 183.4, 189.3, 186.9, 184.2, 182.3, 167.7, 166.3];
  const speeds = [5.12, 5.08, 5.15, 4.95, 5.05, 5.10, 4.90, 4.98, 5.06, 5.14, 5.58, 5.62];
  // Ratios (abs(L-R)/max(L,R)), same unit the extractor emits — not ms.
  const asyms = [0.032, 0.029, 0.034, 0.041, 0.030, 0.033, 0.045, 0.038, 0.032, 0.031, 0.022, 0.020];
  const pauses = [0.8, 0.9, 0.7, 1.2, 0.8, 0.8, 1.4, 1.0, 0.8, 0.7, 0.4, 0.3];
  const consistencies = [0.13, 0.14, 0.12, 0.16, 0.13, 0.14, 0.17, 0.15, 0.13, 0.12, 0.09, 0.08];

  for (let i = 0; i < 12; i++) {
    const sDate = new Date(baseDate);
    sDate.setDate(sDate.getDate() + Math.floor(i * 1.1));
    const iso = sDate.toISOString();

    demoSessions.push({
      id: `demo-session-${i + 1}`,
      user_id: "demo-subject-001",
      started_at: iso,
      ended_at: new Date(sDate.getTime() + 45000).toISOString(),
      session_type: "structured",
      device_id: "clinic-desktop-anchor",
      valid: true,
      quality_flags: [],
      features: {
        ht_mean: htValues[i],
        ft_mean: ftValues[i],
        ikl_mean: iklValues[i],
        typing_speed: speeds[i],
        hand_asymmetry: asyms[i],
        pause_frequency: pauses[i],
        session_consistency: consistencies[i],
      },
    });

    demoPoints.push({
      date: iso,
      ht_mean: htValues[i],
      ft_mean: ftValues[i],
      ikl_mean: iklValues[i],
      typing_speed: speeds[i],
      hand_asymmetry: asyms[i],
      pause_frequency: pauses[i],
      session_consistency: consistencies[i],
    });
  }

  const demoEvent: TreatmentEvent = {
    id: "demo-treatment-01",
    userId: "demo-subject-001",
    eventDate: new Date(baseDate.getTime() + 10 * 86400000).toISOString(),
    eventType: "medication_change",
    description: "Initiated Levodopa/Carbidopa 100/25 mg BID",
    notes: "Titration directed by neurologist. Recorded so keystroke timing before and after can be compared.",
    createdAt: new Date().toISOString(),
  };

  const demoComparison: TreatmentComparison = {
    event_id: demoEvent.id,
    event_date: demoEvent.eventDate,
    event_type: demoEvent.eventType,
    description: demoEvent.description,
    pre_session_count: 10,
    post_session_count: 2,
    pre_date_range: [demoSessions[0].started_at, demoSessions[9].started_at],
    post_date_range: [demoSessions[10].started_at, demoSessions[11].started_at],
    feature_comparisons: [
      { feature: "ht_mean", human_name: "Hold Time", pre_median: 85.0, post_median: 76.15, difference: -8.85, percent_change: -10.4 },
      { feature: "hand_asymmetry", human_name: "Hand Asymmetry", pre_median: 0.0355, post_median: 0.021, difference: -0.0145, percent_change: -40.8 },
      { feature: "ft_mean", human_name: "Flight Time", pre_median: 99.0, post_median: 90.85, difference: -8.15, percent_change: -8.2 },
      { feature: "ikl_mean", human_name: "Inter-Key Latency", pre_median: 184.2, post_median: 167.0, difference: -17.2, percent_change: -9.3 },
      { feature: "typing_speed", human_name: "Typing Speed", pre_median: 5.06, post_median: 5.60, difference: 0.54, percent_change: 10.7 },
    ],
    disclaimer: "Descriptive timing comparison only. Does not evaluate medication efficacy.",
  };

  const demoStats = {
    ht_mean: { median: 85.0, mad: 0.8 },
    ft_mean: { median: 99.0, mad: 1.2 },
    ikl_mean: { median: 184.2, mad: 1.8 },
    typing_speed: { median: 5.06, mad: 0.08 },
    hand_asymmetry: { median: 0.032, mad: 0.003 },
    pause_frequency: { median: 0.8, mad: 0.1 },
    session_consistency: { median: 0.13, mad: 0.01 },
  };

  return { demoSessions, demoPoints, demoEvent, demoComparison, demoStats };
}

export default function Layer2Page() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("ht_mean");
  const [baselineStats, setBaselineStats] = useState<Record<string, { median: number; mad: number }> | null>(null);
  const [treatmentEvents, setTreatmentEvents] = useState<TreatmentEvent[]>([]);
  const [comparisons, setComparisons] = useState<TreatmentComparison[]>([]);
  const [report, setReport] = useState<ClinicianReport | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDemoActive, setIsDemoActive] = useState(false);

  // New Event Form State
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [eventType, setEventType] = useState<string>("medication_change");
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submittingEvent, setSubmittingEvent] = useState(false);

  const loadRealData = async () => {
    const rows = await fetchHistory();
    setSessions(rows);
    const supa = supabaseBrowser();
    let activeUserId: string | null = null;

    if (supa) {
      const { data: auth } = await supa.auth.getUser();
      if (auth.user) {
        activeUserId = auth.user.id;
      }
    }
    if (!activeUserId && typeof window !== "undefined") {
      activeUserId = localStorage.getItem("parkintrace_user_id") || "00000000-0000-0000-0000-000000000000";
    }
    setUserId(activeUserId);

    if (supa && activeUserId && activeUserId !== "00000000-0000-0000-0000-000000000000") {
      const { data: metricsData } = await supa
        .from("session_metrics")
        .select("*")
        .eq("user_id", activeUserId)
        .order("created_at");

      if (metricsData && metricsData.length > 0) {
        setPoints(
          (metricsData as { created_at: string; features?: Record<string, number | null> }[]).map((m) => ({
            date: m.created_at,
            ht_mean: m.features?.ht_mean ?? null,
            ft_mean: m.features?.ft_mean ?? null,
            ikl_mean: m.features?.ikl_mean ?? null,
            typing_speed: m.features?.typing_speed ?? null,
            pause_frequency: m.features?.pause_frequency ?? null,
            session_consistency: m.features?.session_consistency ?? null,
            hand_asymmetry: m.features?.hand_asymmetry ?? null,
          }))
        );
      }
    } else if (rows.length > 0) {
      setPoints(
        rows.map((s) => ({
          date: s.started_at,
          ht_mean: s.features?.ht_mean ?? null,
          ft_mean: s.features?.ft_mean ?? null,
          ikl_mean: s.features?.ikl_mean ?? null,
          typing_speed: s.features?.typing_speed ?? null,
          pause_frequency: s.features?.pause_frequency ?? null,
          session_consistency: s.features?.session_consistency ?? null,
          hand_asymmetry: s.features?.hand_asymmetry ?? null,
        }))
      );
    }

    if (activeUserId) {
      try {
        const bRes = await fetch(`${API_URL}/api/v1/baseline?user_id=${activeUserId}`);
        if (bRes.ok) {
          const bData = await bRes.json();
          if (bData.baseline?.baseline_statistics) {
            setBaselineStats(bData.baseline.baseline_statistics);
          } else if (bData.baseline?.features) {
            setBaselineStats(bData.baseline.features);
          }
        }
      } catch {}

      try {
        const tRes = await fetch(`${API_URL}/api/v1/treatment-events?user_id=${activeUserId}`);
        if (tRes.ok) {
          const evs: TreatmentEvent[] = await tRes.json();
          setTreatmentEvents(evs);
          const comps: TreatmentComparison[] = [];
          for (const ev of evs) {
            const cRes = await fetch(`${API_URL}/api/v1/treatment-events/${ev.id}/comparison?user_id=${activeUserId}`);
            if (cRes.ok) {
              comps.push(await cRes.json());
            }
          }
          setComparisons(comps);
        }
      } catch {}
    }
    setLoaded(true);
  };

  useEffect(() => {
    // Initial data load on mount — intentional fetch-then-set, not a render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRealData();
  }, []);

  const handleToggleDemo = () => {
    if (isDemoActive) {
      setIsDemoActive(false);
      loadRealData();
    } else {
      const { demoSessions, demoPoints, demoEvent, demoComparison, demoStats } = generateDemoData();
      setSessions(demoSessions);
      setPoints(demoPoints);
      setBaselineStats(demoStats);
      setTreatmentEvents([demoEvent]);
      setComparisons([demoComparison]);
      setIsDemoActive(true);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !description) return;
    setSubmittingEvent(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/treatment-events?user_id=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDate: new Date(eventDate).toISOString(),
          eventType,
          description,
          notes,
        }),
      });
      if (res.ok) {
        const newEv: TreatmentEvent = await res.json();
        setTreatmentEvents((prev) => [newEv, ...prev]);
        setShowEventForm(false);
        setDescription("");
        setNotes("");

        const cRes = await fetch(`${API_URL}/api/v1/treatment-events/${newEv.id}/comparison?user_id=${userId}`);
        if (cRes.ok) {
          const comp = await cRes.json();
          setComparisons((prev) => [comp, ...prev]);
        }
      }
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleOpenReport = async () => {
    if (isDemoActive) {
      setReport({
        report_id: "REP-DEMO-20261014",
        generated_at: new Date().toISOString(),
        user_id: "demo-subject-001",
        compliance: {
          total_sessions: 12,
          valid_sessions: 12,
          invalid_sessions: 0,
          distinct_days: 8,
          monitoring_span_days: 14,
          earliest_session: sessions[0]?.started_at ?? new Date().toISOString(),
          latest_session: sessions[sessions.length - 1]?.started_at ?? new Date().toISOString(),
        },
        baseline: {
          status: "established",
          anchor_device_id: "clinic-desktop-anchor",
          reference_intervals: {
            ht_mean: { median: 85.0, mad: 0.8, p25: 84.2, p75: 86.0 },
            ft_mean: { median: 99.0, mad: 1.2, p25: 98.0, p75: 100.8 },
            ikl_mean: { median: 184.2, mad: 1.8, p25: 182.0, p75: 186.5 },
            typing_speed: { median: 5.06, mad: 0.08, p25: 4.98, p75: 5.14 },
          },
        },
        persistent_motor_pattern_changes: [],
        treatment_timeline: comparisons,
        clinical_governance_disclaimer:
          "ParkTrace is an investigational research prototype for objective motor-pattern monitoring. Typing dynamics alone do not establish a medical diagnosis of Parkinson's disease. Observations are intended for clinical consultation and UPDRS motor correlation.",
      });
      setShowReport(true);
      return;
    }

    if (!userId) {
      alert("Sign in required to compile a patient longitudinal report.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/v1/reports/clinician-summary?user_id=${userId}`);
      if (res.ok) {
        setReport(await res.json());
        setShowReport(true);
      }
    } catch {
      alert("Failed to compile clinician longitudinal report.");
    }
  };

  if (!loaded) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Layer 02"
          title="Personal Motor-Pattern Monitoring"
          description="Within-person baseline and change detection. Nothing here is compared against other people — only against your own frozen reference."
        />
        <p className="text-sm text-muted">Loading personal monitoring dashboard…</p>
      </div>
    );
  }

  if (!sessions.length && !isDemoActive) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Layer 02"
          title="Personal Motor-Pattern Monitoring"
          description="Within-person baseline and change detection. Nothing here is compared against other people — only against your own frozen reference."
        />
        <EmptyState
          title="No sessions recorded yet"
          body="Personal baseline monitoring needs repeated typing sessions on different days before it can compare you with yourself. Until then it reports no baseline reference rather than guessing."
        />
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={() => router.push("/test")}>Start a typing session</PrimaryButton>
          <SecondaryButton onClick={handleToggleDemo}>Demo profile</SecondaryButton>
        </div>
      </div>
    );
  }

  const progress = baselineProgress(sessions, isDemoActive ? "clinic-desktop-anchor" : stableDeviceId());
  const selectedOption = INDICATOR_OPTIONS.find((o) => o.key === selectedMetric) ?? INDICATOR_OPTIONS[0];
  const currentBaselineMedian = baselineStats?.[selectedMetric]?.median ?? null;

  // Latest values. Missing values stay null — the UI shows "—" rather than
  // inventing a plausible-looking number.
  const latestSession = sessions[sessions.length - 1];
  const latestFeats = latestSession?.features ?? {};
  const num = (v: number | null | undefined): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const latestHt = num(latestFeats.ht_mean);
  const latestAsym = num(latestFeats.hand_asymmetry);
  const latestConsistency = num(latestFeats.session_consistency);
  const latestPauses = num(latestFeats.pause_frequency);

  // Each metric is judged against the user's OWN frozen baseline with the
  // same robust-z rule the backend engine uses. No global cutoff.
  const states = {
    ht: metricState(latestHt, baselineStats?.ht_mean),
    consistency: metricState(latestConsistency, baselineStats?.session_consistency),
    asymmetry: metricState(
      latestAsym === null ? null : Math.abs(latestAsym),
      baselineStats?.hand_asymmetry,
    ),
    pauses: metricState(latestPauses, baselineStats?.pause_frequency),
  };

  const isBaselineEstablished = progress.status === "established" || isDemoActive;
  const elevatedCount = Object.values(states).filter((s) => s === "elevated").length;
  const isDriftDetected = isBaselineEstablished && elevatedCount > 0;

  // This block describes what was measured against what reference. It does
  // not name a condition and does not recommend a diagnosis.
  let headline = "Baseline still being built";
  let message = `Collected ${progress.sessions} of ${progress.required} qualifying sessions across ${progress.distinctDays} of ${progress.requiredDays} distinct days. Layer 2 compares a session only against your own frozen reference, so no value is flagged until that reference exists.`;

  if (isBaselineEstablished && isDriftDetected) {
    headline = `${elevatedCount} of 4 latest values sit above your personal range`;
    message =
      "At least one reading in the latest session is more than two robust standard deviations from your own frozen baseline. That is a change relative to you and nothing more: it is not a clinical finding, and the same shift can follow fatigue, a different keyboard or a different time of day. The clinician report lays out the individual values so they can be reviewed in person.";
  } else if (isBaselineEstablished) {
    headline = "All four latest values sit within your personal range";
    message =
      "Every reading in the latest session falls inside your own frozen reference intervals. No value moved by more than two robust standard deviations from your baseline.";
  }

  const latest = { ht: latestHt, consistency: latestConsistency, asym: latestAsym, pauses: latestPauses };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={isDemoActive ? "Layer 02 — demo profile" : "Layer 02"}
        title="Personal Motor-Pattern Monitoring"
        description="Within-person baseline and change detection. Every comparison is against your own frozen reference, never against other people."
        actions={
          <>
            <SecondaryButton onClick={handleToggleDemo}>
              {isDemoActive ? "Reset to my data" : "Demo profile"}
            </SecondaryButton>
            <SecondaryButton onClick={() => setShowEventForm(!showEventForm)}>
              {showEventForm ? "Cancel Event" : "+ Record Treatment Event"}
            </SecondaryButton>
            <PrimaryButton onClick={handleOpenReport}>Clinician Report View</PrimaryButton>
          </>
        }
      />

      {/* The reading: latest session against the personal reference */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hair pb-3">
          <div>
            <p className="label">Latest session against your reference</p>
            <p className="mt-1.5 font-display text-lg font-semibold tracking-tight text-ink">{headline}</p>
          </div>
          <StatusBadge status={isDemoActive ? "established" : progress.status} />
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">{message}</p>

        <dl className="mt-4 flex flex-col">
          <Readout
            label="Hold time"
            value={latest.ht === null ? "—" : latest.ht.toFixed(0)}
            unit="ms"
            hint="Bradykinesia index — average key hold duration"
            state={<StateDot state={states.ht} />}
          />
          <Readout
            label="Rhythm consistency"
            value={latest.consistency === null ? "—" : latest.consistency.toFixed(2)}
            unit="CV"
            hint="Cadence variation — variability divided by mean"
            state={<StateDot state={states.consistency} />}
          />
          <Readout
            label="Bilateral symmetry"
            value={latest.asym === null ? "—" : (Math.abs(latest.asym) * 100).toFixed(1)}
            unit="%"
            hint="Left versus right hand hold duration"
            state={<StateDot state={states.asymmetry} />}
          />
          <Readout
            label="Motor hesitation"
            value={latest.pauses === null ? "—" : latest.pauses.toFixed(1)}
            unit="/min"
            hint="Pauses longer than 500 ms"
            state={<StateDot state={states.pauses} />}
          />
        </dl>

        <p className="mt-4 flex items-start gap-2 border-t border-hair pt-4 text-xs leading-relaxed text-muted">
          <span className="mt-[5px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden />
          <span>
            Flags mean &ldquo;outside your own range&rdquo;, measured with the same robust-z rule the backend
            engine uses. They are not a diagnosis and not a severity score.
          </span>
        </p>
      </Card>

      {/* Baseline status */}
      <Card>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="label">Baseline</p>
            <h2 className="mt-2 font-display text-lg font-semibold tracking-tight text-ink">
              Personal Baseline:{" "}
              <span className="capitalize">{isDemoActive ? "established (demo)" : progress.status}</span>
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {progress.sessions} of {progress.required} qualifying sessions · {progress.distinctDays} of{" "}
              {progress.requiredDays} distinct recording days
              {progress.anchorDevice ? ` · anchor device ${progress.anchorDevice.slice(0, 12)}…` : ""}.
            </p>
          </div>
          <div className="w-full shrink-0 sm:w-56">
            <Meter value={progress.sessions} max={progress.required} caption="sessions" />
            <div className="mt-3">
              <Meter value={progress.distinctDays} max={progress.requiredDays} caption="recording days" />
            </div>
          </div>
        </div>
      </Card>

      {/* Record Treatment Event Form */}
      {showEventForm && (
        <Card className="border-trace/30 bg-trace-wash/40">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink">
            Record Clinician-Directed Treatment Event
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Log an event (for example a medication change or a therapy adjustment) so keystroke timing before
            and after can be compared. Does not infer clinical effectiveness.
          </p>
          <form onSubmit={handleCreateEvent} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] font-semibold tracking-tight text-ink">Event Date</span>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="mt-1.5 w-full rounded-md border border-hair bg-paper px-3 py-2 text-sm text-ink focus:border-trace"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold tracking-tight text-ink">Event Type</span>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-hair bg-paper px-3 py-2 text-sm text-ink focus:border-trace"
              >
                <option value="medication_change">Medication Change</option>
                <option value="dosage_adjustment">Dosage Adjustment</option>
                <option value="therapy_start">Therapy / Exercise Start</option>
                <option value="other">Other Clinical Event</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[13px] font-semibold tracking-tight text-ink">Description</span>
              <input
                type="text"
                placeholder="e.g. Started Levodopa 100mg BID with Dr. Smith"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="mt-1.5 w-full rounded-md border border-hair bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-trace"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[13px] font-semibold tracking-tight text-ink">
                Clinical Notes (optional)
              </span>
              <input
                type="text"
                placeholder="e.g. Monitoring morning stiffness"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-hair bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-trace"
              />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <SecondaryButton onClick={() => setShowEventForm(false)}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" disabled={submittingEvent}>
                {submittingEvent ? "Saving…" : "Save Event"}
              </PrimaryButton>
            </div>
          </form>
        </Card>
      )}

      {/* Indicator trend */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-ink">
              Indicator longitudinal trends
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{selectedOption.desc}</p>
          </div>
          <label className="flex items-center gap-2">
            <span className="label">Indicator</span>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="rounded-md border border-hair bg-paper px-3 py-2 text-sm text-ink focus:border-trace"
            >
              {INDICATOR_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <LongitudinalChart
          points={points}
          metric={selectedMetric}
          title={selectedOption.label}
          baselineMedian={currentBaselineMedian}
        />
      </div>

      {/* Treatment-Event comparison */}
      {comparisons.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hair pb-3">
            <div>
              <h2 className="font-display text-base font-semibold tracking-tight text-ink">
                Treatment timeline observations
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Pre-event versus post-event keystroke timing medians.
              </p>
            </div>
            <span className="label">{treatmentEvents.length} event(s) recorded</span>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            {comparisons.map((c) => (
              <div key={c.event_id} className="rounded-lg border border-hair bg-canvas/60 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{c.description}</span>
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {c.event_date.slice(0, 10)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Pre-event sessions: {c.pre_session_count} · Post-event sessions: {c.post_session_count}
                </p>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-hair">
                        <th className="label py-1.5 font-normal">Indicator</th>
                        <th className="label py-1.5 font-normal">Pre median</th>
                        <th className="label py-1.5 font-normal">Post median</th>
                        <th className="label py-1.5 font-normal">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.feature_comparisons.slice(0, 4).map((fc) => (
                        <tr key={fc.feature} className="border-b border-hair last:border-b-0">
                          <td className="py-1.5 text-ink-soft">{fc.human_name}</td>
                          <td className="py-1.5 font-mono tabular-nums text-ink">
                            {fc.pre_median?.toFixed(1) ?? "—"}
                          </td>
                          <td className="py-1.5 font-mono tabular-nums text-ink">
                            {fc.post_median?.toFixed(1) ?? "—"}
                          </td>
                          <td className="py-1.5 font-mono tabular-nums text-ink-soft">
                            {fc.difference != null
                              ? `${fc.difference > 0 ? "+" : ""}${fc.difference} (${fc.percent_change}%)`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs italic text-muted">{c.disclaimer}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Session history */}
      <Card>
        <h2 className="font-display text-base font-semibold tracking-tight text-ink">
          Recorded sessions
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Showing {sessions.length} persisted session(s). Open any session to inspect its exact
          within-session series.
        </p>
        <ul className="mt-3">
          {[...sessions].reverse().slice(0, 15).map((s) => (
            <li key={s.id} className="border-b border-hair last:border-b-0">
              <a
                href={`/session/${s.id}`}
                className="flex flex-col gap-1 py-2.5 transition-colors hover:bg-canvas sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="font-mono text-[13px] tabular-nums text-ink">
                    {s.started_at.slice(0, 16).replace("T", " ")}
                  </span>
                  <span className="label ml-3">{s.session_type}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-muted">device {s.device_id.slice(0, 8)}…</span>
                  <span className="label">{(s.quality_flags ?? []).join(", ") || "validated"}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <ClinicianReportModal report={report} isOpen={showReport} onClose={() => setShowReport(false)} />
    </div>
  );
}
