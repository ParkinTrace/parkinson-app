"use client";
/**
 * Real-data charts only (spec Phase 8). Every series is built from actual
 * persisted/captured rows. Insufficient data renders an honest message —
 * there is no synthetic fallback anywhere in this file.
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
import { Card } from "@/components/ui";
import type { WithinSessionSeries } from "@/lib/features";

export function FeatureComparisonChart({ features }: { features: Record<string, number | null> }) {
  const rows = [
    { name: "Hold time (ms)", value: features.ht_mean },
    { name: "Flight time (ms)", value: features.ft_mean },
    { name: "IKL (ms)", value: features.ikl_mean },
    { name: "Typing speed (keys/s)", value: features.typing_speed },
    { name: "Pauses (/min)", value: features.pause_frequency },
  ].filter((r) => typeof r.value === "number");
  if (!rows.length) {
    return (
      <Card>
        <h3 className="font-semibold">Typing characteristics this session</h3>
        <p className="mt-1 text-sm text-slate-600">Insufficient data for within-session trend visualization.</p>
      </Card>
    );
  }
  return (
    <Card>
      <h3 className="font-semibold">Typing characteristics this session</h3>
      <p className="text-sm text-slate-500">Real extracted values with units. Research preview, not a diagnosis.</p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} height={60} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#0d9488" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function RhythmChart({ series }: { series: WithinSessionSeries | null }) {
  if (!series || series.elapsed_ms.length < 2) {
    return (
      <Card>
        <h3 className="font-semibold">Typing rhythm during this session</h3>
        <p className="mt-1 text-sm text-slate-600">Insufficient data for within-session trend visualization.</p>
      </Card>
    );
  }
  const data = series.elapsed_ms.map((t, i) => ({
    t: Math.round(t),
    ht: series.rolling_ht_ms[i] != null ? +series.rolling_ht_ms[i].toFixed(1) : null,
    ft: series.rolling_ft_ms[i] != null ? +series.rolling_ft_ms[i].toFixed(1) : null,
    ikl: series.rolling_ikl_ms[i] != null ? +series.rolling_ikl_ms[i].toFixed(1) : null,
  }));
  return (
    <Card>
      <h3 className="font-semibold">Typing rhythm during this session</h3>
      <p className="text-sm text-slate-500">Elapsed time vs rolling hold / flight / IKL — real keystrokes only.</p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t" tick={{ fontSize: 11 }} label={{ value: "elapsed ms", fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: "ms", angle: -90, fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="ht" name="hold ms" stroke="#0d9488" dot={false} />
            <Line type="monotone" dataKey="ft" name="flight ms" stroke="#0284c7" dot={false} />
            <Line type="monotone" dataKey="ikl" name="IKL ms" stroke="#7c3aed" dot={false} />
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
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">Not enough sessions for a longitudinal trend (minimum 2 required).</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        {baselineMedian !== null && (
          <span className="text-xs font-medium text-teal-700">
            Baseline Median: {baselineMedian.toFixed(1)}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">Each point represents one completed, validated session.</p>
      <div className="mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              name="Session value"
              stroke="#0d9488"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            {baselineMedian !== null && (
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline median"
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
