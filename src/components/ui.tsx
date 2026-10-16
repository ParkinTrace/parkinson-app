import type { ReactNode } from "react";
import Link from "next/link";
import { DISCLAIMER } from "@/lib/config";
import { BackButton } from "@/components/BackButton";
export { BackButton };

/* The wordmark is the trace, not a monogram — the product's output is
   its identity. Four bars: hold, flight, hold, flight. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="text-trace"
    >
      <rect x="2" y="7" width="3" height="13" rx="0.75" fill="currentColor" />
      <rect x="7" y="17" width="3" height="3" rx="0.75" fill="currentColor" opacity="0.4" />
      <rect x="12" y="4" width="3" height="16" rx="0.75" fill="currentColor" />
      <rect x="17" y="15" width="3" height="5" rx="0.75" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/60 bg-white/70 p-6 backdrop-blur-md shadow-[0_8px_32px_rgba(0,38,32,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

/* Primary action is ink, never the measurement green: green is reserved
   for data, so a filled green button would read as a reading. */
export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  href,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  href?: string;
  className?: string;
}) {
  const cls = `inline-flex items-center justify-center rounded-full bg-[#002620] px-6 py-2.5 text-center text-sm font-semibold tracking-tight text-white shadow-sm transition-all hover:bg-[#003830] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 ${className}`;
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  href,
  type = "button",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const cls = `inline-flex items-center justify-center rounded-full border border-[#c1c8c5]/40 bg-white/80 px-5 py-2.5 text-center text-sm font-semibold tracking-tight text-[#002620] backdrop-blur-sm transition-all hover:border-[#002620]/30 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 ${className}`;
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/* Reads like a panel legend rather than a pill badge: mono, small caps,
   a state dot, and a colour that means something. */
export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "attention" || status === "elevated" || status === "device_mismatch"
      ? "border-alert/25 bg-alert-wash text-alert"
      : status === "watch" || status === "building"
        ? "border-signal/35 bg-signal-wash text-[#8a5a06]"
        : status === "normal" || status === "established"
          ? "border-trace/25 bg-trace-wash text-trace-deep"
          : "border-hair bg-canvas text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Disclaimer() {
  return (
    <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
      <span className="mt-[5px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden />
      <span>{DISCLAIMER}</span>
    </p>
  );
}

/* An empty screen is an invitation to act, not a mood. */
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-hair bg-paper/60 px-5 py-6">
      <h3 className="font-display text-base font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold tracking-tight text-ink">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <span className="mt-1 block text-xs text-alert">{error}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-[#c1c8c5]/50 bg-white/90 px-3.5 py-2.5 text-[15px] text-[#002620] shadow-sm transition-all placeholder:text-[#486455]/50 focus:border-[#002620] focus:outline-none focus:ring-2 focus:ring-[#002620]/10";

/* ------------------------------------------------------------------ */
/* Instrument furniture                                                */
/* ------------------------------------------------------------------ */

/** Every screen opens the same way: an eyebrow that says which part of
 *  the instrument you are in, the heading, and an optional plain-language
 *  description. Consistency here is what makes the app feel like one
 *  device rather than a set of pages. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="border-b border-[#c1c8c5]/25 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <span className="inline-block rounded-full bg-[#002620]/5 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#002620]">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-2.5 font-display text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-[#002620]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#486455]">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** A single measurement, laid out as a row rather than a stat card: the
 *  name and its provenance on the left, the number in monospace on the
 *  right. Numbers get tabular figures so a column of them lines up. */
export function Readout({
  label,
  value,
  unit,
  hint,
  state,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  state?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hair py-2.5 last:border-b-0">
      <dt className="min-w-0">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        {hint && <span className="label mt-0.5 block normal-case tracking-normal">{hint}</span>}
      </dt>
      <dd className="flex shrink-0 items-baseline gap-3">
        <span className="font-mono text-[15px] font-semibold tabular-nums text-ink">{value}</span>
        {unit && <span className="label">{unit}</span>}
        {state}
      </dd>
    </div>
  );
}

/** Only two states are worth a colour: inside your own range, or outside
 *  it. Anything else is genuinely unknown and says so. */
export function StateDot({ state }: { state: "unknown" | "normal" | "elevated" }) {
  const map = {
    unknown: { dot: "bg-muted/40", text: "No baseline reference" },
    normal: { dot: "bg-trace", text: "Within personal range" },
    elevated: { dot: "bg-signal", text: "Above personal range" },
  } as const;
  const s = map[state];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      <span className="label">{s.text}</span>
    </span>
  );
}

/** Progress toward a baseline: a hairline track with a measured fill. */
export function Meter({
  value,
  max,
  caption,
}: {
  value: number;
  max: number;
  caption?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs tabular-nums text-ink">
          {value}
          <span className="text-muted"> / {max}</span>
        </span>
        {caption && <span className="label">{caption}</span>}
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-hair" aria-hidden>
        <div className="h-full rounded-full bg-trace transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Setup runs in a fixed order, so it is numbered. Green marks the step
 *  you are on; every other step stays quiet. */
export function OnboardingShell({
  step,
  steps,
  title,
  description,
  children,
}: {
  step: number;
  steps: string[];
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4">
        <BackButton fallbackHref="/" />
      </div>
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Setup progress">
        {steps.map((s, i) => {
          const n = i + 1;
          const current = n === step;
          const done = n < step;
          return (
            <li key={s} className="flex items-center gap-3">
              {i > 0 && <span className="h-px w-4 bg-hair" aria-hidden />}
              <span
                className={`label ${current ? "text-ink" : ""} ${done ? "line-through decoration-trace/40" : ""}`}
              >
                <span className={current ? "text-trace" : ""}>{String(n).padStart(2, "0")}</span>
                <span className="ml-1.5">{s}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <h1 className="mt-6 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
        {title}
      </h1>
      {description && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>}

      <div className="mt-5">{children}</div>
    </div>
  );
}
