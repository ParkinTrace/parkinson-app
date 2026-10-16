"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, SecondaryButton } from "@/components/ui";
import { Trace } from "@/components/Trace";
import { isSupabaseConfigured } from "@/lib/config";
import { getOnboardingState, type OnboardingState } from "@/lib/onboarding";
import { lockSession } from "@/lib/pinClient";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useAppStore } from "@/store/useAppStore";

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

  /* The landing page is the front door, so it stays where it is. It used to
     replace itself with /dashboard or /consent the moment a session existed,
     which made the page impossible to read while signed in and gave no clue
     which account was open. The account state now only changes what the
     "Start here" panel offers. */
  const [account, setAccount] = useState<OnboardingState>("anonymous");
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const resetSession = useAppStore((s) => s.resetSession);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) return;
    getOnboardingState()
      .then((state) => {
        if (active) setAccount(state);
      })
      .catch(() => {
        /* the signed-out panel is the safe default */
      });
    // Which account is open, so that "sign in with another account" is a real
    // choice rather than a guess about who is signed in.
    supabaseBrowser()
      ?.auth.getSession()
      .then(({ data }) => {
        if (active) setEmail(data.session?.user?.email ?? null);
      })
      .catch(() => {
        /* no address to show; the panel still works */
      });
    return () => {
      active = false;
    };
  }, []);

  const signedIn = account !== "anonymous";
  const accountLine = email ? `Signed in as ${email}.` : "You are signed in.";

  /* Leaving is as deliberate as arriving: the session cookie goes, the PIN
     unlock goes with it (it is what stops the next person recording as you),
     and the panel drops back to the signed-out state instead of waiting for a
     reload. `then` is the switch-account case. */
  const signOut = async (then?: string) => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabaseBrowser()?.auth.signOut();
    } catch {
      /* the local reset below is what the visitor sees */
    }
    lockSession();
    resetSession();
    setAccount("anonymous");
    setEmail(null);
    setSigningOut(false);
    if (then) router.push(then);
  };

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
              {account === "complete"
                ? `${accountLine} Your baseline is on the dashboard.`
                : signedIn
                  ? `${accountLine} Your setup is not finished.`
                  : "Try Layer 1 now — no account needed. Or sign in and keep a baseline."}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {account === "complete" ? (
                <>
                  <PrimaryButton onClick={() => router.push("/dashboard")}>
                    Go to dashboard
                  </PrimaryButton>
                  <SecondaryButton onClick={() => router.push("/test")}>
                    New typing session
                  </SecondaryButton>
                </>
              ) : signedIn ? (
                <PrimaryButton onClick={() => router.push("/consent")}>
                  Resume setup
                </PrimaryButton>
              ) : (
                <>
                  <PrimaryButton onClick={() => router.push("/consent")}>
                    Give consent and try Layer 1
                  </PrimaryButton>
                  <SecondaryButton onClick={() => router.push("/signup")}>Sign up</SecondaryButton>
                  <SecondaryButton onClick={() => router.push("/login")}>Log in</SecondaryButton>
                </>
              )}
            </div>

            {/* A shared browser is the reason the PIN exists at all, so getting
                out of the account has to be as easy as getting in. */}
            {signedIn && (
              <div className="mt-4 flex flex-col gap-2 border-t border-hair pt-4">
                <SecondaryButton onClick={() => signOut()} disabled={signingOut}>
                  Log out
                </SecondaryButton>
                <button
                  type="button"
                  onClick={() => signOut("/login")}
                  disabled={signingOut}
                  className="self-start text-xs font-semibold tracking-tight text-muted underline-offset-4 transition-colors hover:text-ink hover:underline disabled:opacity-45"
                >
                  Sign in with another account
                </button>
              </div>
            )}

            {!isSupabaseConfigured && (
              <p className="mt-3 text-xs text-[#8a5a06]">
                Backend not configured — connect Supabase to enable sign-in.
              </p>
            )}

            {/* The sign-up walkthrough is for someone who has not signed up.
                A signed-in visitor is past it. */}
            {!signedIn && (
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
            )}
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
