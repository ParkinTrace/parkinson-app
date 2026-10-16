import type { CSSProperties } from "react";

/* ------------------------------------------------------------------
   The trace — this app's signature element.

   Every session records two intervals per keystroke:
     hold   — how long the key stays down        (solid bar)
     flight — the gap before the next press      (outlined bar)

   Both share ONE axis, in milliseconds. Hold and flight are the same
   order of magnitude (~76 ms vs ~97 ms), so drawing them at different
   scales would misrepresent the data the product exists to show.

   Drawing them as a chart-recorder strip makes the app's actual output
   visible instead of describing it, and gives the whole UI one honest
   visual unit to reuse: headers, lists, session readouts.
   ------------------------------------------------------------------ */

const SAMPLE_HOLD = [71, 78, 74, 83, 69, 76, 88, 72, 80, 75, 84, 70, 77, 73];
const SAMPLE_FLIGHT = [92, 104, 88, 97, 113, 95, 90, 101, 86, 108, 94, 99, 91, 106];

/* One axis for both series: 60 ms at the baseline, 120 ms at the top.
   Live sessions pass their own domain, because a real typist can sit
   well outside the sample range and a clamped bar would lie. */
const DEFAULT_DOMAIN: [number, number] = [60, 120];
const RANGE_MIN = 12;
const RANGE_MAX = 100;

function barHeight(ms: number, [min, max]: [number, number]) {
  const span = max - min;
  if (span <= 0) return RANGE_MIN;
  const t = (ms - min) / span;
  const clamped = Math.max(0, Math.min(1, t));
  return RANGE_MIN + clamped * (RANGE_MAX - RANGE_MIN);
}

export function Trace({
  hold = SAMPLE_HOLD,
  flight = SAMPLE_FLIGHT,
  domain = DEFAULT_DOMAIN,
  animate = true,
  height = 116,
  className = "",
}: {
  hold?: number[];
  flight?: number[];
  domain?: [number, number];
  animate?: boolean;
  height?: number;
  className?: string;
}) {
  const sweepWidth = hold.length > 0 ? 100 / (hold.length * 2) : 0;

  return (
    <div
      className={`relative w-full ${className}`}
      style={{ height: `${height}px` }}
      role="img"
      aria-label={`Keyboard timing trace: ${hold.length} keystrokes, alternating key-hold intervals (solid) and flight intervals (outlined), both in milliseconds on one shared axis.`}
    >
      <div className="absolute inset-0 flex items-end gap-[4px]">
        {hold.map((h, i) => (
          <div key={i} className="flex h-full flex-1 items-end gap-[2px]">
            <span
              className={`w-full rounded-t-[1px] bg-trace ${animate ? "trace-bar" : ""}`}
              style={
                {
                  height: `${barHeight(h, domain)}%`,
                  animationDelay: `${i * 42}ms`,
                } satisfies CSSProperties
              }
            />
            <span
              className={`w-full rounded-t-[1px] border border-trace/45 bg-trace-wash ${
                animate ? "trace-bar" : ""
              }`}
              style={
                {
                  height: `${barHeight(flight[i] ?? 0, domain)}%`,
                  animationDelay: `${i * 42 + 21}ms`,
                } satisfies CSSProperties
              }
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-hair" aria-hidden />

      {animate && (
        <span
          aria-hidden
          className="trace-sweep pointer-events-none absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-trace to-transparent"
          style={{ width: `${sweepWidth}%` }}
        />
      )}
    </div>
  );
}
