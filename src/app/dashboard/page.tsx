"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Meter,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { baselineProgress } from "@/lib/baseline";
import { fetchHistory } from "@/lib/session";
import { stableDeviceId } from "@/lib/session";
import { useAppStore } from "@/store/useAppStore";
import { lastSessionId } from "@/lib/localCache";

export default function DashboardPage() {
  const router = useRouter();
  const layer = useAppStore((s) => s.layer);
  const setLayer = useAppStore((s) => s.setLayer);
  const resetSession = useAppStore((s) => s.resetSession);
  const [sessions, setSessions] = useState(0);
  const [days, setDays] = useState(0);
  const [required, setRequired] = useState(10);
  const [requiredDays, setRequiredDays] = useState(5);
  const [baselineState, setBaselineState] = useState("building");

  useEffect(() => {
    fetchHistory().then((rows) => {
      const p = baselineProgress(rows, typeof window !== "undefined" ? stableDeviceId() : "");
      setSessions(p.sessions);
      setDays(p.distinctDays);
      setRequired(p.required);
      setRequiredDays(p.requiredDays);
      setBaselineState(p.status);
    });
  }, []);

  const logout = async () => {
    await supabaseBrowser()?.auth.signOut();
    resetSession();
    router.replace("/");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Both layers read the same recorded sessions. Pick the one you want to open, or start a new measurement."
        actions={
          <>
            <PrimaryButton onClick={() => router.push("/test")}>New typing session</PrimaryButton>
            <SecondaryButton onClick={() => router.push("/motor-task")}>Motor task (F/J)</SecondaryButton>
            <SecondaryButton onClick={logout}>Log out</SecondaryButton>
          </>
        }
      />

      {/* Where the next measurement sits */}
      <Card>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="label">Recording status</p>
            <p className="mt-2 font-display text-lg font-semibold tracking-tight text-ink">
              {baselineState === "established"
                ? "Baseline established"
                : "Baseline still being built"}
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">
              {baselineState === "established"
                ? "Layer 2 can now compare each new session against your own frozen reference."
                : "Layer 2 needs repeated sessions across different days before it can compare you against yourself. Until then it reports no baseline reference rather than guessing."}
            </p>
          </div>
          <div className="w-full shrink-0 sm:w-56">
            <Meter value={sessions} max={required} caption="sessions" />
            <div className="mt-3">
              <Meter value={days} max={requiredDays} caption="recording days" />
            </div>
          </div>
        </div>
      </Card>

      {/* The two readings */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={layer === "layer1" ? "border-trace/40 bg-trace-wash/30" : ""}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-trace">01</span>
            {layer === "layer1" && <span className="label">current view</span>}
          </div>
          <h2 className="mt-3 font-display text-base font-semibold tracking-tight text-ink">
            Layer 1 — Typing-pattern screening
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            How your key-timing sits against a research population. Population comparison, read once per
            session.
          </p>
          <div className="mt-4">
            <PrimaryButton
              onClick={() => {
                setLayer("layer1");
                router.push("/layer1");
              }}
            >
              Open Layer 1
            </PrimaryButton>
          </div>
        </Card>

        <Card className={layer === "layer2" ? "border-trace/40 bg-trace-wash/30" : ""}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-trace">02</span>
            {layer === "layer2" && <span className="label">current view</span>}
          </div>
          <h2 className="mt-3 font-display text-base font-semibold tracking-tight text-ink">
            Layer 2 — Personal monitoring
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            How your timing changes against your own baseline, session by session and across days.
          </p>
          <div className="mt-4">
            <PrimaryButton
              onClick={() => {
                setLayer("layer2");
                router.push("/layer2");
              }}
            >
              Open Layer 2
            </PrimaryButton>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SecondaryButton
          onClick={() => {
            const id = lastSessionId();
            if (id) router.push(`/session/${id}`);
          }}
        >
          Latest session
        </SecondaryButton>
        <SecondaryButton href="/history">Full history</SecondaryButton>
      </div>
    </div>
  );
}
