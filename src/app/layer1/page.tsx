"use client";
import { useEffect, useState } from "react";
import { Card, EmptyState, PageHeader, PrimaryButton, StatusBadge } from "@/components/ui";
import { FeatureComparisonChart } from "@/components/charts";
import { loadSnapshot, lastSessionId } from "@/lib/localCache";
import { supabaseBrowser } from "@/lib/supabaseClient";

/** Layer 1 insight: real extracted metrics, categorical interpretation,
 *  contributors when present. The internal model signal (pdProbability)
 *  is NEVER rendered as a clinical probability. */
export default function Layer1Page() {
  const [state, setState] = useState<{
    features: Record<string, number | null>;
    layer1: Record<string, unknown> | null;
    shap: string;
  } | null>(null);

  useEffect(() => {
    const run = async () => {
      const supa = supabaseBrowser();
      if (supa) {
        const { data: auth } = await supa.auth.getUser();
        if (auth.user) {
          const { data } = await supa
            .from("session_metrics").select("*").eq("user_id", auth.user.id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (data) {
            setState({ features: data.features ?? {}, layer1: data.layer1_result, shap: "stored" });
            return;
          }
        }
      }
      const id = lastSessionId();
      const snap = id ? loadSnapshot(id) : null;
      setState(
        snap
          ? { features: snap.features, layer1: snap.layer1, shap: "snapshot" }
          : { features: {}, layer1: null, shap: "none" },
      );
    };
    run();
  }, []);

  if (!state) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Layer 01" title="Layer 1 — Typing-pattern screening" />
        <p className="text-sm text-muted">Loading your latest measurement…</p>
      </div>
    );
  }

  if (!state.layer1 && Object.keys(state.features).length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Layer 01"
          title="Layer 1 — Typing-pattern screening"
          description="How your key-timing sits against a research population. Read once per session."
        />
        <EmptyState
          title="No measurement to read yet"
          body="Complete one typing session and this view fills with your real timing values and how they compare. The first session is a real measurement — there is no practice run."
        />
        <div>
          <PrimaryButton href="/test">Start a typing session</PrimaryButton>
        </div>
      </div>
    );
  }

  const l1 = (state.layer1 ?? {}) as Record<string, unknown>;
  const contributors = Array.isArray(l1["topContributors"])
    ? (l1["topContributors"] as Record<string, unknown>[])
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Layer 01"
        title="Layer 1 — Typing-pattern screening"
        description="How your key-timing sits against a research population. A research reading, described against reference ranges — never a diagnosis."
        actions={<PrimaryButton href="/test">New typing session</PrimaryButton>}
      />

      <Card>
        <div className="flex items-start gap-3">
          <StatusBadge status={String(l1["status"] ?? "preview")} />
          <p className="text-sm leading-relaxed text-ink-soft">
            {String(
              l1["message"] ??
                "On-device preview — connect the analysis service for the population comparison.",
            )}
          </p>
        </div>
      </Card>

      <FeatureComparisonChart features={state.features} />

      {contributors.length > 0 && (
        <Card>
          <h2 className="label border-b border-hair pb-3">What moved this comparison</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            These are the timing characteristics that most influenced how this session compares with the
            research cohort. They describe movement patterns relative to research norms, not clinical
            signs.
          </p>

          <ul className="mt-3">
            {contributors.slice(0, 3).map((c, i) => {
              const text = String(c["text"] ?? c["feature"]);
              const humanName = c["humanName"] ? String(c["humanName"]) : null;
              const impact = String(c["impact"] ?? "");
              const isAbove = impact === "increased_risk_score";
              return (
                <li key={i} className="flex items-start justify-between gap-4 border-b border-hair py-3 last:border-b-0">
                  <span className="min-w-0">
                    {humanName && (
                      <span className="block text-[13px] font-semibold text-ink">{humanName}</span>
                    )}
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">{text}</span>
                  </span>
                  <span
                    className={`label shrink-0 rounded-sm border px-2 py-0.5 ${
                      isAbove
                        ? "border-signal/35 bg-signal-wash text-[#8a5a06]"
                        : "border-trace/25 bg-trace-wash text-trace-deep"
                    }`}
                  >
                    {isAbove ? "Above reference" : "Within reference"}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 flex items-start gap-2 border-t border-hair pt-4 text-xs leading-relaxed text-muted">
            <span className="mt-[5px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden />
            <span>
              Typing pace and variability also change with fatigue, arthritis, typing style, keyboard
              layout and distraction. Atypical timing here is not a diagnosis of Parkinson&apos;s disease.
            </span>
          </p>
        </Card>
      )}
    </div>
  );
}
