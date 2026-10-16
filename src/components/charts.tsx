"use client";
/**
 * Real-data charts only (spec Phase 8). Every series is built from actual
 * persisted/captured rows. Insufficient data renders an honest message —
 * there is no synthetic fallback anywhere in this file.
 *
 * Colour rule: green is the measurement. Series within one chart are
 * separated by weight and dash, never by hue, so the palette keeps
 * meaning only one thing.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Readout } from "@/components/ui";
import type { WithinSessionSeries } from "@/lib/features";

const TRACE = "#0e7c66";
const INK = "#0d1b22";
const GRID = "#dce3e2";
const TICK = "#5a6a72";
const SIGNAL = "#e4a11b";

const tickStyle = { fontSize: 11, fill: TICK, fontFamily: "var(--font-plex-mono)" };
const axisLine = { stroke: GRID };
const tooltipStyle = {
  contentStyle: {
    border: `1px solid ${GRID}`,
    borderRadius: 6,
    fontSize: 12,
    fontFamily: "var(--font-plex-mono)",
  },
  labelStyle: { color: INK, fontWeight: 600 },
} as const;

function ChartHead({ title, note }: { title: string; note: string }) {
  return (
    <>
      <h3 className="label border-b border-hair pb-3">{title}</h3>
      <p className="mt-3 text-xs leading-relaxed text-muted">{note}</p>
    </>
  );
}

export function FeatureComparisonChart({ features }: { features: Record<string, number | null> }) {
  // One axis, one unit. Hold/flight/IKL are all milliseconds and belong on
  // a shared scale; speed, pauses and consistency are rates and are read as
  // numbers instead. Plotting them together would have flattened them to
  // zero and implied they were comparable.
  const msRows = [
    { name: "Hold time", value: features.ht_mean },
    { name: "Flight time", value: features.ft_mean },
    { name: "Inter-key latency", value: features.ikl_mean },
  ].filter((r) => typeof r.value === "number");

  const rateRows = [
    { label: "Typing speed", value: features.typing_speed, unit: "keys/s", hint: "Keypresses per second" },
    { label: "Pause frequency", value: features.pause_frequency, unit: "/min", hint: "Pauses longer than 500 ms" },
    { label: "Rhythm consistency", value: features.session_consistency, unit: "CV", hint: "Variability divided by mean" },
  ].filter((r) => typeof r.value === "number");

  if (!msRows.length && !rateRows.length) {
    return (
      <Card>
        <ChartHead
          title="Typing characteristics this session"
          note="Insufficient data for a within-session chart. No value is invented to fill the gap."
        />
      </Card>
    );
  }

  return (
    <Card>
      <ChartHead
        title="Typing characteristics this session"
        note="Real extracted values with their units. Nothing here is a score."
      />

      {msRows.length > 0 && (
        <>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Milliseconds only — key hold, the gap before the next key, and press-to-press latency share one
            scale.
          </p>
          <div className="mt-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={msRows} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tick={tickStyle} axisLine={axisLine} tickLine={false} interval={0} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} unit=" ms" width={62} />
                <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(13,27,34,0.04)" }} />
                <Bar
                  dataKey="value"
                  name="ms"
                  fill={TRACE}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {rateRows.length > 0 && (
        <div className={msRows.length > 0 ? "mt-5 border-t border-hair pt-2" : "mt-4"}>
          <dl className="flex flex-col">
            {rateRows.map((r) => (
              <Readout
                key={r.label}
                label={r.label}
                value={typeof r.value === "number" ? r.value.toFixed(2) : "—"}
                unit={r.unit}
                hint={r.hint}
              />
            ))}
          </dl>
        </div>
      )}
    </Card>
  );
}

export function RhythmChart({ series }: { series: WithinSessionSeries | null }) {
  if (!series || series.elapsed_ms.length < 2) {
    return (
      <Card>
        <ChartHead
          title="Typing rhythm during this session"
          note="Insufficient data for a within-session chart. No value is invented to fill the gap."
        />
      </Card>
    );
  }

  // hold series is indexed by keystroke i. flight/IKL describe the
  // transition INTO keystroke i, so they are stored one shorter and must
  // be offset by one to line up with the same elapsed_ms axis.
  const data = series.elapsed_ms.map((t, i) => {
    const ft = series.rolling_ft_ms[i - 1];
    const ikl = series.rolling_ikl_ms[i - 1];
    return {
      t: Math.round(t),
      ht: series.rolling_ht_ms[i] != null ? +series.rolling_ht_ms[i].toFixed(1) : null,
      ft: ft != null ? +ft.toFixed(1) : null,
      ikl: ikl != null ? +ikl.toFixed(1) : null,
    };
  });

  return (
    <Card>
      <ChartHead
        title="Typing rhythm during this session"
        note="Elapsed time against rolling hold, flight and inter-key latency. Real keystrokes only."
      />
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: TRACE }} aria-hidden />
          <span className="label">hold ms</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full opacity-55" style={{ background: TRACE }} aria-hidden />
          <span className="label">flight ms</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4 rounded-full opacity-35"
            style={{ background: INK, backgroundImage: "none" }}
            aria-hidden
          />
          <span className="label">ikl ms</span>
        </span>
      </div>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="t"
              tick={tickStyle}
              axisLine={axisLine}
              tickLine={false}
              label={{ value: "elapsed ms", fontSize: 11, fill: TICK, position: "insideBottom", offset: -2 }}
            />
            <YAxis
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              label={{ value: "ms", angle: -90, fontSize: 11, fill: TICK, position: "insideLeft" }}
            />
            <Tooltip {...tooltipStyle} />
            <Line
              type="monotone"
              dataKey="ht"
              name="hold ms"
              stroke={TRACE}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="ft"
              name="flight ms"
              stroke={TRACE}
              strokeOpacity={0.55}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="ikl"
              name="IKL ms"
              stroke={INK}
              strokeOpacity={0.32}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export interface TrendPoint {
  date: string;
  ht_mean?: number | null;
  ft_mean?: number | null;
  ikl_mean?: number | null;
  typing_speed?: number | null;
  pause_frequency?: number | null;
  session_consistency?: number | null;
  hand_asymmetry?: number | null;
  [key: string]: unknown;
}

export function LongitudinalChart({
  points,
  metric = "ht_mean",
  title = "Personal trend",
  baselineMedian = null,
}: {
  points: TrendPoint[];
  metric?: string;
  title?: string;
  baselineMedian?: number | null;
}) {
  const rows = points
    .map((p) => ({
      date: p.date.slice(0, 10),
      value: typeof p[metric] === "number" ? p[metric] : null,
      baseline: baselineMedian,
    }))
    .filter((r) => r.value !== null);

  if (rows.length < 2) {
    return (
      <Card>
        <ChartHead
          title={title}
          note="Not enough sessions for a trend yet — at least two validated sessions are required. Nothing is interpolated to fill the line."
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hair pb-3">
        <h3 className="label">{title}</h3>
        {baselineMedian !== null && (
          <span className="flex items-center gap-2">
            <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">
              {baselineMedian.toFixed(1)}
            </span>
            <span className="label">baseline median</span>
          </span>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        One point per completed, validated session. The dashed line is your own frozen baseline.
      </p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={tickStyle} axisLine={axisLine} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
            <Tooltip {...tooltipStyle} />
            <Line
              type="monotone"
              dataKey="value"
              name="Session value"
              stroke={TRACE}
              strokeWidth={2}
              dot={{ r: 3, fill: TRACE, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            {baselineMedian !== null && (
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline median"
                stroke={SIGNAL}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
