"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useAppStore } from "@/store/useAppStore";
import type { SessionPayload } from "@/lib/types";

import { getNextStandardPrompt, STANDARDIZED_PROMPTS } from "@/lib/prompts";

const MIN_SECONDS = 30;
const MIN_KEYS = 50;

function liveDomain(hold: number[], flight: number[]): [number, number] {
  const all = [...hold, ...flight].filter((v) => Number.isFinite(v) && v > 0);
  if (!all.length) return [0, 250];
  const max = Math.max(...all);
  const upper = Math.max(250, Math.ceil(max / 50) * 50);
  return [0, upper];
}

export default function TypingTestPage() {
  const router = useRouter();
  const { active, count, start, stop, getPairs } = useTypingCapture();
  const [prompt, setPrompt] = useState<string>(STANDARDIZED_PROMPTS[0]);

  const layer = useAppStore((s) => s.layer);
  const setLayer = useAppStore((s) => s.setLayer);

  useEffect(() => {
    setPrompt(getNextStandardPrompt());
  }, []);

  const [text, setText] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);

  // Completion & Insights View State
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState<string>("");
  const [sessionFeatures, setSessionFeatures] = useState<Record<string, number | null> | null>(null);
  const [sessionLayer1, setSessionLayer1] = useState<Record<string, unknown> | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);

  /* PIN verification is strictly required for Layer 2 only.
     Layer 1 screening NEVER asks for a PIN. */
  const status = useSession();
  const locked = pinRequired(status, layer);
  const signedIn = status === "signed-in";
  const [standing, setStanding] = useState<BaselineStanding | null>(null);

  const sessionIdRef = useRef<string>(newSessionId());
  const t0Ref = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPinVerified(isSessionUnlocked());
  }, []);

  useEffect(() => {
    if (!signedIn || layer !== "layer2") return;
    fetchHistory().then((history) => {
      setStanding(baselineStanding(history, stableDeviceId()));
    });
  }, [signedIn, layer]);

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
    setPrompt(getNextStandardPrompt());
    setSessionCompleted(false);
    setSessionFeatures(null);
    setSessionLayer1(null);
    setShowInsights(false);
    setError("");
    start();
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleCancelSession = () => {
    stop();
    setText("");
    setElapsed(0);
    setStartedAt(null);
  };

  const handleStartSessionClick = async () => {
    // PIN only required in Layer 2. In Layer 1, start immediately!
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
    const { events } = stop();
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
    setSessionFeatures(features);

    const currentLayer: "layer1" | "layer2" = layer === "layer2" ? "layer2" : "layer1";

    if (!isApiConfigured) {
      saveSnapshot({
        sessionId: sessionIdRef.current,
        startedAt: startedAt!,
        endedAt,
        sessionType: "structured",
        layer: currentLayer,
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
      setSessionCompleted(true);
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
        layer: currentLayer,
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
      // Layer 1 is strictly a sample screening session: only Layer 2 sessions get claimed into an account baseline
      if (!persisted && currentLayer === "layer2") savePending(payload);
      const a = analysis as Record<string, Record<string, unknown>>;
      const l1 = (a["layer1"] as Record<string, unknown>) ?? null;
      setSessionLayer1(l1);

      saveSnapshot({
        sessionId: sessionIdRef.current,
        startedAt: startedAt!,
        endedAt,
        sessionType: "structured",
        layer: currentLayer,
        deviceId: payload.deviceId,
        features: (analysis["features"] as Record<string, number | null>) ?? features,
        layer1: l1,
        layer2: (a["layer2"] as Record<string, unknown>) ?? null,
        series: (analysis["withinSessionSeries"] as Snapshot["series"]) ?? series,
        persisted,
        localPreview: false,
      });
      setText(""); // typed content is dropped — never stored
      lockSession();
      setPinVerified(false);

      // Present the post-session report on the page
      setSessionCompleted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  const formattedTime = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const pct = Math.min(100, Math.round((elapsed / MIN_SECONDS) * 100));

  // Typo detection: check if typed letters mismatch prompt letters up to prompt length.
  // Trailing whitespace or finishing the passage does NOT trigger a false alert!
  const hasMismatch = useMemo(() => {
    if (!text) return false;
    const checkLen = Math.min(text.length, prompt.length);
    for (let i = 0; i < checkLen; i++) {
      if (text[i] !== prompt[i]) return true;
    }
    // If typed past the prompt, only flag as mismatch if there are non-whitespace extra characters
    if (text.length > prompt.length) {
      return text.slice(prompt.length).trim().length > 0;
    }
    return false;
  }, [text, prompt]);

  // Passage completion detection (correctly typed passage)
  const isPassageComplete = useMemo(() => {
    return text.trim().length >= prompt.trim().length && !hasMismatch;
  }, [text, prompt, hasMismatch]);

  const ms = (v: number | null | undefined) => (typeof v === "number" ? v.toFixed(0) : "—");
  const isNormal = sessionLayer1 ? String(sessionLayer1["status"] ?? "normal") === "normal" : true;

  return (
    <div className="mx-auto max-w-4xl py-2 sm:py-6">
      {/* Layer 1 Banner from Image 1 */}
      {layer !== "layer2" && (
        <header className="border-b border-[#c1c8c5]/30 pb-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-2xl">
              <span className="inline-block rounded-full bg-[#E4EDE4] px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#183c35] mb-2.5">
                LAYER 01
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#002620]">
                Layer 1 — Typing-pattern screening
              </h1>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#414846]">
                How your key-timing sits against a research population. A research reading, described against reference ranges — never a diagnosis.
              </p>
            </div>
            <div className="shrink-0">
              <button
                type="button"
                onClick={begin}
                className="inline-flex items-center justify-center rounded-full bg-[#002620] hover:bg-[#183c35] px-6 py-3 text-center text-sm font-semibold tracking-tight text-white shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                New typing session
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Session Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-[#c1c8c5]/40 text-xs font-semibold text-[#002620] mb-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0e7c66]"></span>
            <span>{layer === "layer2" ? "Layer 02 · Personal Baseline" : "Layer 01 · Quick Screening"}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#183c35]">
            Typing Assessment
          </h1>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xl border border-white/90 px-4 py-2 rounded-full shadow-xs self-start sm:self-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0e7c66]"></span>
          </span>
          <span className="text-xs font-medium text-[#131e1b]">
            Sensor Ready <span className="text-[#c1c8c5] mx-1">•</span>{" "}
            <span className="text-[#002620] font-semibold">High-Precision Timer Active</span>
          </span>
        </div>
      </div>

      {/* Layer 2 Standing Header */}
      {signedIn && layer === "layer2" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/90 bg-white/70 px-5 py-3 shadow-xs">
          {standing ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-[#002620] bg-[#caead7]/60 px-3 py-1 rounded-full">
                {standing.building
                  ? `Session ${Math.min(standing.next, standing.required)} of ${standing.required}`
                  : `Session ${standing.next}`}
              </span>
              <span className="text-xs text-[#5a6a72]">
                {standing.building
                  ? `Day ${Math.min(standing.daysWithToday, standing.requiredDays)} of ${standing.requiredDays}`
                  : "baseline established"}
              </span>
            </div>
          ) : (
            <span className="text-xs text-[#5a6a72]">Reading your baseline calibration record…</span>
          )}
          {locked && (
            <button
              type="button"
              onClick={() => setIsSetupModalOpen(true)}
              className="text-xs font-semibold text-[#5a6a72] hover:text-[#002620] underline underline-offset-4"
            >
              Change 4-digit PIN
            </button>
          )}
        </div>
      )}

      {/* Telemetry Progress Bar */}
      <div className="bg-[#FCFAF6] rounded-2xl p-5 mb-6 border border-[#183c35]/10 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#d9e5e0] flex items-center justify-center text-lg font-bold">
              ⏱️
            </div>
            <div>
              <div className="font-mono text-2xl font-bold tracking-tight text-[#002620]">
                {formattedTime}
              </div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-[#5a6a72]">
                Session Elapsed Time (Min 30s)
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6 sm:border-l sm:border-[#d9e5e0] sm:pl-6 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex flex-col">
              <span className="text-[11px] text-[#5a6a72]">Keystrokes Registered</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-sm font-bold text-[#131e1b] font-mono">{count}</span>
                <span className="text-[11px] text-[#5a6a72]">/ {MIN_KEYS} min</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#5a6a72]">Recording State</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`inline-block w-2 h-2 rounded-full ${active ? "bg-[#0e7c66] animate-pulse" : "bg-[#c1c8c5]"}`}></span>
                <span className="text-xs font-bold text-[#002620]">{active ? "Active" : "Standby"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#d9e5e0]">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-[#5a6a72]">Session Progress</span>
            <span className="text-xs text-[#002620] font-semibold">{pct}% Completed</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#d9e5e0] overflow-hidden">
            <div
              className="h-full bg-[#002620] rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Typing Task Area with Wrong-Letter Red Underline */}
      <div className="bg-[#FCFAF6] rounded-2xl p-6 sm:p-7 border border-[#183c35]/10 shadow-xs mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#d9e5e0] mb-4">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-[#caead7]/70 text-[#002620]">
              Sample Passage
            </span>
            <span className="text-xs text-[#5a6a72] hidden sm:inline">Type naturally at your normal pace</span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-[#0e7c66] font-medium">
            <span>✓</span>
            <span>Zero Text Stored</span>
          </div>
        </div>

        {/* Live Mismatch Highlighting in Prompt Passage */}
        <div className="text-base sm:text-lg leading-relaxed text-[#131e1b] mb-4 select-none font-sans p-4 rounded-xl bg-white/75 border border-[#d9e5e0]">
          {prompt.split("").map((char, idx) => {
            const typedChar = text[idx];
            let charStyle = "text-[#414846]";
            if (typedChar !== undefined) {
              if (typedChar === char) {
                // Correct letter
                charStyle = "text-[#0e7c66] bg-[#caead7]/50 font-semibold";
              } else {
                // WRONG LETTER: Red underline to alert user
                charStyle = "text-red-700 bg-red-100 underline decoration-red-600 decoration-2 font-bold";
              }
            } else if (idx === text.length && active) {
              charStyle = "border-b-2 border-[#183c35] text-[#183c35] bg-[#183c35]/10";
            }
            return (
              <span key={idx} className={`${charStyle} transition-colors`}>
                {char}
              </span>
            );
          })}
          {text.length > prompt.length && text.slice(prompt.length).trim().length > 0 && (
            <span className="text-red-700 bg-red-100 underline decoration-red-600 decoration-2 font-bold">
              {text.slice(prompt.length)}
            </span>
          )}
        </div>

        {hasMismatch && active ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium mb-3">
            <span>⚠️</span>
            <span>Wrong letter typed — check the red underline in the passage above</span>
          </div>
        ) : isPassageComplete && active ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#caead7]/60 border border-[#0e7c66]/30 text-xs text-[#002620] font-semibold mb-3">
            <span>✓</span>
            <span>Passage typed correctly! Click &quot;Finish &amp; analyze&quot; below to complete your session.</span>
          </div>
        ) : null}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!active}
          rows={4}
          placeholder={
            active
              ? "Type the passage here naturally…"
              : locked
                ? "Click 'Start session' (PIN verification required) to begin typing."
                : "Click 'Start session' to begin typing."
          }
          className={`w-full rounded-xl border ${
            hasMismatch && active
              ? "border-red-400 focus:border-red-500 ring-1 ring-red-400/40"
              : "border-[#c1c8c5]/50 focus:border-[#0e7c66]"
          } bg-white/95 p-4 text-base text-[#131e1b] shadow-xs focus:outline-none disabled:bg-[#f1f4f3]/60 transition-colors`}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#d9e5e0]">
          <div className="flex items-center gap-3">
            {!active ? (
              <button
                type="button"
                onClick={handleStartSessionClick}
                className="py-3 px-6 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-sm font-semibold shadow-sm transition-all"
              >
                {!locked || pinVerified ? "Start session" : "Unlock & start session"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={finish}
                  disabled={busy}
                  className="py-3 px-6 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {busy ? "Analyzing…" : "Finish & analyze"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelSession}
                  disabled={busy}
                  className="py-2.5 px-5 rounded-full bg-white hover:bg-[#F7F5EF] text-[#5a6a72] border border-[#c1c8c5]/40 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          <div className="font-mono text-xs text-[#5a6a72]">
            {count} keys ({count >= MIN_KEYS ? "✓ valid length" : `needs ${MIN_KEYS - count} more`}) · {elapsed}s
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
            {error}
          </p>
        )}
      </div>

      {/* ================= POST-SESSION COMPLETION & INSIGHTS CARD ================= */}
      {sessionCompleted && (
        <div className="space-y-6 animate-fadeIn">
          {/* 1. Basic Summary Vitrine with "You can see your insights" and Brief One-Line Answer */}
          <div className="bg-[#FCFAF6] border border-[#183c35]/15 rounded-2xl p-6 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#d9e5e0] mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0e7c66]"></span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#002620]">
                  Session Complete • Motor Cadence Recorded
                </span>
              </div>
              <span className="text-xs font-medium text-[#0e7c66] bg-[#caead7]/60 px-3 py-0.5 rounded-full border border-[#0e7c66]/20">
                ✓ Ready to Review
              </span>
            </div>

            {/* Brief one-line answer to their typing */}
            <div className="my-4 p-4 rounded-xl bg-white border border-[#d9e5e0]">
              <p className="text-sm sm:text-base font-serif text-[#002620] leading-snug">
                {isNormal
                  ? "Your neuromuscular cadence is steady, consistent, and within normal rhythmic bounds."
                  : "Mild variation detected in key hold times — consistent with typical daily fluctuation."}
              </p>
              <p className="text-xs text-[#5a6a72] mt-1.5">
                You can see your insights. Click below to inspect your detailed metrics and population comparison.
              </p>
            </div>

            {/* Clickable button to see further insights */}
            <div>
              <button
                type="button"
                onClick={() => setShowInsights(!showInsights)}
                className="w-full sm:w-auto py-3 px-6 rounded-full bg-[#183c35] hover:bg-[#102b27] text-white text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>{showInsights ? "Hide Detailed Insights" : "See Your Detailed Insights"}</span>
                <span className="text-base font-bold">{showInsights ? "▲" : "▼"}</span>
              </button>
            </div>

            {/* 2. Expanded Report (Revealed when clicked) */}
            {showInsights && sessionFeatures && (
              <div className="mt-6 pt-5 border-t border-[#d9e5e0] space-y-5 animate-fadeIn">
                <h3 className="font-serif text-lg text-[#002620] font-normal">
                  Basic Report of Your First Typing Session
                </h3>

                {/* Key Metrics: Flight time, Hold time, Speed */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white border border-[#d9e5e0]">
                    <span className="text-[11px] text-[#5a6a72] block">Hold Time</span>
                    <span className="font-mono text-xl font-bold text-[#002620]">
                      {ms(sessionFeatures.ht_mean)}
                    </span>
                    <span className="text-[10px] text-[#5a6a72] block mt-0.5">ms (press duration)</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#d9e5e0]">
                    <span className="text-[11px] text-[#5a6a72] block">Flight Time</span>
                    <span className="font-mono text-xl font-bold text-[#002620]">
                      {ms(sessionFeatures.ft_mean)}
                    </span>
                    <span className="text-[10px] text-[#5a6a72] block mt-0.5">ms (key transition)</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#d9e5e0]">
                    <span className="text-[11px] text-[#5a6a72] block">Inter-Key Latency</span>
                    <span className="font-mono text-xl font-bold text-[#002620]">
                      {ms(sessionFeatures.ikl_mean)}
                    </span>
                    <span className="text-[10px] text-[#5a6a72] block mt-0.5">ms (press to press)</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#d9e5e0]">
                    <span className="text-[11px] text-[#5a6a72] block">Typing Speed</span>
                    <span className="font-mono text-xl font-bold text-[#002620]">
                      {typeof sessionFeatures.typing_speed === "number"
                        ? sessionFeatures.typing_speed.toFixed(1)
                        : "—"}
                    </span>
                    <span className="text-[10px] text-[#5a6a72] block mt-0.5">keys/second</span>
                  </div>
                </div>

                {/* Comparison to Populational Model */}
                <div className="p-4 rounded-xl bg-white border border-[#d9e5e0] space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-[#002620]">
                    <span>Population Model Comparison</span>
                    <span className="text-[#0e7c66]">
                      {isNormal ? "Typical Reference Corridor (50th–75th Percentile)" : "Mild Variation"}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#d9e5e0] overflow-hidden relative">
                    <div className="absolute left-0 top-0 bottom-0 w-[42%] bg-[#caead7]" />
                    <div className="absolute left-[42%] top-0 bottom-0 w-[20%] bg-amber-200" />
                    <div className="absolute left-[62%] top-0 bottom-0 right-0 bg-red-200" />
                    <div
                      className="absolute top-0 bottom-0 w-2 bg-[#002620] rounded-full shadow-sm"
                      style={{ left: isNormal ? "32%" : "52%" }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#5a6a72]">
                    <span>Typical Range (0.00 – 0.42)</span>
                    <span>Mild Variation (0.43 – 0.62)</span>
                    <span>Noticeable (&gt; 0.62)</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => router.push(`/session/${completedSessionId}`)}
                    className="text-xs font-semibold text-[#183c35] hover:underline"
                  >
                    Open full analytical session record &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Distinctive Horizontal Card: ONLY on Layer 1 ("Want to build a personal baseline?") */}
          {layer !== "layer2" ? (
            <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#dbeafe] text-[#1e40af] text-[11px] font-semibold mb-2">
                    <span>Longitudinal Tracking</span>
                  </div>
                  <h3 className="font-serif text-xl font-normal text-[#1e3a8a] mb-1">
                    Want to build a personal baseline?
                  </h3>
                  <p className="text-xs sm:text-sm text-[#3b82f6] text-opacity-95 max-w-xl leading-relaxed">
                    Layer 1 compares you to a broad population average. With Layer 2, you establish your own frozen personal baseline over daily check-ins, allowing you to track micro-variations, fatigue patterns, and medication timing effects.
                  </p>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setLayer("layer2");
                      router.push("/layer2");
                    }}
                    className="w-full sm:w-auto py-3 px-6 rounded-full bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Start Layer 2 Baseline</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[11px] font-semibold mb-2">
                    <span>Personal Baseline Calibrated</span>
                  </div>
                  <h3 className="font-serif text-xl font-normal text-[#14532d] mb-1">
                    Daily Baseline Session Recorded
                  </h3>
                  <p className="text-xs sm:text-sm text-[#166534] text-opacity-95 max-w-xl leading-relaxed">
                    Your micro-cadence data has been encrypted and integrated into your longitudinal motor tracking. Return to your Layer 2 dashboard to review updated stability trends.
                  </p>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => router.push("/layer2")}
                    className="w-full sm:w-auto py-3 px-6 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Return to Layer 2 Dashboard</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
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
