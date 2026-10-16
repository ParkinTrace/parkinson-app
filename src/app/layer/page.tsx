"use client";
import { useRouter } from "next/navigation";
import { Card, OnboardingShell, PrimaryButton, SecondaryButton } from "@/components/ui";
import { markOnboardingComplete } from "@/lib/onboarding";
import { useAppStore, type Layer } from "@/store/useAppStore";

const OPTIONS: {
  n: string;
  layer: Layer;
  name: string;
  line: string;
  detail: string;
  cta: string;
}[] = [
  {
    n: "01",
    layer: "layer1",
    name: "Layer 1 — Typing-pattern screening",
    line: "How your key-timing compares with a research population.",
    detail:
      "Hold time, flight time, rhythm steadiness and hand symmetry, read against reference ranges from the research cohort. This is the view to start with if you want to know where you sit.",
    cta: "Start with Layer 1",
  },
  {
    n: "02",
    layer: "layer2",
    name: "Layer 2 — Personal monitoring",
    line: "How your timing changes against your own baseline.",
    detail:
      "No population comparison. The app freezes a baseline from your first sessions, then shows each later session against it. This is the view for tracking change over weeks and months.",
    cta: "Start with Layer 2",
  },
];

export default function LayerSelectionPage() {
  const router = useRouter();
  const setLayer = useAppStore((s) => s.setLayer);

  const choose = async (layer: Layer) => {
    setLayer(layer);
    await markOnboardingComplete();
    router.replace("/dashboard");
  };

  return (
    <OnboardingShell
      step={3}
      steps={["Consent", "Context", "Choose"]}
      title="Choose your starting view"
      description="Both views read the same sessions — you can switch at any time from the top bar. Your first typing session is a real measurement: there is no practice session."
    >
      <div className="flex flex-col gap-3">
        {OPTIONS.map((o) => (
          <Card key={o.n}>
            <div className="flex items-baseline gap-4">
              <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-trace">{o.n}</span>
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold tracking-tight text-ink">{o.name}</h2>
                <p className="mt-1 text-sm font-medium text-ink">{o.line}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{o.detail}</p>
                <div className="mt-4">
                  <PrimaryButton onClick={() => choose(o.layer)}>{o.cta}</PrimaryButton>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </OnboardingShell>
  );
}
