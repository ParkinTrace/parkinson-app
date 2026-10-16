"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, OnboardingShell, PrimaryButton } from "@/components/ui";
import { BackButton } from "@/components/BackButton";
import { Mascot } from "@/components/Mascot";
import { hasLocalConsent } from "@/lib/localCache";
import { supabaseBrowser } from "@/lib/supabaseClient";

const FACTS = [
  {
    head: "What we record",
    body: "Key timing only — how long each key is held (hold time) and how long before the next one (flight time).",
  },
  {
    head: "What we never record",
    body: "The characters you type. Typed content is not stored, not transmitted, and not analysed.",
  },
  {
    head: "What is stored",
    body: "Derived numbers only: the timing features, a quality score, and the analysis result.",
  },
  {
    head: "What this is",
    body: "A research screening and monitoring aid. Not a medical device, and its output is not a diagnosis.",
  },
];

export default function ConsentPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [research, setResearch] = useState(false);

  // Already accepted in this browser (for example on the way back from a
  // Layer 1 session) — leave the box ticked rather than asking twice.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasLocalConsent()) setAgreed(true);
  }, []);

  const next = async () => {
    const supa = supabaseBrowser();
    let signedIn = false;
    if (supa) {
      try {
        const { data } = await supa.auth.getUser();
        if (data?.user) {
          signedIn = true;
          await supa.from("profiles").upsert({ id: data.user.id, parkinson_context: { research_consent: research } });
        }
      } catch {
        /* proceed offline/locally */
      }
    }
    try {
      localStorage.setItem("parkintrace-consent", JSON.stringify({ agreed, research, at: new Date().toISOString() }));
    } catch {
      /* private mode */
    }
    // Explicit requirement: When consent is accepted, always redirect to login form so user can log in with their desired account.
    router.push("/login?consented=1");
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-8">
      {/* Back Button */}
      <div className="mb-4">
        <BackButton fallbackHref="/" />
      </div>
      {/* Stepper Pathway */}
      <div className="mb-10 px-2 max-w-xl mx-auto">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-[#d9e5e0] -z-0"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 h-0.5 bg-[#002620] -z-0"></div>
          
          {/* Step 1 Active */}
          <div className="flex flex-col items-center gap-1.5 z-10 bg-[#F7F5EF] px-3 py-1 rounded-full border border-[#002620]">
            <div className="w-6 h-6 rounded-full bg-[#002620] text-white flex items-center justify-center text-xs font-bold">1</div>
            <span className="text-xs text-[#002620] font-semibold hidden sm:block">Consent &amp; Privacy</span>
          </div>
          
          {/* Step 2 Inactive */}
          <div className="flex flex-col items-center gap-1.5 z-10 bg-[#F7F5EF] px-3 py-1 rounded-full border border-[#c1c8c5]/50">
            <div className="w-6 h-6 rounded-full bg-white text-[#5a6a72] flex items-center justify-center text-xs font-medium border border-[#c1c8c5]/30">2</div>
            <span className="text-xs text-[#5a6a72] hidden sm:block">Context (Optional)</span>
          </div>

          {/* Step 3 Inactive */}
          <div className="flex flex-col items-center gap-1.5 z-10 bg-[#F7F5EF] px-3 py-1 rounded-full border border-[#c1c8c5]/50">
            <div className="w-6 h-6 rounded-full bg-white text-[#5a6a72] flex items-center justify-center text-xs font-medium border border-[#c1c8c5]/30">3</div>
            <span className="text-xs text-[#5a6a72] hidden sm:block">First Session</span>
          </div>
        </div>
      </div>

      {/* Central Glass Panel */}
      <section className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/90 shadow-[0_20px_48px_-12px_rgba(16,43,39,0.08)]">
        {/* Panel Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#d9e5e0]">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#caead7]/60 text-[#002620] border border-[#0e7c66]/20 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0e7c66]"></span>
                Privacy &amp; Data Security
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#183c35]">
              Informed Consent &amp; Privacy Agreement
            </h1>
            <p className="text-sm text-[#414846] mt-1.5 max-w-2xl leading-relaxed">
              Before you begin, please review how ParkinTrace handles your typing data. We prioritize your privacy and will never capture, log, or store what you type.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Mascot pose="clipboard" className="w-20 h-auto hidden sm:block" />
            <div className="bg-white/80 p-3.5 rounded-2xl border border-[#c1c8c5]/30 flex items-center gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#caead7]/50 text-[#002620] flex items-center justify-center font-bold text-lg">
                🔒
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#5a6a72]">Data Guarantee</div>
                <div className="text-xs font-bold text-[#002620]">Zero Keystroke Text Stored</div>
              </div>
            </div>
          </div>
        </div>

        {/* Structured Privacy Points */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {FACTS.map((f, i) => (
            <article
              key={f.head}
              className="glass-card-subtle rounded-2xl p-5 border border-white/80 shadow-[0_4px_16px_-2px_rgba(19,42,38,0.02)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-[#0e7c66]">
                  <span>{i === 0 ? "⚡" : i === 1 ? "🛡️" : i === 2 ? "📊" : "🔬"}</span>
                  <span>{f.head}</span>
                </div>
                <p className="text-sm leading-relaxed text-[#414846]">{f.body}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Checkbox Agreements */}
        <div className="mt-8 space-y-3">
          <label className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-xs cursor-pointer hover:bg-white transition-colors">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#002620] rounded"
            />
            <span className="text-sm font-medium text-[#131e1b] leading-relaxed">
              I understand how my timing data is measured and agree to participate in the typing assessment.
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-xs cursor-pointer hover:bg-white transition-colors">
            <input
              type="checkbox"
              checked={research}
              onChange={(e) => setResearch(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#002620] rounded"
            />
            <span className="text-sm font-medium text-[#131e1b] leading-relaxed">
              Optional — allow my anonymous timing metrics to contribute to Parkinson&apos;s motor research.
              <span className="mt-1 block text-xs text-[#5a6a72]">Off by default. You can change this anytime in your profile settings.</span>
            </span>
          </label>
        </div>

        {/* Action Button */}
        <div className="mt-8 pt-6 border-t border-[#d9e5e0] flex items-center justify-between">
          <span className="text-xs text-[#5a6a72]">
            Step 1 of 3: Consent &amp; Privacy
          </span>
          <button
            type="button"
            onClick={next}
            disabled={!agreed}
            className="py-3 px-8 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-sm font-semibold shadow-md shadow-[#002620]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Continue
          </button>
        </div>
      </section>
    </div>
  );
}
