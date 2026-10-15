"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";
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

/** F/J alternating tap task, 15 s. Own recorder + own feature path —
 *  never mixed into typing HT/FT/IKL statistics. */
export default function MotorTaskPage() {
  const router = useRouter();
  const { active, taps, remaining, start, getTaps } = useMotorTaskCapture(15_000);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // PIN security states
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
    if (!hasPin) {
      setIsSetupModalOpen(true);
    } else {
      setIsPinModalOpen(true);
    }
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
      setError("Analysis service not configured — showing on-device preview only.");
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
        durationMs: 15_000,
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
        features: (analysis["features"] as Record<string, number | null>) ?? (feats as unknown as Record<string, number | null>),
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

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Motor task — F/J alternation</h1>
        <button
          type="button"
          onClick={() => setIsSetupModalOpen(true)}
          className="text-xs text-slate-500 hover:text-teal-700 font-medium"
        >
          ⚙️ Change Session PIN
        </button>
      </div>

      <p className="mt-1 text-sm text-slate-600">
        Alternate the <strong>F</strong> and <strong>J</strong> keys as steadily as you can for 15
        seconds. Tracked in your personal trend only — no population comparison.
      </p>

      <Card className="mt-4 text-center">
        <p className="text-5xl font-bold">{remaining.toFixed(0)}s</p>
        <p className="mt-1 text-slate-600">{taps} taps</p>
        <div className="mt-4 flex justify-center gap-3">
          {!active && !startedAt && (
            <PrimaryButton onClick={handleStartTaskClick}>
              {pinVerified ? "Start 15-second task" : "🔒 Unlock & Start task"}
            </PrimaryButton>
          )}
          {active && <p className="font-semibold text-teal-700">Alternate F and J…</p>}
          {!active && startedAt && (
            <PrimaryButton onClick={finish} disabled={busy}>
              {busy ? "Analyzing…" : "Finish & analyze"}
            </PrimaryButton>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      {/* 4-Digit PIN Verification Modal */}
      <PinInputModal
        isOpen={isPinModalOpen}
        onSuccess={handlePinSuccess}
        onRequestSetup={() => {
          setIsPinModalOpen(false);
          setIsSetupModalOpen(true);
        }}
        onCancel={() => setIsPinModalOpen(false)}
      />

      {/* 4-Digit PIN Setup Modal */}
      <PinSetupModal
        isOpen={isSetupModalOpen}
        onSuccess={handleSetupSuccess}
        onCancel={() => setIsSetupModalOpen(false)}
      />
    </div>
  );
}
