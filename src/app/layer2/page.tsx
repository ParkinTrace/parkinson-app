"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState, PrimaryButton, SecondaryButton, StatusBadge } from "@/components/ui";
import { LongitudinalChart, type TrendPoint } from "@/components/charts";
import { ClinicianReportModal } from "@/components/ClinicianReportModal";
import { baselineProgress } from "@/lib/baseline";
import { fetchHistory, stableDeviceId } from "@/lib/session";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { API_URL } from "@/lib/config";
import type { ClinicianReport, SessionRow, TreatmentComparison, TreatmentEvent } from "@/lib/types";

const INDICATOR_OPTIONS = [
  { key: "ht_mean", label: "Hold Time (ms)", desc: "Average duration key is held down (primary indicator of fine-motor bradykinesia)" },
  { key: "ft_mean", label: "Flight Time (ms)", desc: "Transition delay between releasing one key and pressing the next" },
  { key: "ikl_mean", label: "Inter-Key Latency (ms)", desc: "Total elapsed time between successive keypresses (typing pace)" },
  { key: "typing_speed", label: "Typing Speed (keys/s)", desc: "Keypresses completed per second" },
  { key: "pause_frequency", label: "Pause Frequency (/min)", desc: "Hesitations exceeding 500 ms (micro-freezes)" },
  { key: "session_consistency", label: "Rhythm Consistency", desc: "Variability normalized by mean rhythm (steadiness)" },
  { key: "hand_asymmetry", label: "Hand Asymmetry", desc: "Left vs right hand hold duration discrepancy (unilateral signs)" },
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
  const asyms = [3.2, 2.9, 3.4, 4.1, 3.0, 3.3, 4.5, 3.8, 3.2, 3.1, 2.2, 2.0];
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
    notes: "Clinical titration directed by neurologist. Correlates with reduction in fine-motor hold latency.",
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
    hand_asymmetry: { median: 3.2, mad: 0.3 },
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

  if (!loaded) return <p className="p-4 text-slate-500">Loading personal monitoring dashboard…</p>;

  if (!sessions.length && !isDemoActive) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <h1 className="text-2xl font-bold text-slate-900">Layer 2 — Personal Longitudinal Monitoring</h1>
        <div className="mt-4">
          <EmptyState
            title="No sessions recorded yet"
            body="Personal baseline monitoring requires capturing repeated typing sessions across days to establish your individual neuromotor rhythm."
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PrimaryButton onClick={() => router.push("/test")}>Start First Typing Session</PrimaryButton>
            <SecondaryButton onClick={handleToggleDemo}>
              📊 Load Clinical Demo Profile (Preview Full Dashboard)
            </SecondaryButton>
          </div>
        </div>
      </div>
    );
  }

  const progress = baselineProgress(sessions, isDemoActive ? "clinic-desktop-anchor" : stableDeviceId());
  const selectedOption = INDICATOR_OPTIONS.find((o) => o.key === selectedMetric) ?? INDICATOR_OPTIONS[0];
  const currentBaselineMedian = baselineStats?.[selectedMetric]?.median ?? null;

  // Compute latest neuromotor values for the Clinical Scorecard
  const latestSession = sessions[sessions.length - 1];
  const latestFeats = latestSession?.features ?? {};
  const latestHt = typeof latestFeats.ht_mean === "number" ? latestFeats.ht_mean : (currentBaselineMedian ?? 85.0);
  const latestIkl = typeof latestFeats.ikl_mean === "number" ? latestFeats.ikl_mean : 180.0;
  const latestAsym = typeof latestFeats.hand_asymmetry === "number" ? Math.abs(latestFeats.hand_asymmetry) : 2.5;
  const latestSpeed = typeof latestFeats.typing_speed === "number" ? latestFeats.typing_speed : 5.1;
  const latestConsistency = typeof latestFeats.session_consistency === "number" ? latestFeats.session_consistency : 0.12;
  const latestPauses = typeof latestFeats.pause_frequency === "number" ? latestFeats.pause_frequency : 0.8;

  // Determine clinical conclusion state
  const isBaselineEstablished = progress.status === "established" || isDemoActive;
  const htDiffFromBaseline = currentBaselineMedian !== null ? latestHt - currentBaselineMedian : 0;
  const isDriftDetected = isBaselineEstablished && (htDiffFromBaseline > 15 || latestAsym > 15);

  let conclusionBadge = { text: "CALIBRATING INDIVIDUAL BASELINE", color: "bg-blue-100 text-blue-800 border-blue-200" };
  let conclusionHeadline = "Establishing Personal Motor Reference Profile";
  let conclusionMessage = `Currently collected ${progress.sessions} of ${progress.required} qualifying sessions across ${progress.distinctDays} days. In Parkinson's clinical care, establishing a personalized baseline is essential to distinguish genuine neurological changes from personal typing habits, keyboard differences, or age.`;

  if (isBaselineEstablished) {
    if (isDriftDetected) {
      conclusionBadge = { text: "ATTENTION: PERSISTENT DRIFT OBSERVED", color: "bg-amber-100 text-amber-900 border-amber-300" };
      conclusionHeadline = "Persistent Divergence from Established Baseline";
      conclusionMessage = "Recent monitoring sessions exhibit persistent elongation of key hold duration and elevated rhythm variability exceeding your frozen reference intervals. In Parkinson's motor assessment, sustained timing drift correlates with progressive fine-motor slowing. Recommendation: Export the Clinician Report and consult your neurologist for formal motor examination.";
    } else {
      conclusionBadge = { text: "STABLE NEUROMOTOR RHYTHM", color: "bg-emerald-100 text-emerald-900 border-emerald-300" };
      conclusionHeadline = "No Progressive Motor Pattern Degradation";
      conclusionMessage = "Fine-motor timing across your recent sessions aligns closely with your frozen personal baseline. Keystroke duration, bilateral symmetry, and pause frequency show no progressive bradykinesia drift or motor rhythm deterioration over the monitored period.";
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Header and Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
              LAYER 2 ENGINE
            </span>
            <span className="text-xs text-slate-500">Longitudinal Neuromotor Analysis</span>
            {isDemoActive && (
              <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                Active Demo Dataset
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Personal Motor-Pattern Monitoring</h1>
          <p className="text-xs text-slate-600">
            Within-person baseline and progressive fine-motor timing drift detection for clinical correlation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SecondaryButton onClick={handleToggleDemo}>
            {isDemoActive ? "Reset to My Real Data" : "📊 Demo Profile"}
          </SecondaryButton>
          <SecondaryButton onClick={() => setShowEventForm(!showEventForm)}>
            {showEventForm ? "Cancel Event" : "+ Record Treatment Event"}
          </SecondaryButton>
          <PrimaryButton onClick={handleOpenReport}>
            Clinician Report View
          </PrimaryButton>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CLINICAL CONCLUSION & PARKINSON'S BIOMARKER HERO CARD */}
      {/* ======================================================== */}
      <Card className="border-l-4 border-l-teal-600 bg-gradient-to-br from-white to-slate-50/70 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div>
            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${conclusionBadge.color}`}>
              {conclusionBadge.text}
            </span>
            <h2 className="mt-1.5 text-lg font-bold text-slate-900">{conclusionHeadline}</h2>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-500 block">Monitoring Period</span>
            <span className="text-xs font-semibold text-slate-800">
              {progress.sessions} sessions · {progress.distinctDays} recording days
            </span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-700">
          {conclusionMessage}
        </p>

        {/* 4-Metric Parkinson's Digital Biomarker Scorecard */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Biomarker 1: Bradykinesia */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Bradykinesia Index</span>
              <span className="text-xs">⏱️</span>
            </div>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{latestHt.toFixed(0)} <span className="text-xs font-normal text-slate-500">ms HT</span></p>
            <p className="text-[11px] text-slate-500">Hold Duration</p>
            <div className="mt-2 flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${latestHt < 95 ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-[11px] font-medium text-slate-700">
                {latestHt < 95 ? "Prompt key release" : "Prolonged hold"}
              </span>
            </div>
          </div>

          {/* Biomarker 2: Rhythm Regularity */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Rhythm Steadiness</span>
              <span className="text-xs">📈</span>
            </div>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{latestConsistency.toFixed(2)} <span className="text-xs font-normal text-slate-500">CV</span></p>
            <p className="text-[11px] text-slate-500">Cadence Variation</p>
            <div className="mt-2 flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${latestConsistency <= 0.16 ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-[11px] font-medium text-slate-700">
                {latestConsistency <= 0.16 ? "Stable cadence" : "Fluctuating rhythm"}
              </span>
            </div>
          </div>

          {/* Biomarker 3: Bilateral Symmetry */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Bilateral Symmetry</span>
              <span className="text-xs">⚖️</span>
            </div>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{latestAsym.toFixed(1)} <span className="text-xs font-normal text-slate-500">ms</span></p>
            <p className="text-[11px] text-slate-500">Left vs Right Delta</p>
            <div className="mt-2 flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${latestAsym < 10 ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-[11px] font-medium text-slate-700">
                {latestAsym < 10 ? "Symmetric balance" : "Unilateral divergence"}
              </span>
            </div>
          </div>

          {/* Biomarker 4: Micro-Pauses */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Motor Hesitation</span>
              <span className="text-xs">⏸️</span>
            </div>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{latestPauses.toFixed(1)} <span className="text-xs font-normal text-slate-500">/min</span></p>
            <p className="text-[11px] text-slate-500">Pauses &gt; 500ms</p>
            <div className="mt-2 flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${latestPauses < 2.5 ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-[11px] font-medium text-slate-700">
                {latestPauses < 2.5 ? "Fluid pace" : "Elevated pauses"}
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Neurologist Interpretation Box */}
        <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-xs text-teal-900">
          <p>
            <strong>Neurology Context:</strong> Parkinson&apos;s disease motor impairment typically manifests as gradual prolongation of finger release latency (bradykinesia), asymmetric finger tapping velocity, and irregular rhythm cadence. Unlike one-off tests, this longitudinal Layer 2 tracker enables clinicians to correlate motor drift with disease progression or Levodopa ON/OFF wearing-off cycles.
          </p>
        </div>
      </Card>

      {/* Record Treatment Event Form */}
      {showEventForm && (
        <Card className="border-teal-200 bg-teal-50/30">
          <h3 className="font-semibold text-slate-900">Record Clinician-Directed Treatment Event</h3>
          <p className="text-xs text-slate-600">
            Log an event (e.g., medication change or therapy adjustment) to track keystroke timing before and after.
            Does not infer clinical effectiveness.
          </p>
          <form onSubmit={handleCreateEvent} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Event Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="mt-1 w-full rounded border border-slate-300 p-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 p-1.5 text-xs"
              >
                <option value="medication_change">Medication Change</option>
                <option value="dosage_adjustment">Dosage Adjustment</option>
                <option value="therapy_start">Therapy / Exercise Start</option>
                <option value="other">Other Clinical Event</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Description</label>
              <input
                type="text"
                placeholder="e.g. Started Levodopa 100mg BID with Dr. Smith"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="mt-1 w-full rounded border border-slate-300 p-1.5 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Clinical Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Monitoring morning stiffness"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 p-1.5 text-xs"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <SecondaryButton onClick={() => setShowEventForm(false)}>Cancel</SecondaryButton>
              <PrimaryButton disabled={submittingEvent}>
                {submittingEvent ? "Saving…" : "Save Event"}
              </PrimaryButton>
            </div>
          </form>
        </Card>
      )}

      {/* Baseline Status Card */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge status={isDemoActive ? "established" : progress.status} />
            <div>
              <h3 className="font-semibold text-slate-900">
                Personal Baseline: <span className="capitalize">{isDemoActive ? "established (demo)" : progress.status}</span>
              </h3>
              <p className="text-xs text-slate-600">
                {progress.sessions} of {progress.required} qualifying sessions · {progress.distinctDays} of{" "}
                {progress.requiredDays} distinct recording days
                {progress.anchorDevice ? ` · Anchor: ${progress.anchorDevice.slice(0, 12)}…` : ""}.
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            {isBaselineEstablished ? (
              <span className="rounded bg-emerald-100 px-2 py-1 font-medium text-emerald-800">
                Frozen Reference Active
              </span>
            ) : (
              <span className="rounded bg-amber-100 px-2 py-1 font-medium text-amber-800">
                Building Baseline (Keep Typing)
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Interactive Feature-Level Trend Chart */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-slate-900">Indicator Longitudinal Trends</h2>
          {/* Indicator Dropdown Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Select Indicator:</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="rounded border border-slate-300 bg-white p-1 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
            >
              {INDICATOR_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <LongitudinalChart
          points={points}
          metric={selectedMetric}
          title={selectedOption.label}
          baselineMedian={currentBaselineMedian}
        />
        <p className="text-xs text-slate-500 italic">{selectedOption.desc}</p>
      </div>

      {/* Treatment-Event Timeline Comparison */}
      {comparisons.length > 0 && (
        <Card>
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <h3 className="font-semibold text-slate-900">Treatment Timeline Observations</h3>
              <p className="text-xs text-slate-500">
                Pre-event vs post-event keystroke timing medians.
              </p>
            </div>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
              {treatmentEvents.length} event(s) recorded
            </span>
          </div>

          <div className="mt-3 space-y-4">
            {comparisons.map((c) => (
              <div key={c.event_id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs">
                <div className="flex items-center justify-between font-medium text-slate-800">
                  <span className="font-bold">{c.description}</span>
                  <span className="text-slate-500">{c.event_date.slice(0, 10)}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Pre-event sessions: {c.pre_session_count} · Post-event sessions: {c.post_session_count}
                </p>

                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1">Indicator</th>
                        <th className="py-1">Pre Median</th>
                        <th className="py-1">Post Median</th>
                        <th className="py-1">Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {c.feature_comparisons.slice(0, 4).map((fc) => (
                        <tr key={fc.feature}>
                          <td className="py-1 text-slate-700">{fc.human_name}</td>
                          <td className="py-1">{fc.pre_median?.toFixed(1) ?? "—"}</td>
                          <td className="py-1">{fc.post_median?.toFixed(1) ?? "—"}</td>
                          <td className="py-1 font-medium">
                            {fc.difference != null ? `${fc.difference > 0 ? "+" : ""}${fc.difference} (${fc.percent_change}%)` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[10px] text-amber-800 italic">{c.disclaimer}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Session History */}
      <Card>
        <h3 className="font-semibold text-slate-900">Recorded Sessions History</h3>
        <p className="text-xs text-slate-500">
          Showing {sessions.length} persisted session(s). Click any session to inspect exact within-session series.
        </p>
        <ul className="mt-3 divide-y divide-slate-100 text-xs">
          {[...sessions].reverse().slice(0, 15).map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <div>
                <a className="font-medium text-teal-700 hover:underline" href={`/session/${s.id}`}>
                  {s.started_at.slice(0, 16).replace("T", " ")}
                </a>
                <span className="ml-2 text-slate-500">· {s.session_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">device {s.device_id.slice(0, 8)}…</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                  {(s.quality_flags ?? []).join(", ") || "validated"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Clinician Report Modal */}
      <ClinicianReportModal
        report={report}
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />
    </div>
  );
}
