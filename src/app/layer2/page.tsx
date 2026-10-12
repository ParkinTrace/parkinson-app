"use client";
import React, { useEffect, useState } from "react";
import { Card, EmptyState, PrimaryButton, SecondaryButton, StatusBadge } from "@/components/ui";
import { LongitudinalChart, type TrendPoint } from "@/components/charts";
import { ClinicianReportModal } from "@/components/ClinicianReportModal";
import { baselineProgress } from "@/lib/baseline";
import { fetchHistory, stableDeviceId } from "@/lib/session";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { API_URL } from "@/lib/config";
import type { ClinicianReport, SessionRow, TreatmentComparison, TreatmentEvent } from "@/lib/types";

const INDICATOR_OPTIONS = [
  { key: "ht_mean", label: "Hold Time (ms)", desc: "Average duration key is held down" },
  { key: "ft_mean", label: "Flight Time (ms)", desc: "Transition delay between releasing and pressing" },
  { key: "ikl_mean", label: "Inter-Key Latency (ms)", desc: "Total elapsed time between successive keypresses" },
  { key: "typing_speed", label: "Typing Speed (keys/s)", desc: "Keypresses completed per second" },
  { key: "pause_frequency", label: "Pause Frequency (/min)", desc: "Hesitations exceeding 500 ms" },
  { key: "session_consistency", label: "Rhythm Consistency", desc: "Variability normalized by mean rhythm" },
  { key: "hand_asymmetry", label: "Hand Asymmetry", desc: "Left vs right hand hold duration discrepancy" },
];

export default function Layer2Page() {
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

  // New Event Form State
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [eventType, setEventType] = useState<string>("medication_change");
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submittingEvent, setSubmittingEvent] = useState(false);

  useEffect(() => {
    const run = async () => {
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
        activeUserId = localStorage.getItem("parkintrace_user_id") || "demo-user-001";
      }
      setUserId(activeUserId);

      // If Supabase user is logged in, fetch live metrics from Supabase table
      if (supa && activeUserId && activeUserId !== "demo-user-001") {
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
        // Fallback to local session features
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

      // Fetch baseline and treatment events from FastAPI backend
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
    run();
  }, []);

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

        // Fetch comparison for newly created event
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

  if (!sessions.length) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <h1 className="text-2xl font-bold text-slate-900">Layer 2 — Personal Longitudinal Monitoring</h1>
        <div className="mt-4">
          <EmptyState
            title="No sessions recorded yet"
            body="Personal baseline monitoring requires capturing repeated typing sessions across days to establish your individual neuromotor rhythm."
          />
          <div className="mt-3">
            <SecondaryButton href="/test">Start first typing session</SecondaryButton>
          </div>
        </div>
      </div>
    );
  }

  const progress = baselineProgress(sessions, stableDeviceId());
  const selectedOption = INDICATOR_OPTIONS.find((o) => o.key === selectedMetric) ?? INDICATOR_OPTIONS[0];
  const currentBaselineMedian = baselineStats?.[selectedMetric]?.median ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Header and Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
              LAYER 2 ENGINE
            </span>
            <span className="text-xs text-slate-500">Longitudinal Personal Trend</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Personal Motor-Pattern Monitoring</h1>
          <p className="text-xs text-slate-600">
            Within-person baseline and persistent timing drift detection under clinician supervision.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => setShowEventForm(!showEventForm)}>
            {showEventForm ? "Cancel Event" : "+ Record Treatment Event"}
          </SecondaryButton>
          <PrimaryButton onClick={handleOpenReport}>
            Clinician Report View
          </PrimaryButton>
        </div>
      </div>

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
            <StatusBadge status={progress.status} />
            <div>
              <h3 className="font-semibold text-slate-900">
                Personal Baseline: <span className="capitalize">{progress.status}</span>
              </h3>
              <p className="text-xs text-slate-600">
                {progress.sessions} of {progress.required} qualifying sessions · {progress.distinctDays} of{" "}
                {progress.requiredDays} distinct recording days
                {progress.anchorDevice ? ` · Anchor: ${progress.anchorDevice.slice(0, 12)}…` : ""}.
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            {progress.status === "established" ? (
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
