"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, OnboardingShell, PrimaryButton } from "@/components/ui";
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

  const next = async () => {
    const supa = supabaseBrowser();
    if (supa) {
      try {
        const { data } = await supa.auth.getUser();
        if (data?.user) {
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
    router.push("/demographics");
  };

  return (
    <OnboardingShell
      step={1}
      steps={["Consent", "Context", "Choose"]}
      title="What you are agreeing to"
      description="Read this once. Nothing is measured until you accept it."
    >
      <Card>
        <dl className="flex flex-col">
          {FACTS.map((f) => (
            <div key={f.head} className="border-b border-hair py-3 first:pt-0 last:border-b-0 last:pb-0">
              <dt className="label">{f.head}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-soft">{f.body}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex items-start gap-3 rounded-lg border border-hair bg-paper p-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e7c66]"
          />
          <span className="text-sm leading-snug text-ink">
            I understand the above and agree to take part.
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-hair bg-paper p-4">
          <input
            type="checkbox"
            checked={research}
            onChange={(e) => setResearch(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e7c66]"
          />
          <span className="text-sm leading-snug text-ink">
            Optional — keep my anonymised timing archives for approved research.
            <span className="mt-0.5 block text-xs text-muted">Off by default. You can change this later.</span>
          </span>
        </label>
      </div>

      <div className="mt-5">
        <PrimaryButton onClick={next} disabled={!agreed}>
          Continue
        </PrimaryButton>
      </div>
    </OnboardingShell>
  );
}
