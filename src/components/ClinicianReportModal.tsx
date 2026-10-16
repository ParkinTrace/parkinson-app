"use client";
import React from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import type { ClinicianReport } from "@/lib/types";

interface Props {
  report: ClinicianReport | null;
  isOpen: boolean;
  onClose: () => void;
}

/** A supervision document, so it is set like one: numbered sections,
 *  hairline rules, monospace figures, and no colour that could be read as
 *  a severity. Every string asserted by the e2e suite is kept verbatim. */
export function ClinicianReportModal({ report, isOpen, onClose }: Props) {
  if (!isOpen || !report) return null;

  const compliance = [
    { label: "Total sessions", value: String(report.compliance.total_sessions), note: `${report.compliance.valid_sessions} valid for analysis` },
    { label: "Monitoring span", value: `${report.compliance.monitoring_span_days} days`, note: `${report.compliance.distinct_days} distinct recording days` },
    { label: "Baseline status", value: report.baseline.status, note: report.baseline.anchor_device_id ? `Anchor: ${report.baseline.anchor_device_id.slice(0, 10)}…` : "Pending" },
    { label: "Persistent changes", value: String(report.persistent_motor_pattern_changes.length), note: "recurrent drift signals" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-hair bg-paper p-7 shadow-xl print:max-h-none print:border-0 print:shadow-none">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hair pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="label">CLINICAL SUPERVISION SUMMARY</span>
              <span className="font-mono text-[11px] text-muted">ID: {report.report_id}</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
              ParkTrace Longitudinal Motor-Pattern Report
            </h2>
            <p className="mt-1 text-xs text-muted">
              Generated: {new Date(report.generated_at).toLocaleString()} · Subject:{" "}
              {report.user_id.slice(0, 8)}…
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <SecondaryButton onClick={() => window.print()}>Print / Save PDF</SecondaryButton>
            <PrimaryButton onClick={onClose}>Close</PrimaryButton>
          </div>
        </div>

        {/* Governance notice */}
        <div className="mt-4 flex items-start gap-2 rounded-md border border-signal/35 bg-signal-wash p-3 text-xs leading-relaxed text-[#8a5a06]">
          <span className="mt-[5px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden />
          <span>
            <strong>Clinical AI Governance Notice:</strong> {report.clinical_governance_disclaimer}
          </span>
        </div>

        {/* 1. Compliance */}
        <section className="mt-7">
          <h3 className="label border-b border-hair pb-2">1. Longitudinal Monitoring Compliance</h3>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {compliance.map((c) => (
              <div key={c.label}>
                <p className="label">{c.label}</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums capitalize text-ink">
                  {c.value}
                </p>
                <p className="text-[11px] text-muted">{c.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Reference intervals */}
        <section className="mt-7">
          <h3 className="label border-b border-hair pb-2">
            2. Personal Reference Baseline (Anchor Intervals)
          </h3>
          {Object.keys(report.baseline.reference_intervals).length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Personal baseline still establishing — 10 or more sessions across 5 or more days are required.
              Until then no reference interval exists and no value is flagged.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-hair">
                    <th className="label py-2 font-normal">Indicator</th>
                    <th className="label py-2 font-normal">Median</th>
                    <th className="label py-2 font-normal">MAD (dispersion)</th>
                    <th className="label py-2 font-normal">IQR range [p25 – p75]</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.baseline.reference_intervals).map(([feat, stats]) => (
                    <tr key={feat} className="border-b border-hair last:border-b-0">
                      <td className="py-2 font-medium capitalize text-ink">{feat.replace(/_/g, " ")}</td>
                      <td className="py-2 font-mono tabular-nums text-ink">{stats.median?.toFixed(1) ?? "—"}</td>
                      <td className="py-2 font-mono tabular-nums text-ink-soft">±{stats.mad?.toFixed(1) ?? "—"}</td>
                      <td className="py-2 font-mono tabular-nums text-ink-soft">
                        {stats.p25 != null && stats.p75 != null
                          ? `[${stats.p25.toFixed(1)} – ${stats.p75.toFixed(1)}]`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 3. Recurrent observations */}
        <section className="mt-7">
          <h3 className="label border-b border-hair pb-2">3. Recurrent Motor-Pattern Observations</h3>
          {report.persistent_motor_pattern_changes.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              No persistent multi-session timing drift detected. Recent sessions remain within the personal
              reference intervals.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {report.persistent_motor_pattern_changes.map((item) => (
                <div key={item.feature} className="rounded-md border border-hair bg-canvas/60 p-4 text-xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink">{item.human_name}</span>
                    <span className="label">{item.recurrent_sessions} recurring sessions</span>
                  </div>
                  <p className="mt-1.5 leading-relaxed text-ink-soft">{item.clinical_note}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Treatment events */}
        {report.treatment_timeline && report.treatment_timeline.length > 0 && (
          <section className="mt-7">
            <h3 className="label border-b border-hair pb-2">4. Treatment Event Comparisons</h3>
            <div className="mt-3 flex flex-col gap-4">
              {report.treatment_timeline.map((ev) => (
                <div key={ev.event_id} className="rounded-md border border-hair bg-canvas/60 p-4 text-xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink">{ev.description}</span>
                    <span className="font-mono text-[11px] tabular-nums text-muted">
                      Date: {ev.event_date.slice(0, 10)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    Pre-event sessions: {ev.pre_session_count} · Post-event sessions: {ev.post_session_count}
                  </p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-hair">
                          <th className="label py-1.5 font-normal">Indicator</th>
                          <th className="label py-1.5 font-normal">Pre-event median</th>
                          <th className="label py-1.5 font-normal">Post-event median</th>
                          <th className="label py-1.5 font-normal">Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ev.feature_comparisons.slice(0, 5).map((fc) => (
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
                  <p className="mt-2 text-[11px] italic text-muted">{ev.disclaimer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 border-t border-hair pt-4 text-center">
          <p className="label">
            ParkTrace Longitudinal Motor Monitoring Prototype · For Investigational &amp; Research Use Only
          </p>
        </div>
      </div>
    </div>
  );
}
