"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, Readout, SecondaryButton } from "@/components/ui";
import { baselineProgress, type BaselineProgress } from "@/lib/baseline";
import { lockSession } from "@/lib/pinClient";
import { fetchHistory, stableDeviceId } from "@/lib/session";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useAppStore } from "@/store/useAppStore";
import type { SessionRow } from "@/lib/types";

/** The account, in one place. A shared browser is the reason the PIN exists,
 *  so this page has to make leaving as clear as signing in was. */
export default function ProfilePage() {
  const router = useRouter();
  const resetSession = useAppStore((s) => s.resetSession);
  const [email, setEmail] = useState<string | null>(null);
  const [device, setDevice] = useState("");
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [progress, setProgress] = useState<BaselineProgress | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const thisDevice = stableDeviceId();
    fetchHistory().then((history) => {
      if (!active) return;
      setDevice(thisDevice);
      setRows(history);
      setProgress(baselineProgress(history, thisDevice));
    });
    supabaseBrowser()
      ?.auth.getSession()
      .then(({ data }) => {
        if (active) setEmail(data.session?.user?.email ?? null);
      })
      .catch(() => {
        /* the page works without a name on it */
      });
    return () => {
      active = false;
    };
  }, []);

  const signOut = async (then?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await supabaseBrowser()?.auth.signOut();
    } catch {
      /* the local reset below is what the visitor sees */
    }
    lockSession();
    resetSession();
    setBusy(false);
    router.push(then ?? "/");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="What this browser records under, and how to leave the account."
      />

      <Card>
        <h2 className="label border-b border-hair pb-3">Account</h2>
        <dl className="mt-1 flex flex-col">
          <Readout label="Signed in as" value={email ?? "—"} />
          <Readout
            label="Recording device"
            value={device || "—"}
            hint="A baseline is anchored to one device, so sessions from another are set aside."
          />
          <Readout label="Sessions recorded" value={rows ? String(rows.length) : "—"} />
          <Readout
            label="Baseline"
            value={
              progress ? (progress.status === "established" ? "established" : "building") : "—"
            }
            hint={
              progress
                ? `${progress.sessions} of ${progress.required} sessions · ${progress.distinctDays} of ${progress.requiredDays} days`
                : undefined
            }
          />
        </dl>
      </Card>

      <Card>
        <h2 className="label border-b border-hair pb-3">Leaving</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Logging out clears the session and the PIN unlock. Your recorded sessions stay with the
          account until you sign back in.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SecondaryButton onClick={() => signOut()} disabled={busy}>
            Log out
          </SecondaryButton>
          <SecondaryButton onClick={() => signOut("/login")} disabled={busy}>
            Sign in with another account
          </SecondaryButton>
        </div>
      </Card>
    </div>
  );
}
