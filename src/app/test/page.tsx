"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, PrimaryButton, Readout, SecondaryButton, StatusBadge } from "@/components/ui";
import { Trace } from "@/components/Trace";
import { PinInputModal } from "@/components/PinInputModal";
import { PinSetupModal } from "@/components/PinSetupModal";
import { useTypingCapture } from "@/hooks/useTypingCapture";
import { extractTypingFeatures, withinSessionSeries } from "@/lib/features";
import { baselineStanding, type BaselineStanding } from "@/lib/baseline";
import { fetchHistory, newSessionId, persistAndAnalyze, stableDeviceId } from "@/lib/session";
import { savePending, saveSnapshot, type Snapshot } from "@/lib/localCache";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { isApiConfigured } from "@/lib/config";
import { fetchPinStatus, isSessionUnlocked, lockSession } from "@/lib/pinClient";
import { pinRequired } from "@/lib/pinPolicy";
import { useSession } from "@/lib/useSession";
import type { SessionPayload } from "@/lib/types";

const PROMPTS = [
  "The morning light moves slowly across the quiet garden wall.",
  "River stones remember every crossing of the steady stream.",
  "A gentle wind follows the narrow path between tall trees.",
];

const MIN_SECONDS = 30;
const MIN_KEYS = 50;

/** Live axis: the bars must reflect this typist's actual milliseconds, so
 *  the domain is derived from their own captured pairs, not the sample. */
function liveDomain(hold: number[], flight: number[]): [number, number] {
  const all = [...hold, ...flight].filter((v) => Number.isFinite(v) && v > 0);
  if (!all.length) return [0, 200];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = Math.max(8, (max - min) * 0.15);
  return [Math.max(0, min - pad), max + pad];
}

export default function TypingTestPage() {
  const router = useRouter();
  const { active, count, start, stop, getPairs } = useTypingCapture();
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

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);

  /* The PIN protects a person's record. Layer 1 is the unsigned screener and
     has no record to protect, so it never asks. The moment there is an
     account — which means Layer 2 — every session is locked. */
  const status = useSession();
  const locked = pinRequired(status);
  const signedIn = status === "signed-in";
  const [standing, setStanding] = useState<BaselineStanding | null>(null);

  const sessionIdRef = useRef<string>(newSessionId());
  const t0Ref = useRef<number>(0);

  useEffect(() => {
    // Client-only read of sessionStorage; server HTML cannot know this.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinVerified(isSessionUnlocked());
  }, []);

  /* Layer 2 only: which session this will be, and which recording day. A
     session recorded in an account joins that account's baseline, so the
     numbers exist; an unsigned Layer 1 screening is a single reading, and a
     count there would be noise. */
  useEffect(() => {
    if (!signedIn) return;
    fetchHistory().then((history) => {
      setStanding(baselineStanding(history, stableDeviceId()));
    });
  }, [signedIn]);

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
    // Layer 1 — no account, no PIN.
    if (!locked) {
      begin();
      return;
    }
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
      setError("Analysis service not configured — showing the on-device preview only.");
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
      // No account: hold the payload so signing up afterwards can hand this
      // session to the account instead of throwing it away.
      if (!persisted) savePending(payload);
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
    } finally {
      setBusy(false);
      void quality;
    }
  };

  const recent = getPairs().slice(-30);
  const liveHold = recent.map((p) => p.hold);
  const liveFlight = recent.map((p) => p.flight);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={signedIn ? "Layer 02 · Personal monitoring" : "Layer 01 · Screening"}
        title="Typing session"
        description={
          signedIn
            ? `Type the prompt below at your normal pace. This session is recorded on your account and read against your own baseline. A valid session needs at least ${MIN_SECONDS} seconds and ${MIN_KEYS} keystrokes.`
            : `Type the prompt below at your normal pace. This is a one-off screening read against a research population — no account, and nothing is kept about the words you type. A valid session needs at least ${MIN_SECONDS} seconds and ${MIN_KEYS} keystrokes.`
        }
        actions={
          locked ? (
            <button
              type="button"
              onClick={() => setIsSetupModalOpen(true)}
              className="rounded-md border border-hair px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
            >
              Change session PIN
            </button>
          ) : undefined
        }
      />

      {/* Which session this is, before it is typed rather than after. */}
      {signedIn && (
        <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-hair bg-canvas px-4 py-3">
          {standing ? (
            <>
              <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                {standing.building
                  ? `Session ${Math.min(standing.next, standing.required)} of ${standing.required}`
                  : `Session ${standing.next}`}
              </span>
              <span className="label">
                {standing.building
                  ? `Day ${Math.min(standing.daysWithToday, standing.requiredDays)} of ${standing.requiredDays}`
                  : "baseline established"}
              </span>
              <span className="text-xs leading-relaxed text-muted">
                {standing.recordedToday
                  ? "You have already recorded today — this one adds to the session count, not the day count."
                  : "Read against your own baseline."}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted">Reading your record…</span>
          )}
        </div>
      )}

      <Card className="mt-6">
        <p className="label">Type this</p>
        <p className="mt-2 text-[17px] leading-relaxed text-ink">{prompt}</p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!active}
          rows={4}
          placeholder={
            active
              ? "Type here…"
              : locked
                ? "Press Start session (your session PIN is required), then type here."
                : "Press Start session, then type here."
          }
          className="mt-4 w-full rounded-md border border-hair bg-paper px-3 py-2.5 text-[15px] text-ink transition-colors placeholder:text-muted/70 focus:border-trace disabled:bg-canvas"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!active ? (
            <PrimaryButton onClick={handleStartSessionClick}>
              {!locked || pinVerified ? "Start session" : "Unlock and start session"}
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={finish} disabled={busy}>
              {busy ? "Analysing…" : "Finish & analyze"}
            </PrimaryButton>
          )}
          <span className="font-mono text-sm tabular-nums text-ink-soft">
            {count} keys · {elapsed.toFixed(0)}s
          </span>
          {active && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-trace" aria-hidden />
              <span className="label">recording</span>
            </span>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-md border border-signal/35 bg-signal-wash px-3 py-2 text-xs text-[#8a5a06]">
            {error}
          </p>
        )}
      </Card>

      {/* The live trace: the same instrument as the landing page, now
          drawing this session's own intervals as they are typed. */}
      {active && liveHold.length >= 2 && (
        <Card className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="label">Your intervals as you type</span>
            <span className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[1px] bg-trace" aria-hidden />
                <span className="label">hold</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-[1px] border border-trace/45 bg-trace-wash"
                  aria-hidden
                />
                <span className="label">flight</span>
              </span>
            </span>
          </div>
          <Trace hold={liveHold} flight={liveFlight} domain={liveDomain(liveHold, liveFlight)} animate={false} height={96} />
        </Card>
      )}

      {preview && (
        <Card className="mt-4">
          <div className="flex items-center justify-between gap-3 border-b border-hair pb-3">
            <h2 className="label">On-device preview</h2>
            <StatusBadge status="preview" />
          </div>
          <dl className="mt-3 flex flex-col">
            <Readout label="Hold time" value={preview.ht_mean?.toFixed(0) ?? "—"} unit="ms" />
            <Readout label="Flight time" value={preview.ft_mean?.toFixed(0) ?? "—"} unit="ms" />
            <Readout label="Inter-key latency" value={preview.ikl_mean?.toFixed(0) ?? "—"} unit="ms" />
            <Readout
              label="Typing speed"
              value={preview.typing_speed?.toFixed(2) ?? "—"}
              unit="keys/s"
            />
          </dl>
          <div className="mt-4">
            <SecondaryButton href={`/session/${completedSessionId}`}>Open session insight</SecondaryButton>
          </div>
        </Card>
      )}

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
