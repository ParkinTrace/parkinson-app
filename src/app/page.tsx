"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import { Trace } from "@/components/Trace";
import { isSupabaseConfigured } from "@/lib/config";
import { getOnboardingState } from "@/lib/onboarding";

/* Layer 1 and Layer 2 are a genuine progression — population reference
   first, then your own baseline — so numbering them encodes something
   real instead of decorating the page. */
const LAYERS = [
  {
    n: "01",
    name: "Typing-pattern screening",
    line: "How your key-timing compares with a research population.",
  },
  {
    n: "02",
    name: "Personal monitoring",
    line: "How your timing changes against your own baseline, session by session.",
  },
];

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const go = async () => {
      if (!isSupabaseConfigured) return;
      const state = await getOnboardingState();
      if (!active || state === "anonymous") return;
      router.replace(state === "complete" ? "/dashboard" : "/consent");
    };
    go();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="flex flex-col gap-14 py-4 sm:gap-16 sm:py-8">
      {/* ---------------- Hero ---------------- */}
      <section className="max-w-3xl">
        <p className="label">Typing-dynamics screening &amp; monitoring</p>

        <h1 className="mt-4 font-display text-[2.5rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[3.25rem]">
          <span className="sr-only">ParkinTrace — </span>
          We measure how you type. Never what you type.
        </h1>

        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          ParkinTrace records the timing between your keystrokes — how long each key is held, and how
          long before the next one. Those intervals are what shift with motor conditions. Your typed
          words are never stored.
        </p>

        <div className="mt-8 rounded-lg border border-hair bg-paper px-5 pb-4 pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="label">sample trace · axis 60–120 ms</span>
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
          <Trace />
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-hair pt-3">
            <span className="label">session medians</span>
            <span className="font-mono text-xs text-ink-soft">
              hold <span className="font-semibold text-ink">76</span> ms
              <span className="px-2 text-hair">|</span>
              flight <span className="font-semibold text-ink">97</span> ms
              <span className="px-2 text-hair">|</span>
              rhythm <span className="font-semibold text-ink">0.13</span>
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={() => router.push("/signup")}>Sign up</PrimaryButton>
          <SecondaryButton onClick={() => router.push("/login")}>Log in</SecondaryButton>
        </div>

        {!isSupabaseConfigured && (
          <p className="mt-4 text-xs text-[#8a5a06]">
            Backend not configured — connect Supabase to enable sign-in.
          </p>
        )}
      </section>

      {/* ---------------- The two readings ---------------- */}
      <section aria-labelledby="layers-heading">
        <h2 id="layers-heading" className="label">
          Two ways to read your data
        </h2>
        <dl className="mt-4 border-t border-hair">
          {LAYERS.map((l) => (
            <div
              key={l.n}
              className="flex flex-col gap-1 border-b border-hair py-5 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <dt className="flex items-baseline gap-4 sm:w-72 sm:shrink-0">
                <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-trace">
                  {l.n}
                </span>
                <span className="font-display text-base font-semibold tracking-tight text-ink">
                  {l.name}
                </span>
              </dt>
              <dd className="text-sm leading-relaxed text-ink-soft sm:pl-10">{l.line}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
