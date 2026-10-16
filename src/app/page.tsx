"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, SecondaryButton } from "@/components/ui";
import { Trace } from "@/components/Trace";
import { isSupabaseConfigured } from "@/lib/config";
import { getOnboardingState } from "@/lib/onboarding";

/* Layer 1 and Layer 2 are a genuine progression — population reference
   first, then your own baseline — so numbering them encodes something
   real instead of decorating the page.
   Green is used for the measurement and the readings, muted for
   everything else (account steps are not measurements). */
const LAYERS = [
  {
    n: "01",
    name: "Typing-pattern screening",
    line: "How your key-timing sits against a research population — hold time, flight time, rhythm, hand symmetry.",
  },
  {
    n: "02",
    name: "Personal monitoring",
    line: "How your timing moves against your own frozen baseline, session by session and across days.",
  },
];

const STEPS = [
  { n: "1", label: "Sign up", detail: "Email and password only." },
  { n: "2", label: "Consent", detail: "What we record, and what we never record." },
  { n: "3", label: "Context", detail: "Optional background. Skippable." },
  { n: "4", label: "Dashboard", detail: "Your first real measured session." },
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
    <div className="flex flex-col">
      {/* ================= Hero + auth panel ================= */}
      <div className="grid gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-14 lg:gap-y-8">
        {/* ---- Left: what this is ---- */}
        <div className="lg:col-start-1 lg:row-start-1">
          <p className="label">Typing-dynamics screening &amp; monitoring</p>

          <h1 className="mt-4 font-display text-[2.5rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[3.25rem]">
            <span className="sr-only">ParkinTrace — </span>
            We measure how you type. Never what you type.
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            ParkinTrace records the timing between your keystrokes — how long each key is held, and
            how long before the next one. Those intervals are what shift with motor conditions. Your
            typed words are never stored.
          </p>
        </div>

        {/* ---- Right: start here ---- */}
        <aside
          className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 lg:self-start"
          aria-labelledby="start-heading"
        >
          <Card className="border-t-2 border-t-ink">
            <h2 id="start-heading" className="label">
              Start here
            </h2>
            <p className="mt-2 font-display text-lg font-semibold tracking-tight text-ink">
              Create an account, or continue where you left off.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <PrimaryButton onClick={() => router.push("/signup")}>Sign up</PrimaryButton>
              <SecondaryButton onClick={() => router.push("/login")}>Log in</SecondaryButton>
            </div>

            {!isSupabaseConfigured && (
              <p className="mt-3 text-xs text-[#8a5a06]">
                Backend not configured — connect Supabase to enable sign-in.
              </p>
            )}

            <div className="mt-5 border-t border-hair pt-4">
              <p className="label">What happens next</p>
              <ol className="mt-3 flex flex-col gap-2.5">
                {STEPS.map((s) => (
                  <li key={s.n} className="flex gap-3 text-[13px] leading-snug">
                    <span className="mt-px font-mono text-[11px] font-medium text-muted">
                      {s.n}
                    </span>
                    <span>
                      <span className="font-semibold text-ink">{s.label}</span>
                      <span className="text-ink-soft"> — {s.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs leading-relaxed text-muted">
                Nothing is measured until you have given consent.
              </p>
            </div>
          </Card>
        </aside>

        {/* ---- Left, below: the trace ---- */}
        <div className="rounded-lg border border-hair bg-paper px-5 pb-4 pt-5 lg:col-start-1 lg:row-start-2">
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
      </div>

      {/* ================= The two readings ================= */}
      <section aria-labelledby="layers-heading" className="mt-16">
        <h2 id="layers-heading" className="label">
          Two ways to read your data
        </h2>
        <dl className="mt-4 border-t border-hair">
          {LAYERS.map((l) => (
            <div
              key={l.n}
              className="flex flex-col gap-1.5 border-b border-hair py-5 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <dt className="flex items-baseline gap-4 sm:w-64 sm:shrink-0">
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
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Both are research readings, described against a reference — never a diagnosis.
        </p>
      </section>
    </div>
  );
}
