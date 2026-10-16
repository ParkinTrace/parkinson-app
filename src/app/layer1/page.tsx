"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FeatureComparisonChart } from "@/components/charts";
import { useTypingCapture } from "@/hooks/useTypingCapture";
import { extractTypingFeatures, withinSessionSeries } from "@/lib/features";
import { newSessionId, persistAndAnalyze, stableDeviceId } from "@/lib/session";
import { saveSnapshot, loadSnapshot, lastSessionId, type Snapshot } from "@/lib/localCache";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { isApiConfigured } from "@/lib/config";
import { useAppStore } from "@/store/useAppStore";
import { BackButton } from "@/components/BackButton";
import { Mascot } from "@/components/Mascot";
import type { SessionPayload } from "@/lib/types";
import { getNextStandardPrompt, STANDARDIZED_PROMPTS } from "@/lib/prompts";

const MIN_SECONDS = 30;
const MIN_KEYS = 50;

export default function Layer1Page() {
  const router = useRouter();
  const setLayer = useAppStore((s) => s.setLayer);

  const { active, count, start, stop } = useTypingCapture();
  const [prompt, setPrompt] = useState<string>(STANDARDIZED_PROMPTS[0]);

  const [text, setText] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);

  // Completion & Insights View State
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionFeatures, setSessionFeatures] = useState<Record<string, number | null> | null>(null);
  const [sessionLayer1, setSessionLayer1] = useState<Record<string, unknown> | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  const sessionIdRef = useRef<string>(newSessionId());
  const t0Ref = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const assessmentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLayer("layer1");
    setPrompt(getNextStandardPrompt());
    // Check if there was a previous session snapshot in this browser
    const prevId = lastSessionId();
    if (prevId) {
      const snap = loadSnapshot(prevId);
      if (snap && snap.features) {
        setSessionFeatures(snap.features);
        if (snap.layer1) setSessionLayer1(snap.layer1);
      }
    }
  }, [setLayer]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  const beginSession = () => {
    const sid = newSessionId();
    sessionIdRef.current = sid;
    setStartedAt(new Date().toISOString());
    t0Ref.current = performance.now();
    setElapsed(0);
    setText("");
    setPrompt(getNextStandardPrompt());
    setSessionCompleted(false);
    setError("");
    start();
    setTimeout(() => {
      assessmentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      textareaRef.current?.focus();
    }, 60);
  };

  const handleCancelSession = () => {
    stop();
    setText("");
    setElapsed(0);
    setStartedAt(null);
  };

  const finishSession = async () => {
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

    if (!isApiConfigured) {
      saveSnapshot({
        sessionId: sessionIdRef.current,
        startedAt: startedAt!,
        endedAt,
        sessionType: "structured",
        layer: "layer1",
        deviceId: "local",
        features,
        layer1: null,
        layer2: null,
        series,
        persisted: false,
        localPreview: true,
      });
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
        layer: "layer1",
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
      const l1 = (a["layer1"] as Record<string, unknown>) ?? null;
      setSessionLayer1(l1);

      saveSnapshot({
        sessionId: sessionIdRef.current,
        startedAt: startedAt!,
        endedAt,
        sessionType: "structured",
        layer: "layer1",
        deviceId: payload.deviceId,
        features: (analysis["features"] as Record<string, number | null>) ?? features,
        layer1: l1,
        layer2: null,
        series: (analysis["withinSessionSeries"] as Snapshot["series"]) ?? series,
        persisted,
        localPreview: false,
      });
      setText(""); // typed content is dropped — never stored
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
  const hasMismatch = useMemo(() => {
    if (!text) return false;
    const checkLen = Math.min(text.length, prompt.length);
    for (let i = 0; i < checkLen; i++) {
      if (text[i] !== prompt[i]) return true;
    }
    if (text.length > prompt.length) {
      return text.slice(prompt.length).trim().length > 0;
    }
    return false;
  }, [text, prompt]);

  // Passage completion detection
  const isPassageComplete = useMemo(() => {
    return text.trim().length >= prompt.trim().length && !hasMismatch;
  }, [text, prompt, hasMismatch]);

  const ms = (v: number | null | undefined) => (typeof v === "number" ? v.toFixed(0) : "—");
  const isNormal = sessionLayer1 ? String(sessionLayer1["status"] ?? "normal") === "normal" : true;

  return (
    <div className="w-full max-w-4xl mx-auto py-2 sm:py-6">
      {/* Back Button */}
      <div className="mb-4">
        <BackButton fallbackHref="/dashboard" />
      </div>

      {/* ================= LAYER 1 HEADER (Exact copy & layout from Image 1) ================= */}
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
          <div className="shrink-0 flex items-center gap-3">
            <Mascot pose="typing" className="w-16 h-auto hidden sm:block" />
            <button
              type="button"
              onClick={beginSession}
              className="inline-flex items-center justify-center rounded-full bg-[#002620] hover:bg-[#183c35] px-6 py-3 text-center text-sm font-semibold tracking-tight text-white shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              New typing session
            </button>
          </div>
        </div>
      </header>

      {/* ================= TYPING ASSESSMENT (Exact content & layout from Image 2) ================= */}
      <div ref={assessmentRef} className="scroll-mt-6">
        {/* Assessment Sub-header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-[#c1c8c5]/40 text-xs font-semibold text-[#002620] mb-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0e7c66]"></span>
              <span>• Layer 01 · Quick Screening</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#183c35]">
              Typing Assessment
            </h2>
          </div>

          {/* Status Indicator Pill */}
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

        {/* Telemetry Progress Bar Card */}
        <div className="bg-[#FCFAF6] rounded-2xl p-5 mb-6 border border-[#183c35]/10 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#d9e5e0] flex items-center justify-center text-lg font-bold shadow-xs">
                ⏱️
              </div>
              <div>
                <div className="font-mono text-2xl font-bold tracking-tight text-[#002620]">
                  {formattedTime}
                </div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-[#5a6a72]">
                  SESSION ELAPSED TIME (MIN 30S)
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

        {/* Typing Task Area Card */}
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

          {/* Live Highlighting with Red Underline Alert on Wrong Letters */}
          <div className="text-base sm:text-lg leading-relaxed text-[#131e1b] mb-4 select-none font-sans p-4 rounded-xl bg-white/75 border border-[#d9e5e0]">
            {prompt.split("").map((char, idx) => {
              const typedChar = text[idx];
              let charStyle = "text-[#414846]";
              if (typedChar !== undefined) {
                if (typedChar === char) {
                  charStyle = "text-[#0e7c66] bg-[#caead7]/50 font-semibold";
                } else {
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
                  onClick={beginSession}
                  className="py-3 px-6 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Start session
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={finishSession}
                    disabled={busy}
                    className="py-3 px-6 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {busy ? "Analyzing…" : "Finish & analyze"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelSession}
                    disabled={busy}
                    className="py-2.5 px-5 rounded-full bg-white hover:bg-[#F7F5EF] text-[#5a6a72] border border-[#c1c8c5]/40 text-xs font-semibold transition-all cursor-pointer"
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

        {/* ================= POST-SESSION REPORT & INSIGHTS ================= */}
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
                  className="w-full sm:w-auto py-3 px-6 rounded-full bg-[#183c35] hover:bg-[#102b27] text-white text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
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
                        {sessionFeatures.typing_speed_cpm ? sessionFeatures.typing_speed_cpm.toFixed(0) : "—"}
                      </span>
                      <span className="text-[10px] text-[#5a6a72] block mt-0.5">chars / minute</span>
                    </div>
                  </div>

                  {/* Populational Model Comparison Chart */}
                  <div className="mt-4 pt-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#486455] mb-2">
                      Comparison to Populational Model Reference Ranges
                    </h4>
                    <FeatureComparisonChart features={sessionFeatures} />
                  </div>
                </div>
              )}
            </div>

            {/* ================= DISTINCT BLUE HORIZONTAL CARD FOR LAYER 2 BASELINE ================= */}
            <div className="rounded-2xl p-6 sm:p-7 border-2 border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50/80 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-2">
                    <span>🔬</span>
                    <span>Longitudinal Tracking</span>
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl text-blue-950 font-normal">
                    Want to build a personal baseline?
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-900/80 mt-1 leading-relaxed">
                    Layer 1 measures a one-time sample against the general population. Layer 2 tracks subtle neuromuscular changes against your own calibrated baseline over time.
                  </p>
                </div>
                <div className="shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setLayer("layer2");
                      router.push("/layer2");
                    }}
                    className="w-full sm:w-auto py-3 px-6 rounded-full bg-blue-700 hover:bg-blue-800 active:scale-95 text-white text-xs sm:text-sm font-semibold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Layer 2</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
