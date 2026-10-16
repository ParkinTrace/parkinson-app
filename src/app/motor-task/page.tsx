"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, PrimaryButton } from "@/components/ui";
import { PinInputModal } from "@/components/PinInputModal";
import { PinSetupModal } from "@/components/PinSetupModal";
import { useMotorTaskCapture } from "@/hooks/useTypingCapture";
import { extractMotorFeatures } from "@/lib/features";
import { newSessionId, persistAndAnalyze, stableDeviceId } from "@/lib/session";
import { saveSnapshot } from "@/lib/localCache";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { isApiConfigured } from "@/lib/config";
import { fetchPinStatus, isSessionUnlocked, lockSession } from "@/lib/pinClient";
import type { SessionPayload } from "@/lib/types";

const DURATION_MS = 15_000;

/** F/J alternating tap task, 15 s. Own recorder + own feature path —
 *  never mixed into typing HT/FT/IKL statistics. */
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

  const handleStartTaskClick = async () => {
    if (pinVerified) {
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
      <PageHeader
        eyebrow="Measurement"
        title="Motor task — F/J alternation"
        description="Alternate the F and J keys as steadily as you can for 15 seconds. This task is tracked in your personal trend only — it is never compared against a population."
        actions={
          <button
            type="button"
            onClick={() => setIsSetupModalOpen(true)}
            className="rounded-md border border-hair px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
          >
            Change session PIN
          </button>
        }
      />

      <Card className="mt-6">
        <div className="flex flex-col items-center py-2">
          <p className="label">Time remaining</p>
          <p
            className={`mt-2 font-mono text-6xl font-semibold leading-none tabular-nums ${
              active ? "text-ink" : "text-muted"
            }`}
          >
            {remaining.toFixed(0)}
            <span className="ml-1 text-2xl">s</span>
          </p>

          <div className="mt-5 h-1 w-full max-w-sm overflow-hidden rounded-full bg-hair" aria-hidden>
            <div
              className="h-full rounded-full bg-trace transition-[width] duration-200"
              style={{ width: `${elapsedPct}%` }}
            />
          </div>

          <p className="mt-4 font-mono text-sm tabular-nums text-ink-soft">
            <span className="text-ink">{taps}</span> taps
          </p>

          <div className="mt-6 flex min-h-[44px] items-center justify-center">
            {!active && !startedAt && (
              <PrimaryButton onClick={handleStartTaskClick}>
                {pinVerified ? `Start ${DURATION_MS / 1000}-second task` : "Unlock and start task"}
              </PrimaryButton>
            )}
            {active && (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-trace" aria-hidden />
                <span className="text-sm font-semibold tracking-tight text-ink">
                  Recording — alternate F and J
                </span>
              </span>
            )}
            {!active && startedAt && (
              <PrimaryButton onClick={finish} disabled={busy}>
                {busy ? "Analysing…" : "Finish & analyze"}
              </PrimaryButton>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-md border border-signal/35 bg-signal-wash px-3 py-2 text-xs text-[#8a5a06]">
              {error}
            </p>
          )}
        </div>
      </Card>

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
