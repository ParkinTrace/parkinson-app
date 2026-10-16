"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { PinInputModal } from "@/components/PinInputModal";
import { PinSetupModal } from "@/components/PinSetupModal";
import { baselineProgress } from "@/lib/baseline";
import { fetchHistory, stableDeviceId } from "@/lib/session";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { API_URL } from "@/lib/config";
import { fetchPinStatus, isSessionUnlocked } from "@/lib/pinClient";
import { useAppStore } from "@/store/useAppStore";
import { BackButton } from "@/components/BackButton";
import { Mascot } from "@/components/Mascot";
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
  return Math.abs(robustZ) >= ROBUST_Z_WATCH ? "elevated" : "normal";
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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasPinConfigured, setHasPinConfigured] = useState<boolean>(false);
  const [isDemoActive, setIsDemoActive] = useState(false);

  // Layer 2 Session PIN & Daily Protocol
  const setLayer = useAppStore((s) => s.setLayer);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [medicationStatus, setMedicationStatus] = useState<string>("none");
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMed = localStorage.getItem("parkintrace_med_status");
      if (savedMed) setMedicationStatus(savedMed);
      const savedReminder = localStorage.getItem("parkintrace_reminder_active") === "1";
      setReminderEnabled(savedReminder);
    }
  }, []);

  const handleToggleReminder = async () => {
    if (typeof window === "undefined") return;
    if (!reminderEnabled) {
      if ("Notification" in window) {
        try {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            setReminderEnabled(true);
            localStorage.setItem("parkintrace_reminder_active", "1");
          } else {
            setReportError("Notification permission was not granted. You can still track daily sessions manually.");
          }
        } catch {
          setReminderEnabled(true);
          localStorage.setItem("parkintrace_reminder_active", "1");
        }
      } else {
        setReminderEnabled(true);
        localStorage.setItem("parkintrace_reminder_active", "1");
      }
    } else {
      setReminderEnabled(false);
      localStorage.setItem("parkintrace_reminder_active", "0");
    }
  };

  const handleStartDailySession = async () => {
    if (isSessionUnlocked()) {
      setLayer("layer2");
      router.push("/test");
      return;
    }
    const hasPin = await fetchPinStatus();
    if (!hasPin) {
      setIsSetupModalOpen(true);
    } else {
      setIsPinModalOpen(true);
    }
  };

  const handlePinSuccess = () => {
    setIsPinModalOpen(false);
    setLayer("layer2");
    router.push("/test");
  };

  const handleSetupSuccess = () => {
    setIsSetupModalOpen(false);
    setIsPinModalOpen(true);
  };

  // New Event Form State
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [eventType, setEventType] = useState<string>("medication_change");
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const loadRealData = async () => {
    const rows = await fetchHistory();
    // Exclusively Layer 2 sessions for personal baseline
    const layer2Rows = rows.filter(
      (r) =>
        r.layer === "layer2" ||
        (r as any).device_metadata?.layer === "layer2" ||
        r.session_type === "motor_task",
    );
    setSessions(layer2Rows);
    const supa = supabaseBrowser();
    let activeUserId: string | null = null;
    let activeEmail: string | null = null;

    if (supa) {
      const { data: auth } = await supa.auth.getUser();
      if (auth.user) {
        activeUserId = auth.user.id;
        activeEmail = auth.user.email ?? null;
      }
    }
    if (!activeUserId) {
      activeUserId = "00000000-0000-0000-0000-000000000000";
    }
    setUserId(activeUserId);

    if (!activeEmail && typeof window !== "undefined") {
      activeEmail =
        sessionStorage.getItem("parkintrace_active_email") ||
        localStorage.getItem("parkintrace_active_email");
    }
    setUserEmail(activeEmail);
    fetchPinStatus().then(setHasPinConfigured).catch(() => {});

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
      setReportError("Sign in required to compile a patient longitudinal report.");
      return;
    }
    try {
      setReportError(null);
      const res = await fetch(`${API_URL}/api/v1/reports/clinician-summary?user_id=${userId}`);
      if (res.ok) {
        setReport(await res.json());
        setShowReport(true);
      } else {
        setReportError("Unable to compile report from current sessions.");
      }
    } catch {
      setReportError("Failed to connect to backend service to compile report.");
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
    <div className="flex flex-col gap-6 py-2 sm:py-6">
      {/* Back Button */}
      <div>
        <BackButton fallbackHref="/dashboard" />
      </div>

      {/* Screen Title & Narrative Header from Stitch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#d9e5e0]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-[#caead7] text-[#002620] border border-[#0e7c66]/20">
              LAYER 02
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#486455]">
              <span className="w-2 h-2 rounded-full bg-[#0e7c66]"></span>
              Daily Monitoring Active
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#183c35]">
            Layer 2: Personal Baseline &amp; Daily Monitoring
          </h1>
          <p className="text-sm text-[#414846] mt-1 leading-relaxed max-w-2xl">
            Calibrate your personal timing baseline across 10 daily sessions. Monitor day-to-day stability, response to medication, and long-term changes over time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleToggleDemo}
            className="py-2 px-3.5 rounded-full bg-white/80 hover:bg-white text-xs font-semibold text-[#002620] border border-[#c1c8c5]/40 shadow-xs cursor-pointer"
          >
            {isDemoActive ? "Reset to My Data" : "Demo Profile"}
          </button>
          <button
            type="button"
            onClick={() => setShowEventForm(!showEventForm)}
            className="py-2 px-3.5 rounded-full bg-white/80 hover:bg-white text-xs font-semibold text-[#002620] border border-[#c1c8c5]/40 shadow-xs cursor-pointer"
          >
            {showEventForm ? "Cancel Event" : "+ Clinical Event"}
          </button>
          <button
            type="button"
            onClick={handleOpenReport}
            className="py-2 px-4 rounded-full bg-[#002620] hover:bg-[#183c35] text-xs font-semibold text-white shadow-xs cursor-pointer"
          >
            Clinician Report View
          </button>
        </div>
      </div>

      {/* ================= Participant Profile & Hardware Anchor Hub ================= */}
      <section className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/90 shadow-[0_12px_32px_-4px_rgba(19,42,38,0.06)] bg-gradient-to-br from-[#FCFAF6] via-white to-[#caead7]/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-5 border-b border-[#d9e5e0]">
          <div className="flex items-center gap-4">
            <Mascot pose="calibrating" className="w-16 h-auto hidden sm:block shrink-0" />
            <div className="w-14 h-14 rounded-2xl bg-[#002620] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-[#002620]/20 shrink-0">
              {userEmail ? userEmail.slice(0, 2).toUpperCase() : "PT"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#002620] text-white">
                  Participant Profile
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#caead7]/80 text-[#002620] border border-[#0e7c66]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0e7c66]"></span>
                  Layer 2 Enrolled
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#131e1b]">
                {userEmail ?? (userId && userId !== "00000000-0000-0000-0000-000000000000" ? `Participant (${userId.slice(0, 8)}…)` : "Authorized Participant")}
              </h2>
              <p className="text-xs text-[#5a6a72] mt-0.5">
                Observational Baseline Cohort • High-precision micro-telemetry anchor active
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/profile"
              className="py-2 px-4 rounded-full bg-white hover:bg-[#F7F5EF] text-xs font-semibold text-[#002620] border border-[#c1c8c5]/40 shadow-xs transition-all active:scale-95"
            >
              Account Details →
            </Link>
            <button
              type="button"
              onClick={() => setIsSetupModalOpen(true)}
              className="py-2 px-4 rounded-full bg-white hover:bg-[#F7F5EF] text-xs font-semibold text-[#002620] border border-[#c1c8c5]/40 shadow-xs transition-all active:scale-95"
            >
              {hasPinConfigured ? "Change Workstation PIN" : "Setup 4-Digit PIN"}
            </button>
          </div>
        </div>

        {/* 4 Profile Context Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="bg-white/80 rounded-2xl p-4 border border-[#c1c8c5]/30 shadow-xs">
            <span className="text-[11px] font-medium text-[#5a6a72] uppercase tracking-wider">Device Anchor</span>
            <div className="text-sm font-bold font-mono text-[#002620] mt-1 truncate" title={isDemoActive ? "clinic-desktop-anchor" : stableDeviceId()}>
              {typeof window !== "undefined" ? (isDemoActive ? "clinic-anchor" : stableDeviceId().slice(0, 16)) : "local-device"}…
            </div>
            <span className="text-[11px] text-[#5a6a72] mt-0.5 block">Locked to physical hardware</span>
          </div>

          <div className="bg-white/80 rounded-2xl p-4 border border-[#c1c8c5]/30 shadow-xs">
            <span className="text-[11px] font-medium text-[#5a6a72] uppercase tracking-wider">Baseline Calibration</span>
            <div className="text-sm font-bold text-[#002620] mt-1">
              {isBaselineEstablished ? "Established & Locked" : `${progress.sessions} of 10 Sessions`}
            </div>
            <span className="text-[11px] text-[#5a6a72] mt-0.5 block">
              {progress.distinctDays} of 5 distinct days recorded
            </span>
          </div>

          <div className="bg-white/80 rounded-2xl p-4 border border-[#c1c8c5]/30 shadow-xs">
            <span className="text-[11px] font-medium text-[#5a6a72] uppercase tracking-wider">Workstation Security</span>
            <div className="text-sm font-bold text-[#002620] mt-1 flex items-center gap-1.5">
              <span>{hasPinConfigured ? "🔒 4-Digit PIN Active" : "🔓 PIN Not Configured"}</span>
            </div>
            <span className="text-[11px] text-[#5a6a72] mt-0.5 block">Protects daily longitudinal entry</span>
          </div>

          <div className="bg-white/80 rounded-2xl p-4 border border-[#c1c8c5]/30 shadow-xs">
            <span className="text-[11px] font-medium text-[#5a6a72] uppercase tracking-wider">Daily Entry Action</span>
            <button
              type="button"
              onClick={handleStartDailySession}
              className="mt-1 w-full py-1.5 px-3 rounded-xl bg-[#002620] hover:bg-[#183c35] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 text-center"
            >
              Start Daily Session →
            </button>
          </div>
        </div>
      </section>

      {reportError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <span>{reportError}</span>
          <button
            type="button"
            onClick={() => setReportError(null)}
            className="font-semibold uppercase tracking-wider hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Baseline Progression Vitrine (Stitch Specification) */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/90 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#d9e5e0]">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#486455] font-semibold">Calibration Phase</div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#183c35] mt-1">
              Baseline Status: {isDemoActive ? 10 : progress.sessions} of {progress.required} Calibration Sessions Logged
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#caead7]/60 border border-[#0e7c66]/20 text-[#002620]">
            <span className="w-2 h-2 rounded-full bg-[#0e7c66]"></span>
            <span className="text-xs font-bold">
              {isDemoActive ? "100% Calibrated" : `${Math.round(((progress.sessions ?? 0) / (progress.required ?? 10)) * 100)}% Calibrated`}
            </span>
          </div>
        </div>

        {/* Segmented Calibration Track (Stitch) */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-[#5a6a72] mb-3">
            <span className="font-semibold text-[#002620]">Segmented Baseline Progress</span>
            <span>
              {isBaselineEstablished
                ? "Full personal stability corridor established"
                : `${Math.max(0, 10 - (progress.sessions ?? 0))} sessions remaining across ${Math.max(0, 5 - (progress.distinctDays ?? 0))} days`}
            </span>
          </div>
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: 10 }).map((_, idx) => {
              const completed = (isDemoActive ? 10 : progress.sessions) > idx;
              return (
                <div
                  key={idx}
                  className={`h-3 rounded-full transition-all duration-300 ${
                    completed
                      ? "bg-[#002620] shadow-xs"
                      : "bg-[#d9e5e0]/70 border border-[#c1c8c5]/40"
                  }`}
                  title={`Session ${idx + 1}: ${completed ? "Completed" : "Pending"}`}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Daily Baseline Measurement Protocol CTA */}
      <section className="glass-substrate rounded-3xl p-6 sm:p-7 border border-white/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-full bg-[#caead7]/70 px-2.5 py-0.5 text-[11px] font-bold text-[#002620]">
                DAILY PROTOCOL
              </span>
              <span className="text-xs font-semibold text-[#486455]">Session PIN Protected</span>
            </div>
            <h3 className="font-display text-lg font-bold text-[#183c35]">
              Ready for Today&apos;s Baseline Calibration?
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#414846]">
              Enter your secure 4-digit PIN to ensure calibration data is strictly yours, then complete your 30-second typing check to build or monitor your personal baseline.
            </p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleStartDailySession}
              className="py-3 px-6 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-sm font-semibold shadow-md shadow-[#002620]/20 transition-all active:scale-[0.98]"
            >
              Unlock &amp; Start Daily Session →
            </button>
          </div>
        </div>
      </section>

      {/* Context: Medication & Schedule Questionnaire Card */}
      <section className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/90 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#d9e5e0] pb-3 mb-4">
          <div>
            <span className="label text-[#002620]">Context &amp; Schedule</span>
            <h3 className="font-display text-base font-bold text-[#183c35] mt-0.5">
              Medication Status &amp; Daily Reminders
            </h3>
          </div>
          <span className="text-xs text-[#5a6a72]">Personalized Routine</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Medication Status Dropdown */}
          <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-xs">
            <label className="label text-[#002620] block mb-1">
              Are you on dopaminergic medication?
            </label>
            <select
              value={medicationStatus}
              onChange={(e) => {
                setMedicationStatus(e.target.value);
                if (typeof window !== "undefined") {
                  localStorage.setItem("parkintrace_med_status", e.target.value);
                }
              }}
              className="mt-2 w-full rounded-xl border border-[#c1c8c5]/50 bg-white px-3.5 py-2 text-sm text-[#131e1b] focus:border-[#0e7c66] focus:outline-none"
            >
              <option value="none">Not currently taking Parkinson&apos;s medication</option>
              <option value="levodopa">Levodopa / Carbidopa (Sinemet / Stalevo)</option>
              <option value="agonist">Dopamine Agonist (Pramipexole / Ropinirole)</option>
              <option value="maob">MAO-B Inhibitor (Rasagiline / Selegiline)</option>
              <option value="other">Other therapy or combination</option>
            </select>
            <p className="mt-2 text-xs text-[#5a6a72] leading-relaxed">
              Recording medication context helps interpret whether variations in your keystroke timing align with medication cycles.
            </p>
          </div>

          {/* Daily Reminder Toggle */}
          <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-xs">
            <label className="label text-[#002620] block mb-1">
              Daily Typing Session Reminder
            </label>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-medium text-[#131e1b]">
                Send daily prompt
              </span>
              <button
                type="button"
                onClick={handleToggleReminder}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  reminderEnabled
                    ? "bg-[#002620] text-white shadow-xs"
                    : "border border-[#c1c8c5]/50 bg-white text-[#5a6a72] hover:text-[#002620]"
                }`}
              >
                {reminderEnabled ? "✓ Active (Daily 9 AM)" : "Enable reminder"}
              </button>
            </div>
            <p className="mt-2 text-xs text-[#5a6a72] leading-relaxed">
              Consistent daily typing at approximately the same time of day provides the cleanest baseline calibration.
            </p>
          </div>
        </div>
      </section>

      {/* The reading: latest session against the personal reference */}
      <section className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/90 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#d9e5e0] pb-3">
          <div>
            <p className="label text-[#002620]">Latest session against your reference</p>
            <h3 className="mt-1.5 font-display text-lg font-bold tracking-tight text-[#183c35]">{headline}</h3>
          </div>
          <StatusBadge status={isDemoActive ? "established" : progress.status} />
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#414846]">{message}</p>

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

        <p className="mt-4 flex items-start gap-2 border-t border-[#d9e5e0] pt-4 text-xs leading-relaxed text-[#5a6a72]">
          <span className="mt-[5px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#002620]" aria-hidden />
          <span>
            Flags mean &ldquo;outside your own range&rdquo;, measured with the same robust-z rule the backend
            engine uses. They are not a diagnosis and not a severity score.
          </span>
        </p>
      </section>

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
              <Link
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
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <ClinicianReportModal report={report} isOpen={showReport} onClose={() => setShowReport(false)} />

      <PinInputModal
        isOpen={isPinModalOpen}
        onSuccess={handlePinSuccess}
        onRequestSetup={() => {
          setIsPinModalOpen(false);
          setIsSetupModalOpen(true);
        }}
        onCancel={() => setIsPinModalOpen(false)}
      />

      <PinSetupModal
        isOpen={isSetupModalOpen}
        onSuccess={handleSetupSuccess}
        onCancel={() => setIsSetupModalOpen(false)}
      />
    </div>
  );
}
