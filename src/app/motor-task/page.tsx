"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";
import { PinInputModal } from "@/components/PinInputModal";
import { PinSetupModal } from "@/components/PinSetupModal";
import { useMotorTaskCapture } from "@/hooks/useTypingCapture";
import { extractMotorFeatures } from "@/lib/features";
import { newSessionId, persistAndAnalyze, stableDeviceId } from "@/lib/session";
import { saveSnapshot } from "@/lib/localCache";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { isApiConfigured } from "@/lib/config";
import { fetchPinStatus, isSessionUnlocked, lockSession } from "@/lib/pinClient";
import { pinRequired } from "@/lib/pinPolicy";
import { useSession } from "@/lib/useSession";
import { useAppStore } from "@/store/useAppStore";
import type { SessionPayload } from "@/lib/types";

const DURATION_MS = 15_000;

/** F/J alternating tap task, 15 s. Own recorder + own feature path —
 *  never mixed into typing HT/FT/IKL statistics. */
function playCompletionTone() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // AudioContext blocked or unsupported
  }
}

export default function MotorTaskPage() {
  const router = useRouter();
  const { active, taps, remaining, start, getTaps } = useMotorTaskCapture(DURATION_MS);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);

  const sessionIdRef = useRef<string>(newSessionId());
  const prevActiveRef = useRef(false);

  useEffect(() => {
    if (prevActiveRef.current && !active && startedAt) {
      playCompletionTone();
    }
    prevActiveRef.current = active;
  }, [active, startedAt]);

  useEffect(() => {
    // Client-only read of sessionStorage; server HTML cannot know this.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinVerified(isSessionUnlocked());
  }, []);

  const begin = () => {
    sessionIdRef.current = newSessionId();
    setStartedAt(new Date().toISOString());
    setError("");
    start();
  };

  const handleResetTask = () => {
    setStartedAt(null);
    setError("");
  };

  const layer = useAppStore((s) => s.layer);
  const status = useSession();
  const locked = pinRequired(status, layer);

  const handleStartTaskClick = async () => {
    // PIN only required in Layer 2. In Layer 1, start immediately!
    if (!locked || pinVerified) {
      begin();
      return;
    }
    const hasPin = await fetchPinStatus();
    if (!hasPin) setIsSetupModalOpen(true);
    else setIsPinModalOpen(true);
  };

  const handlePinSuccess = () => {
    setPinVerified(true);
    setIsPinModalOpen(false);
    begin();
  };

  const handleSetupSuccess = () => {
    setIsSetupModalOpen(false);
    setIsPinModalOpen(true);
  };

  const finish = async () => {
    const raw = getTaps();
    const endedAt = new Date().toISOString();
    const feats = extractMotorFeatures(raw);
    if (!isApiConfigured) {
      setError("Analysis service not configured — showing the on-device preview only.");
      saveSnapshot({
        sessionId: sessionIdRef.current,
        startedAt: startedAt!,
        endedAt,
        sessionType: "motor_task",
        deviceId: "local",
        features: feats as unknown as Record<string, number | null>,
        layer1: null,
        layer2: null,
        series: null,
        persisted: false,
        localPreview: true,
      });
      lockSession();
      setPinVerified(false);
      return;
    }
    setBusy(true);
    try {
      const supa = supabaseBrowser();
      let userId = "00000000-0000-0000-0000-000000000000";
      if (supa) {
        const { data } = await supa.auth.getUser();
        if (data.user) userId = data.user.id;
      }
      const payload: SessionPayload = {
        sessionId: sessionIdRef.current,
        userId,
        sessionType: "motor_task",
        layer: "layer2",
        deviceId: stableDeviceId(),
        startedAt: startedAt!,
        endedAt,
        durationMs: DURATION_MS,
        keystrokeCount: raw.length,
        qualityFlags: [],
        events: [],
        taps: raw,
        features: {},
      };
      const { analysis, persisted } = await persistAndAnalyze(payload);
      const a = analysis as Record<string, Record<string, unknown>>;
      saveSnapshot({
        sessionId: sessionIdRef.current,
        startedAt: startedAt!,
        endedAt,
        sessionType: "motor_task",
        layer: "layer2",
        deviceId: payload.deviceId,
        features:
          (analysis["features"] as Record<string, number | null>) ??
          (feats as unknown as Record<string, number | null>),
        layer1: (a["layer1"] as Record<string, unknown>) ?? null,
        layer2: (a["layer2"] as Record<string, unknown>) ?? null,
        series: null,
        persisted,
        localPreview: false,
      });

      lockSession();
      setPinVerified(false);

      router.push(`/session/${sessionIdRef.current}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  const elapsedPct = Math.min(100, Math.max(0, ((DURATION_MS - remaining * 1000) / DURATION_MS) * 100));

  return (
    <div className="mx-auto max-w-2xl">
      {/* Sensor Status Capsule */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 backdrop-blur-md shadow-[0_2px_8px_rgba(0,38,32,0.04)]">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#002620]" />
        </span>
        <span className="font-mono text-xs font-semibold tracking-wider uppercase text-[#002620]">
          High-Precision Timer • 15s Motor Task
        </span>
      </div>

      <PageHeader
        eyebrow="Measurement"
        title="Motor Task — F/J Alternation"
        description="Alternate the F and J keys as rhythmically and steadily as you can for 15 seconds. This task tracks your finger tap cadence across sessions."
        actions={
          <button
            type="button"
            onClick={() => setIsSetupModalOpen(true)}
            className="rounded-full border border-[#c1c8c5]/40 bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#002620] transition-colors hover:border-[#002620]/30 hover:bg-white"
          >
            Change session PIN
          </button>
        }
      />

      <div className="glass-panel mt-6 rounded-3xl p-8 sm:p-10">
        <div className="flex flex-col items-center py-2 text-center">
          <span className="rounded-full bg-[#002620]/5 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-[#002620]">
            Time Remaining
          </span>
          <p
            className={`mt-4 font-mono text-7xl font-bold leading-none tracking-tight tabular-nums ${
              active ? "text-[#002620]" : "text-[#486455]/40"
            }`}
          >
            {remaining.toFixed(0)}
            <span className="ml-1 text-3xl font-medium">s</span>
          </p>

          <div className="mt-6 h-2 w-full max-w-md overflow-hidden rounded-full bg-[#c1c8c5]/30 p-0.5" aria-hidden>
            <div
              className="h-full rounded-full bg-[#002620] transition-[width] duration-200"
              style={{ width: `${elapsedPct}%` }}
            />
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2 border border-white/80 shadow-sm">
            <span className="font-mono text-lg font-bold text-[#002620]">{taps}</span>
            <span className="text-xs font-medium uppercase tracking-wider text-[#486455]">Recorded Taps</span>
          </div>

          <div className="mt-8 flex min-h-[48px] items-center justify-center">
            {!active && !startedAt && (
              <PrimaryButton onClick={handleStartTaskClick}>
                {pinVerified ? `Start ${DURATION_MS / 1000}-second task` : "Unlock and start task"}
              </PrimaryButton>
            )}
            {active && (
              <div className="flex flex-col items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#002620] px-4 py-2 text-xs font-semibold text-white shadow-sm">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" aria-hidden />
                  Recording — Alternate F and J
                </span>
                <button
                  type="button"
                  onClick={handleResetTask}
                  className="text-xs text-[#486455] hover:text-[#904d00] underline underline-offset-2 transition-colors"
                >
                  Cancel / Start Over
                </button>
              </div>
            )}
            {!active && startedAt && (
              <div className="flex flex-wrap items-center gap-3">
                <PrimaryButton onClick={finish} disabled={busy}>
                  {busy ? "Analysing…" : "Finish & analyze"}
                </PrimaryButton>
                <SecondaryButton onClick={handleResetTask} disabled={busy}>
                  Retry task
                </SecondaryButton>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-[#904d00]/30 bg-[#904d00]/10 px-4 py-2.5 text-xs font-medium text-[#904d00]">
              {error}
            </p>
          )}
        </div>
      </div>

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
