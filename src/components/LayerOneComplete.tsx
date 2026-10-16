"use client";
import { Card, PrimaryButton, SecondaryButton } from "@/components/ui";
import { useSession } from "@/lib/useSession";

/**
 * The mark that Layer 1 has actually been done, and the door to Layer 2.
 *
 * It only appears when a real session exists — never to advertise. Layer 2 is
 * where a personal baseline begins, and a baseline has to follow the person
 * across days and devices, which is the one thing this browser cannot do.
 *
 * Uses the real session, deliberately not the e2e guard bypass: with no
 * account there is no account, whatever the test harness is pretending.
 */
export function LayerOneComplete() {
  const status = useSession();
  const signedIn = status === "signed-in";

  return (
    <Card className="border-t-2 border-t-trace">
      <div className="flex items-start gap-3">
        <span className="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full bg-trace" aria-hidden />
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink">
            Layer 1 — complete
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            You have a reading against the research ranges. Layer 2 is the other half: it compares
            you with your own baseline instead of a population, so it can show change over weeks.
          </p>
          {!signedIn && (
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              A baseline has to follow you across days and devices, so Layer 2 needs an account.
              This Layer 1 session is held in this browser until you have one — creating the account
              hands it over, so your first measurement counts from day one.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {signedIn ? (
              <PrimaryButton href="/dashboard">Continue to Layer 2</PrimaryButton>
            ) : (
              <>
                <PrimaryButton href="/signup">Continue to Layer 2 — create an account</PrimaryButton>
                <SecondaryButton href="/login">I already have an account</SecondaryButton>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
