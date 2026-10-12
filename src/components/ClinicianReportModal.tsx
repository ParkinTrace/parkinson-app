"use client";
import React from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import type { ClinicianReport } from "@/lib/types";

interface Props {
  report: ClinicianReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ClinicianReportModal({ report, isOpen, onClose }: Props) {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl print:max-h-none print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                CLINICAL SUPERVISION SUMMARY
              </span>
              <span className="font-mono text-xs text-slate-500">ID: {report.report_id}</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              ParkTrace Longitudinal Motor-Pattern Report
            </h2>
            <p className="text-xs text-slate-500">
              Generated: {new Date(report.generated_at).toLocaleString()} · Subject: {report.user_id.slice(0, 8)}…
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <SecondaryButton onClick={() => window.print()}>Print / Save PDF</SecondaryButton>
            <PrimaryButton onClick={onClose}>Close</PrimaryButton>
          </div>
        </div>

        {/* Clinical Disclaimer Banner */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Clinical AI Governance Notice:</strong> {report.clinical_governance_disclaimer}
        </div>

        {/* Section 1: Monitoring Compliance */}
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            1. Longitudinal Monitoring Compliance
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Total Sessions</p>
              <p className="text-xl font-bold text-slate-800">{report.compliance.total_sessions}</p>
              <p className="text-[11px] text-teal-700">{report.compliance.valid_sessions} valid for analysis</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Monitoring Span</p>
              <p className="text-xl font-bold text-slate-800">{report.compliance.monitoring_span_days} days</p>
              <p className="text-[11px] text-slate-500">{report.compliance.distinct_days} distinct recording days</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Baseline Status</p>
              <p className="text-xl font-bold capitalize text-slate-800">{report.baseline.status}</p>
              <p className="text-[11px] text-slate-500">
                {report.baseline.anchor_device_id ? `Anchor: ${report.baseline.anchor_device_id.slice(0, 10)}…` : "Pending"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Persistent Changes</p>
              <p className="text-xl font-bold text-slate-800">
                {report.persistent_motor_pattern_changes.length}
              </p>
              <p className="text-[11px] text-slate-500">recurrent drift signals</p>
            </div>
          </div>
        </div>

        {/* Section 2: Personal Baseline Reference Ranges */}
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            2. Personal Reference Baseline (Anchor Intervals)
          </h3>
          {Object.keys(report.baseline.reference_intervals).length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Personal baseline still establishing (10+ sessions required across 5+ days).</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2">Indicator</th>
                    <th className="py-2">Median</th>
                    <th className="py-2">MAD (Dispersion)</th>
                    <th className="py-2">IQR Range [p25 - p75]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(report.baseline.reference_intervals).map(([feat, stats]) => (
                    <tr key={feat}>
                      <td className="py-2 font-medium capitalize text-slate-800">{feat.replace(/_/g, " ")}</td>
                      <td className="py-2">{stats.median?.toFixed(1) ?? "—"}</td>
                      <td className="py-2">±{stats.mad?.toFixed(1) ?? "—"}</td>
                      <td className="py-2">
                        {stats.p25 != null && stats.p75 != null ? `[${stats.p25.toFixed(1)} – ${stats.p75.toFixed(1)}]` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 3: Persistent Motor-Pattern Changes */}
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            3. Recurrent Motor-Pattern Observations
          </h3>
          {report.persistent_motor_pattern_changes.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No persistent multi-session timing drift detected. Current typing dynamics remain consistent with the personal baseline.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {report.persistent_motor_pattern_changes.map((item) => (
                <div key={item.feature} className="rounded-lg border border-teal-200 bg-teal-50/50 p-3 text-xs">
                  <div className="flex items-center justify-between font-semibold text-teal-900">
                    <span>{item.human_name}</span>
                    <span className="rounded bg-teal-200 px-2 py-0.5 text-[10px]">
                      {item.recurrent_sessions} recurring sessions
                    </span>
                  </div>
                  <p className="mt-1 text-slate-700">{item.clinical_note}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Treatment-Event Timeline Observations */}
        {report.treatment_timeline && report.treatment_timeline.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              4. Treatment Event Comparisons
            </h3>
            <div className="mt-2 space-y-4">
              {report.treatment_timeline.map((ev) => (
                <div key={ev.event_id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
                  <div className="flex items-center justify-between font-medium text-slate-800">
                    <span className="font-bold">{ev.description}</span>
                    <span className="text-slate-500">Date: {ev.event_date.slice(0, 10)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Pre-event sessions: {ev.pre_session_count} · Post-event sessions: {ev.post_session_count}
                  </p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-1">Indicator</th>
                          <th className="py-1">Pre-Event Median</th>
                          <th className="py-1">Post-Event Median</th>
                          <th className="py-1">Difference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ev.feature_comparisons.slice(0, 5).map((fc) => (
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
                  <p className="mt-2 text-[10px] text-amber-800 italic">{ev.disclaimer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          <p>ParkTrace Longitudinal Motor Monitoring Prototype · For Investigational & Research Use Only</p>
        </div>
      </div>
    </div>
  );
}
