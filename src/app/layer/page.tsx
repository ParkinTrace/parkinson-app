"use client";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, SecondaryButton } from "@/components/ui";
import { markOnboardingComplete } from "@/lib/onboarding";
import { useAppStore, type Layer } from "@/store/useAppStore";

export default function LayerSelectionPage() {
  const router = useRouter();
  const setLayer = useAppStore((s) => s.setLayer);

  const choose = async (layer: Layer) => {
    setLayer(layer);
    await markOnboardingComplete();
    router.replace("/dashboard");
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Choose your starting view</h1>
      <p className="mt-1 text-sm text-slate-600">
        You can switch layers anytime. Your first typing session is a real measurement.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <Card>
          <h2 className="font-semibold">Layer 1 — Typing-pattern screening</h2>
          <p className="mt-1 text-sm text-slate-600">
            Compares your typing characteristics against the research population.
          </p>
          <div className="mt-3">
            <PrimaryButton onClick={() => choose("layer1")}>Start with Layer 1</PrimaryButton>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Layer 2 — Personal monitoring</h2>
          <p className="mt-1 text-sm text-slate-600">
            Tracks change against your own baseline across sessions and days.
          </p>
          <div className="mt-3">
            <SecondaryButton onClick={() => choose("layer2")}>Start with Layer 2</SecondaryButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
