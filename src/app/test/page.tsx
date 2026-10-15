"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, SecondaryButton, StatusBadge } from "@/components/ui";
import { PinInputModal } from "@/components/PinInputModal";
import { PinSetupModal } from "@/components/PinSetupModal";
import { useTypingCapture } from "@/hooks/useTypingCapture";
import { extractTypingFeatures, withinSessionSeries } from "@/lib/features";
import { newSessionId, persistAndAnalyze, stableDeviceId } from "@/lib/session";
import { saveSnapshot, type Snapshot } from "@/lib/localCache";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { isApiConfigured } from "@/lib/config";
import { fetchPinStatus, isSessionUnlocked, lockSession } from "@/lib/pinClient";
import type { SessionPayload } from "@/lib/types";

const PROMPTS = [
  "The morning light moves slowly across the quiet garden wall.",
  "River stones remember every crossing of the steady stream.",
  "A gentle wind follows the narrow path between tall trees.",
];

const MIN_SECONDS = 30;
const MIN_KEYS = 50;

export default function TypingTestPage() {
  const router = useRouter();
  const { active, count, start, stop } = useTypingCapture();
  const [prompt, setPrompt] = useState(PROMPTS[0]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }, []);

  const [text, setText] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Record<string, number | null> | null>(null);
  const [completedSessionId, setCompletedSessionId] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);

  // 4-Digit Daily Session PIN Security State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);

  const sessionIdRef = useRef<string>(newSessionId());
  const t0Ref = useRef<number>(0);

  useEffect(() => {
    // Client-only read of sessionStorage; server HTML cannot know this.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinVerified(isSessionUnlocked());
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  const begin = () => {
    const sid = newSessionId();
    sessionIdRef.current = sid;
    setCompletedSessionId(sid);
    setStartedAt(new Date().toISOString());
    t0Ref.current = performance.now();
    setElapsed(0);
    setText("");
    setPreview(null);
    setError("");
    start();
  };

  const handleStartSessionClick = async () => {
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
    const { events, quality } = stop();
    const endedAt = new Date().toISOString();
    const durationMs = performance.now() - t0Ref.current;
    const durationSec = durationMs / 1000;
    const flags: string[] = [];
    if (durationSec < MIN_SECONDS) flags.push("too_short");
    if (events.length < MIN_KEYS) flags.push("too_few_keystrokes");
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) flags.push("unusual_hour");

    const features = extractTypingFeatures(events, durationSec);
    const series = withinSessionSeries(events);
    setPreview(features);

    if (!isApiConfigured) {
      setError("Analysis service not configured — showing on-device preview only.");
      saveSnapshot({
        sessionId: sessionIdRef.current,
        startedAt: startedAt!,
        endedAt,
        sessionType: "structured",
        deviceId: "local",
        features,
        layer1: null,
        layer2: null,
        series,
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
        sessionType: "structured",
        deviceId: typeof window !== "undefined" ? stableDeviceId() : "browser",
        startedAt: startedAt!,
        endedAt,
        durationMs,
        keystrokeCount: events.length,
        qualityFlags: flags,
        events: events.map((e) => ({ ...e })),
        taps: [],
        features: {},
      };
      const { analysis, persisted } = await persistAndAnalyze(payload);
      const a = analysis as Record<string, Record<string, unknown>>;
      saveSnapshot({
        sessionId: sessionIdRef.current,
        startedAt: startedAt!,
        endedAt,
        sessionType: "structured",
        deviceId: payload.deviceId,
        features: (analysis["features"] as Record<string, number | null>) ?? features,
        layer1: (a["layer1"] as Record<string, unknown>) ?? null,
        layer2: (a["layer2"] as Record<string, unknown>) ?? null,
        series: (analysis["withinSessionSeries"] as Snapshot["series"]) ?? series,
        persisted,
        localPreview: false,
      });
      setText(""); // typed content is dropped — never persisted

      lockSession();
      setPinVerified(false);

      router.push(`/session/${sessionIdRef.current}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      void quality;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Typing session</h1>
        <button
          type="button"
          onClick={() => setIsSetupModalOpen(true)}
          className="text-xs text-slate-500 hover:text-teal-700 font-medium"
        >
          ⚙️ Change Session PIN
        </button>
      </div>

      <p className="mt-1 text-sm text-slate-600">
        Type the prompt naturally. This is a <strong>real measured session</strong> — timing only,
        content is discarded. Minimum {MIN_SECONDS}s and {MIN_KEYS} keys for a valid session.
      </p>

      <Card className="mt-4">
        <p className="rounded-xl bg-slate-100 p-4 font-serif text-lg leading-relaxed">{prompt}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!active}
          rows={4}
          placeholder={active ? "Type here…" : "Press Start session (4-digit PIN required), then type here."}
          className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50"
        />
        <div className="mt-3 flex items-center gap-3">
          {!active ? (
            <PrimaryButton onClick={handleStartSessionClick}>
              {pinVerified ? "Start session" : "🔒 Unlock & Start session"}
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={finish} disabled={busy}>
              {busy ? "Analyzing…" : "Finish & analyze"}
            </PrimaryButton>
          )}
          <span className="text-sm text-slate-600">
            {count} keys · {elapsed.toFixed(0)}s
          </span>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      {preview && (
        <Card className="mt-4">
          <h2 className="font-semibold">
            On-device preview <StatusBadge status="preview" />
          </h2>
          <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
            <dt>Hold time</dt>
            <dd>{preview.ht_mean?.toFixed(0) ?? "—"} ms</dd>
            <dt>Flight time</dt>
            <dd>{preview.ft_mean?.toFixed(0) ?? "—"} ms</dd>
            <dt>Inter-key latency</dt>
            <dd>{preview.ikl_mean?.toFixed(0) ?? "—"} ms</dd>
            <dt>Typing speed</dt>
            <dd>{preview.typing_speed?.toFixed(2) ?? "—"} keys/s</dd>
          </dl>
          <div className="mt-3">
            <SecondaryButton href={`/session/${completedSessionId}`}>Open session insight</SecondaryButton>
          </div>
        </Card>
      )}

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
