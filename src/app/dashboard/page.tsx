"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  EmptyState,
  Meter,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { lockSession } from "@/lib/pinClient";
import {
  baselineProgress,
  baselineStanding,
  type BaselineProgress,
  type BaselineStanding,
} from "@/lib/baseline";
import { fetchHistory, stableDeviceId } from "@/lib/session";
import { useAppStore } from "@/store/useAppStore";
import { BackButton } from "@/components/BackButton";
import { Mascot } from "@/components/Mascot";
import type { SessionRow } from "@/lib/types";

/** How many past sessions the dashboard displays in the glance list. */
const RECENT = 4;

export default function DashboardPage() {
  const router = useRouter();
  const setLayer = useAppStore((s) => s.setLayer);
  const resetSession = useAppStore((s) => s.resetSession);
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [progress, setProgress] = useState<BaselineProgress | null>(null);
  const [standing, setStanding] = useState<BaselineStanding | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchHistory().then((history) => {
      if (!active) return;
      const device = stableDeviceId();
      // CRITICAL: Differentiate Layer 1 vs Layer 2. Layer 1 is strictly a sample screening test
      // and must NEVER be counted in the longitudinal baseline, session count, or calibration progress.
      const layer2Rows = history.filter(
        (r) =>
          r.layer === "layer2" ||
          (r as any).device_metadata?.layer === "layer2" ||
          r.session_type === "motor_task",
      );
      setRows(layer2Rows);
      setProgress(baselineProgress(layer2Rows, device));
      setStanding(baselineStanding(layer2Rows, device));
    });
    supabaseBrowser()
      ?.auth.getSession()
      .then(({ data }) => {
        if (active) {
          if (data.session?.user?.email) {
            setEmail(data.session.user.email);
          } else if (typeof window !== "undefined") {
            const stored =
              sessionStorage.getItem("parkintrace_active_email") ||
              localStorage.getItem("parkintrace_active_email");
            if (stored) setEmail(stored);
          }
        }
      })
      .catch(() => {
        if (typeof window !== "undefined") {
          const stored =
            sessionStorage.getItem("parkintrace_active_email") ||
            localStorage.getItem("parkintrace_active_email");
          if (active && stored) setEmail(stored);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabaseBrowser()?.auth.signOut();
    } catch {}
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("parkintrace_freshly_signed_in");
      sessionStorage.removeItem("parkintrace_active_email");
      localStorage.removeItem("parkintrace_active_email");
    }
    lockSession();
    resetSession();
    router.push("/login");
  };

  const startLayer1 = () => {
    setLayer("layer1");
    router.push("/layer1");
  };

  const startLayer2 = () => {
    setLayer("layer2");
    router.push("/layer2");
  };

  const established = progress?.status === "established";
  const numbered = rows?.map((row, i) => ({ row, n: i + 1 })) ?? [];
  const recent = numbered.slice(-RECENT).reverse();
  const dayShown = standing ? Math.min(standing.daysWithToday, standing.requiredDays) : 0;

  return (
    <div className="flex flex-col gap-6 py-2 sm:py-6">
      {/* Back Button */}
      <div>
        <BackButton fallbackHref="/" />
      </div>

      {/* ================= Welcoming Header Glass Substrate ================= */}
      <section className="glass-substrate rounded-3xl p-6 sm:p-8 border border-white/80 shadow-[0_12px_32px_-4px_rgba(19,42,38,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#c7e7d4]/60 text-[#002620] border border-[#0e7c66]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0e7c66]"></span>
                Motor Health Dashboard
              </span>
              <span className="text-xs text-[#5a6a72] font-medium">
                Device: {typeof window !== "undefined" ? stableDeviceId().slice(0, 12) : "Local Device"}…
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#131e1b]">
                Welcome back, <span className="text-[#002620]">{email ? email.split("@")[0] : "Participant"}</span>
              </h1>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-white hover:bg-[#ffdad6] text-[#414846] hover:text-[#93000a] border border-[#c1c8c5]/40 transition-colors shadow-xs cursor-pointer"
                title="Sign out or switch to another participant account"
              >
                <span>Switch account</span>
              </button>
            </div>
            <p className="text-sm text-[#414846] mt-1.5 leading-relaxed max-w-2xl">
              ParkinTrace measures your everyday typing speed and keypress rhythm to detect subtle motor trends. Choose a screening or record your daily session below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <Mascot pose="analyst" className="w-20 h-auto hidden lg:block" />
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/history"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-[#002620] bg-white/80 hover:bg-white border border-[#c1c8c5]/40 transition-all shadow-xs active:scale-95"
              >
                <span>📋</span>
                <span>View History</span>
              </Link>
              <button
                type="button"
                onClick={startLayer1}
                className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-[#002620] hover:bg-[#183c35] transition-all shadow-[0_8px_20px_-4px_rgba(14,124,102,0.35)] active:scale-95"
              >
                <span>⌨️</span>
                <span>Start 30s Check</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Top 4 Metric Glass Cards ================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Last Layer 2 Baseline Session */}
        <div className="glass-card-subtle rounded-2xl p-5 border border-white/80 shadow-[0_8px_24px_-4px_rgba(19,42,38,0.03)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3 text-xs font-medium text-[#5a6a72]">
              <span>Layer 2 Baseline Sessions</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#caead7]/60 text-[#002620] text-[11px] font-semibold">
                {rows && rows.length > 0 ? "Recorded" : "Ready"}
              </span>
            </div>
            <div className="text-2xl font-bold text-[#131e1b] mb-1">
              {rows && rows.length > 0 ? `#${rows.length}` : "Session #01"}
            </div>
            <p className="text-xs text-[#5a6a72]">
              {rows && rows.length > 0
                ? `${rows[rows.length - 1].started_at.slice(0, 10)} · completed`
                : "Awaiting your first Layer 2 session"}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#d9e5e0] flex items-center justify-between text-xs">
            <span className="text-[#5a6a72]">Total Layer 2 Sessions</span>
            <span className="font-semibold text-[#002620]">{rows ? rows.length : 0}</span>
          </div>
        </div>

        {/* Card 2: Layer 1 Screening */}
        <div className="glass-card-subtle rounded-2xl p-5 border border-white/80 shadow-[0_8px_24px_-4px_rgba(19,42,38,0.03)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3 text-xs font-medium text-[#5a6a72]">
              <span>Layer 1 Screening</span>
              <span className="text-xs">⏱️</span>
            </div>
            <div className="text-2xl font-bold text-[#131e1b] mb-1">
              Quick Check
            </div>
            <p className="text-xs text-[#5a6a72]">
              30s sample screening (not in baseline)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#d9e5e0] flex items-center justify-between text-xs">
            <span className="text-[#5a6a72]">Role</span>
            <span className="font-semibold text-[#002620]">Sample Screener</span>
          </div>
        </div>

        {/* Card 3: Layer 2 Baseline Monitor */}
        <div className="glass-card-subtle rounded-2xl p-5 border border-white/80 shadow-[0_8px_24px_-4px_rgba(19,42,38,0.03)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3 text-xs font-medium text-[#5a6a72]">
              <span>Layer 2 Baseline</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#caead7]/60 text-[#002620] text-[11px] font-semibold">
                {established ? "Calibrated" : `${progress?.sessions ?? 0}/10 Sessions`}
              </span>
            </div>
            <div className="text-2xl font-bold text-[#131e1b] mb-1">
              {established ? "Baseline Active" : "Building"}
            </div>
            <p className="text-xs text-[#5a6a72]">
              {established
                ? "Personal baseline established"
                : `${10 - (progress?.sessions ?? 0)} sessions needed to lock`}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#d9e5e0] flex items-center justify-between text-xs">
            <span className="text-[#5a6a72]">Status</span>
            <span className="font-semibold text-[#0e7c66]">
              {established ? "Tracking Active" : "In Progress"}
            </span>
          </div>
        </div>

        {/* Card 4: Daily Tracking Streak */}
        <div className="glass-card-subtle rounded-2xl p-5 border border-white/80 shadow-[0_8px_24px_-4px_rgba(19,42,38,0.03)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3 text-xs font-medium text-[#5a6a72]">
              <span>Monitoring Days</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100/60 text-amber-900 text-[11px] font-semibold">
                <span>📅</span>
                <span>Active</span>
              </span>
            </div>
            <div className="text-2xl font-bold text-[#131e1b] mb-1">
              {dayShown} Days
            </div>
            <p className="text-xs text-[#5a6a72]">
              5 distinct days required
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#d9e5e0] flex items-center justify-between text-xs">
            <span className="text-[#5a6a72]">Requirement</span>
            <span className="font-semibold text-[#131e1b]">
              {dayShown >= 5 ? "Met" : `${5 - dayShown} more days`}
            </span>
          </div>
        </div>
      </section>

      {/* ================= Visually Separated Core Pathways: Layer 1 vs Layer 2 ================= */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#0e7c66]"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#486455]">
              Assessment Pathways
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#183c35]">
            Select Your Assessment Mode
          </h2>
          <p className="text-xs sm:text-sm text-[#414846] mt-0.5 max-w-2xl leading-relaxed">
            Choose between a quick population sample test or your client-based personal baseline monitoring suite.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 items-stretch">
          {/* Layer 1 Screening Pathway Card */}
          <div className="rounded-3xl p-6 sm:p-7 border-2 border-[#0e7c66]/25 bg-gradient-to-b from-[#caead7]/25 via-white to-white shadow-[0_12px_32px_-6px_rgba(14,124,102,0.08)] flex flex-col justify-between hover:border-[#0e7c66]/50 transition-all">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-[#002620] px-3 py-1 font-mono text-xs font-bold text-white shadow-xs">
                  LAYER 01
                </span>
                <span className="text-xs font-semibold text-[#002620] bg-[#caead7]/80 border border-[#0e7c66]/25 px-3 py-0.5 rounded-full">
                  Sample Screening · One-Time Check
                </span>
              </div>

              <h3 className="mt-4 font-display text-xl sm:text-2xl font-bold tracking-tight text-[#183c35]">
                Quick Screening Test
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#414846]">
                Take a fast 30-second benchmark check. Your key hold duration, flight delay, and rhythm fluidity are evaluated instantly against clinical population reference distributions.
              </p>

              <div className="mt-5 space-y-2 rounded-2xl bg-white/80 p-4 border border-[#c1c8c5]/30">
                <div className="flex items-center gap-2 text-xs text-[#002620] font-medium">
                  <span className="text-[#0e7c66] font-bold">✓</span>
                  <span>30-second rapid typing assessment</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#002620] font-medium">
                  <span className="text-[#0e7c66] font-bold">✓</span>
                  <span>Population model percentile comparison</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#5a6a72]">
                  <span className="text-[#0e7c66] font-bold">✓</span>
                  <span>Sample only: Not added to personal baseline</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#d9e5e0] flex items-center justify-between">
              <button
                type="button"
                onClick={startLayer1}
                className="py-3 px-6 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-xs font-semibold shadow-md shadow-[#002620]/20 transition-all active:scale-95"
              >
                Start Quick Screening →
              </button>
              <Link href="/test" className="text-xs font-semibold text-[#5a6a72] hover:text-[#002620]">
                Test Details
              </Link>
            </div>
          </div>

          {/* Layer 2 Personal Baseline Pathway Card */}
          <div className="rounded-3xl p-6 sm:p-7 border-2 border-amber-700/25 bg-gradient-to-b from-amber-50/70 via-white to-white shadow-[0_12px_32px_-6px_rgba(180,83,9,0.08)] flex flex-col justify-between hover:border-amber-700/50 transition-all">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-amber-900 px-3 py-1 font-mono text-xs font-bold text-white shadow-xs">
                  LAYER 02
                </span>
                <span className="text-xs font-semibold text-amber-900 bg-amber-100/90 border border-amber-900/20 px-3 py-0.5 rounded-full">
                  Client Longitudinal Baseline
                </span>
              </div>

              <h3 className="mt-4 font-display text-xl sm:text-2xl font-bold tracking-tight text-[#183c35]">
                Daily Baseline &amp; Longitudinal Monitoring
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#414846]">
                Calibrate your own motor baseline across 10 daily sessions. Track subtle day-to-day drift, record medication timing (e.g. ON/OFF state), and secure entries with your 4-digit PIN.
              </p>

              <div className="mt-5 rounded-2xl bg-white/90 p-4 border border-amber-900/15 shadow-xs">
                <div className="flex items-center justify-between text-xs font-medium text-[#414846] mb-2">
                  <span className="font-semibold text-[#002620]">
                    Calibration Progress: {progress?.sessions ?? 0} of {progress?.required ?? 10} sessions
                  </span>
                  <span className="font-semibold text-amber-900">Day {dayShown} of 5</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#d9e5e0] overflow-hidden">
                  <div
                    className="h-full bg-amber-800 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((progress?.sessions ?? 0) / (progress?.required ?? 10)) * 100)}%` }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#5a6a72]">
                  <span>🔒 PIN Protected</span>
                  <span className="font-semibold text-[#002620]">
                    {established ? "Baseline Locked & Calibrated" : "Calibration In Progress"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#d9e5e0] flex items-center justify-between">
              <button
                type="button"
                onClick={startLayer2}
                className="py-3 px-6 rounded-full bg-amber-950 hover:bg-amber-900 text-white text-xs font-semibold shadow-md shadow-amber-950/20 transition-all active:scale-95"
              >
                Enter Layer 2 Baseline →
              </button>
              <Link href="/layer2" className="text-xs font-semibold text-amber-950 hover:underline">
                View Trends
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ================= Clean History & Profile Shortcut Vitrine ================= */}
      <section className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/90 shadow-[0_12px_32px_-4px_rgba(19,42,38,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-[#131e1b]">
              Need to Review Past Sessions or Device Settings?
            </h3>
            <p className="text-xs text-[#5a6a72] mt-1 max-w-xl leading-relaxed">
              All your recorded sessions, timing metrics, and exportable PDF reports are organized in your History. Device and account configurations are managed in your Profile.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/history"
              className="py-2 px-5 rounded-full bg-white/80 hover:bg-white text-xs font-semibold text-[#002620] border border-[#c1c8c5]/40 shadow-xs transition-all active:scale-95"
            >
              View Session History →
            </Link>
            <Link
              href="/profile"
              className="py-2 px-5 rounded-full bg-[#002620] hover:bg-[#183c35] text-xs font-semibold text-white shadow-xs transition-all active:scale-95"
            >
              Profile Settings
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
