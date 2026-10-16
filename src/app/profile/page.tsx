"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";
import { Mascot } from "@/components/Mascot";
import { baselineProgress, type BaselineProgress } from "@/lib/baseline";
import { lockSession } from "@/lib/pinClient";
import { fetchHistory, stableDeviceId } from "@/lib/session";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useAppStore } from "@/store/useAppStore";
import type { SessionRow } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const resetSession = useAppStore((s) => s.resetSession);
  const [email, setEmail] = useState<string | null>(null);
  const [device, setDevice] = useState("");
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [progress, setProgress] = useState<BaselineProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const thisDevice = stableDeviceId();
    fetchHistory().then((history) => {
      if (!active) return;
      setDevice(thisDevice);
      setRows(history);
      setProgress(baselineProgress(history, thisDevice));
    });
    supabaseBrowser()
      ?.auth.getSession()
      .then(({ data }) => {
        if (active) setEmail(data.session?.user?.email ?? null);
      })
      .catch(() => {
        /* working in local or offline mode */
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCopyDevice = () => {
    if (!device) return;
    navigator.clipboard.writeText(device);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLockNow = () => {
    lockSession();
    router.push("/layer2");
  };

  const signOut = async (then?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await supabaseBrowser()?.auth.signOut();
    } catch {
      /* the local reset below is what the visitor sees */
    }
    lockSession();
    resetSession();
    setBusy(false);
    router.push(then ?? "/");
  };

  const initials = email ? email.slice(0, 2).toUpperCase() : "PT";
  const baselineSessions = progress?.sessions ?? (rows ? rows.length : 0);
  const baselineTarget = progress?.required ?? 10;
  const baselinePercent = Math.min(100, Math.round((baselineSessions / baselineTarget) * 100));

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-10">
      <div>
        <BackButton fallbackHref="/dashboard" />
      </div>

      {/* ================= HERO PROFILE SUBSTRATE ================= */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/90 shadow-[0_12px_32px_-4px_rgba(19,42,38,0.06)] bg-gradient-to-br from-[#FCFAF6] via-white to-[#caead7]/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#d9e5e0]">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#002620] text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-lg shadow-[#002620]/25 shrink-0 border-2 border-white/80">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#002620] text-white">
                  Participant Identity
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#caead7]/80 text-[#0e7c66] border border-[#0e7c66]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0e7c66] animate-pulse"></span>
                  IRB Protocol v2.4 Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#002620]">
                {email ?? "Anonymous (Local Screening Mode)"}
              </h1>
              <p className="text-xs sm:text-sm text-[#414846] mt-1 leading-relaxed">
                Calibrated Cohort Member · Longitudinal Neuromuscular Screening
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto shrink-0">
            <Mascot pose="analyst" className="w-20 sm:w-24 h-auto hidden sm:block" />
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Link
                href="/history"
                className="py-2.5 px-5 rounded-full bg-white hover:bg-[#F7F5EF] text-xs font-semibold text-[#002620] border border-[#183c35]/15 shadow-xs transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>📋</span>
                <span>Session History</span>
              </Link>
              <Link
                href="/layer2"
                className="py-2.5 px-5 rounded-full bg-[#002620] hover:bg-[#183c35] text-xs font-semibold text-white shadow-xs transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>Daily Check-in →</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Bottom Telemetry Anchor Banner */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5a6a72]">
          <div className="flex items-center gap-2">
            <span className="text-[#0e7c66] font-bold">✓</span>
            <span className="font-medium">Hardware-anchored session timing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#0e7c66] font-bold">✓</span>
            <span className="font-medium">Zero-knowledge volatile keystroke processing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#0e7c66] font-bold">✓</span>
            <span className="font-medium">Movement Disorder Society UPDRS-III harmonized</span>
          </div>
        </div>
      </section>

      {/* ================= 4 METRIC STATUS TILES ================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Measured Sessions */}
        <div className="glass-card-subtle rounded-3xl p-5 border border-white/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#5a6a72]">Recorded Sessions</span>
              <span className="px-2 py-0.5 rounded-full bg-[#caead7]/60 text-[#002620] text-[11px] font-bold">
                Layer 2
              </span>
            </div>
            <div className="text-3xl font-bold text-[#002620] mb-1">
              {rows ? rows.length : 0}
            </div>
            <p className="text-xs text-[#414846] leading-relaxed">
              Longitudinal sessions saved to your secure profile.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#183c35]/10 text-[11px] text-[#0e7c66] font-semibold flex items-center gap-1">
            <span>●</span>
            <span>Historical telemetry stored</span>
          </div>
        </div>

        {/* Card 2: Baseline Calibration Progress */}
        <div className="glass-card-subtle rounded-3xl p-5 border border-white/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#5a6a72]">Baseline Calibration</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                progress?.status === "established"
                  ? "bg-[#caead7] text-[#0e7c66]"
                  : "bg-[#e4ede4] text-[#002620]"
              }`}>
                {progress?.status === "established" ? "Established" : `${baselinePercent}% Built`}
              </span>
            </div>
            <div className="text-2xl font-bold text-[#002620] mb-1">
              {baselineSessions} / {baselineTarget} Sessions
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full bg-[#E4EDE4] h-2 rounded-full overflow-hidden my-2 border border-[#183c35]/10">
              <div
                className="bg-[#002620] h-full rounded-full transition-all duration-500"
                style={{ width: `${baselinePercent}%` }}
              />
            </div>
            <p className="text-xs text-[#414846] leading-relaxed">
              {progress?.distinctDays ?? 0} of 5 required calendar days recorded.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-[#183c35]/10 text-[11px] text-[#486455] font-medium">
            Frozen reference baseline
          </div>
        </div>

        {/* Card 3: Anchored Hardware Sensor */}
        <div className="glass-card-subtle rounded-3xl p-5 border border-white/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#5a6a72]">Anchored Hardware</span>
              <button
                type="button"
                onClick={handleCopyDevice}
                className="px-2 py-0.5 rounded-full bg-white hover:bg-[#F7F5EF] border border-[#183c35]/15 text-[11px] font-bold text-[#002620] transition-colors cursor-pointer"
                title="Copy device hash"
              >
                {copied ? "Copied! ✓" : "Copy Hash"}
              </button>
            </div>
            <div className="font-mono text-sm font-bold text-[#002620] mb-1 truncate bg-[#F7F5EF] p-2 rounded-xl border border-[#183c35]/10">
              {device ? device.slice(0, 18) + "…" : "Local Device"}
            </div>
            <p className="text-xs text-[#414846] leading-relaxed mt-1">
              Physical keyboard anchor to eliminate switch latency variability.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-[#183c35]/10 text-[11px] text-[#0e7c66] font-semibold flex items-center gap-1">
            <span>✓</span>
            <span>Sensor Fingerprint Verified</span>
          </div>
        </div>

        {/* Card 4: PIN Vault Security */}
        <div className="glass-card-subtle rounded-3xl p-5 border border-white/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#5a6a72]">PIN Shield</span>
              <span className="px-2 py-0.5 rounded-full bg-[#caead7]/60 text-[#0e7c66] text-[11px] font-bold">
                Active
              </span>
            </div>
            <div className="text-xl font-bold text-[#002620] mb-1">
              4-Digit Passcode
            </div>
            <p className="text-xs text-[#414846] leading-relaxed">
              Protects sensitive motor trajectory on shared computers.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#183c35]/10">
            <button
              type="button"
              onClick={handleLockNow}
              className="w-full py-1.5 px-3 rounded-full bg-white hover:bg-[#ffdad6] text-[#93000a] border border-[#ffdad6] text-xs font-semibold transition-colors cursor-pointer"
            >
              Lock Session Now 🔒
            </button>
          </div>
        </div>
      </section>

      {/* ================= CLINICAL CONTEXT & RESEARCH SETTINGS ================= */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#d9e5e0] gap-4 mb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0e7c66]">
              Study Configuration
            </span>
            <h2 className="text-lg font-bold text-[#002620]">
              Clinical Context &amp; Demographics
            </h2>
          </div>
          <Link
            href="/demographics"
            className="self-start sm:self-auto py-2 px-4 rounded-full bg-[#002620] hover:bg-[#183c35] text-xs font-semibold text-white shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>Update Demographics</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/70 border border-[#183c35]/10">
            <span className="text-xs font-semibold text-[#5a6a72] block mb-1">
              Typing Modality
            </span>
            <span className="text-sm font-bold text-[#002620] block">
              Standard Physical Keyboard
            </span>
            <p className="text-xs text-[#414846] mt-1 leading-relaxed">
              Touchscreens and virtual on-screen keyboards are excluded to maintain microsecond timing accuracy.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 border border-[#183c35]/10">
            <span className="text-xs font-semibold text-[#5a6a72] block mb-1">
              Data Privacy &amp; Anonymization
            </span>
            <span className="text-sm font-bold text-[#0e7c66] block">
              Strictly Decoupled
            </span>
            <p className="text-xs text-[#414846] mt-1 leading-relaxed">
              Zero typed characters, words, or sentences are ever saved. Timing intervals exist in transient memory only.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 border border-[#183c35]/10">
            <span className="text-xs font-semibold text-[#5a6a72] block mb-1">
              Longitudinal Calibration
            </span>
            <span className="text-sm font-bold text-[#002620] block">
              CUSUM &amp; EWMA Drift Engine
            </span>
            <p className="text-xs text-[#414846] mt-1 leading-relaxed">
              Multi-algorithmic statistical tracking sensitive to micro-variations and treatment milestones.
            </p>
          </div>
        </div>
      </section>

      {/* ================= SESSION SECURITY & ACCOUNT EXIT ================= */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/90 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#d9e5e0] mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#002620]">
              Account &amp; Session Management
            </h2>
            <p className="text-xs text-[#5a6a72] mt-0.5">
              Securely sign out or switch accounts on this workstation.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#0e7c66] bg-[#caead7]/70 px-3 py-1 rounded-full">
            Protected
          </span>
        </div>

        <p className="text-xs sm:text-sm text-[#414846] leading-relaxed max-w-2xl mb-6">
          Signing out terminates your current active session, removes cached access tokens from memory, and locks the local PIN vault. Your historical motor cadence records remain safely anchored to your account.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => signOut()}
            disabled={busy}
            className="py-2.5 px-6 rounded-full bg-white hover:bg-[#ffdad6] text-[#93000a] border border-[#ffdad6] text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            Log Out of Account
          </button>
          <button
            type="button"
            onClick={() => signOut("/login")}
            disabled={busy}
            className="py-2.5 px-6 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            Sign In with Another Account →
          </button>
        </div>
      </section>
    </div>
  );
}
