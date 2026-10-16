import type { ReactNode } from "react";
import { DISCLAIMER } from "@/lib/config";

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
      className={`rounded-lg border border-hair bg-paper p-5 shadow-[0_1px_2px_rgba(13,27,34,0.04)] ${className}`}
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
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md bg-ink px-5 py-2.5 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "inline-block rounded-md border border-hair bg-paper px-5 py-2.5 text-sm font-semibold tracking-tight text-ink transition-colors hover:border-ink/30 hover:bg-canvas";
  if (href)
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/* Reads like a panel legend rather than a pill badge: mono, small caps,
   a state dot, and a colour that means something. */
export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "attention" || status === "elevated"
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
  "w-full rounded-md border border-hair bg-paper px-3 py-2 text-[15px] text-ink transition-colors placeholder:text-muted/70 focus:border-trace";
