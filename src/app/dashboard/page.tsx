"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  EmptyState,
  Meter,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabaseClient";
import {
  baselineProgress,
  baselineStanding,
  type BaselineProgress,
  type BaselineStanding,
} from "@/lib/baseline";
import { fetchHistory, stableDeviceId } from "@/lib/session";
import { useAppStore } from "@/store/useAppStore";
import type { SessionRow } from "@/lib/types";

/** How many past sessions the home page shows. The full record is /history —
 *  this is a glance, not an archive. */
const RECENT = 3;

export default function DashboardPage() {
  const router = useRouter();
  const layer = useAppStore((s) => s.layer);
  const setLayer = useAppStore((s) => s.setLayer);
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [progress, setProgress] = useState<BaselineProgress | null>(null);
  const [standing, setStanding] = useState<BaselineStanding | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchHistory().then((history) => {
      if (!active) return;
      const device = stableDeviceId();
      setRows(history);
      setProgress(baselineProgress(history, device));
      setStanding(baselineStanding(history, device));
    });
    supabaseBrowser()
      ?.auth.getSession()
      .then(({ data }) => {
        if (active) setEmail(data.session?.user?.email ?? null);
      })
      .catch(() => {
        /* the page works without a name on it */
      });
    return () => {
      active = false;
    };
  }, []);

  /* A session started inside the app belongs to the account, and a session in
     an account is Layer 2. Declaring it here keeps the recorder honest about
     which layer it is measuring for. */
  const startToday = () => {
    setLayer("layer2");
    router.push("/test");
  };

  const established = progress?.status === "established";
  const numbered = rows?.map((row, i) => ({ row, n: i + 1 })) ?? [];
  const recent = numbered.slice(-RECENT).reverse();
  const dayShown = standing ? Math.min(standing.daysWithToday, standing.requiredDays) : 0;

  const todayLine = !standing
    ? "Reading your record…"
    : standing.building
      ? `Session ${Math.min(standing.next, standing.required)} of ${standing.required} · Day ${dayShown} of ${standing.requiredDays}. Layer 2 compares you only against your own baseline, and it needs recordings on different days — a second session today still counts, but coming back tomorrow is what moves the day count.`
      : `This will be session ${standing.next}. Your baseline is established, so the session is read against your own frozen reference.`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Home"
        title="Dashboard"
        description={
          email
            ? `Signed in as ${email}. Both layers read the same recorded sessions.`
            : "Both layers read the same recorded sessions."
        }
        actions={
          <SecondaryButton onClick={() => router.push("/motor-task")}>
            Motor task (F/J)
          </SecondaryButton>
        }
      />

      {/* The one action this page exists to offer. Everything below it is a
          reading of what that action has produced so far. */}
      <Card className="border-t-2 border-t-ink">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="label">Today</p>
            <p className="mt-2 font-display text-lg font-semibold tracking-tight text-ink">
              {standing?.recordedToday
                ? "Today's session is recorded."
                : "Today's session is waiting."}
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">{todayLine}</p>
          </div>
          <div className="shrink-0">
            <PrimaryButton onClick={startToday}>
              {standing?.recordedToday ? "Record another session" : "Start today's session"}
            </PrimaryButton>
          </div>
        </div>
      </Card>

      {/* Where the next measurement sits */}
      <Card>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="label">Recording status</p>
            <p className="mt-2 font-display text-lg font-semibold tracking-tight text-ink">
              {established ? "Baseline established" : "Baseline still being built"}
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">
              {established
                ? "Layer 2 can now compare each new session against your own frozen reference."
                : "Layer 2 needs repeated sessions across different days before it can compare you against yourself. Until then it reports no baseline reference rather than guessing."}
            </p>
          </div>
          <div className="w-full shrink-0 sm:w-56">
            <Meter value={progress?.sessions ?? 0} max={progress?.required ?? 10} caption="sessions" />
            <div className="mt-3">
              <Meter
                value={progress?.distinctDays ?? 0}
                max={progress?.requiredDays ?? 5}
                caption="recording days"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* The record, numbered: "session 3" is a real answer to a real question. */}
      {rows && rows.length > 0 ? (
        <Card className="p-0">
          <div className="flex items-baseline justify-between gap-3 border-b border-hair px-5 py-3">
            <h2 className="label">Recent sessions</h2>
            <a
              href="/history"
              className="text-xs font-semibold tracking-tight text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              All sessions
            </a>
          </div>
          <ul>
            {recent.map(({ row, n }) => (
              <li key={row.id} className="border-b border-hair last:border-b-0">
                <a
                  href={`/session/${row.id}`}
                  className="flex flex-col gap-1 px-5 py-3 transition-colors hover:bg-canvas sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] font-medium text-trace">
                      {String(n).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[13px] tabular-nums text-ink">
                      {row.started_at.slice(0, 16).replace("T", " ")}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="label">{row.session_type}</span>
                    <span className="font-mono text-[11px] text-muted">{row.id.slice(0, 8)}…</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState
          title="No sessions recorded yet"
          body="Your first measured session appears here, numbered. There is no practice run — the first one is a real measurement."
        />
      )}

      {/* The two readings of the same recording */}
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
    </div>
  );
}
