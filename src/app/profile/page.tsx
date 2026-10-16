"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, PageHeader, Readout, SecondaryButton } from "@/components/ui";
import { BackButton } from "@/components/BackButton";
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
      <div>
        <BackButton fallbackHref="/dashboard" />
      </div>
      <PageHeader
        eyebrow="Account"
        title="Profile & Hardware Context"
        description="Your verified identity, anchored physical sensor profile, and device credentials."
      />

      <div className="glass-panel rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-[#c1c8c5]/25 pb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-[#002620]">
            Account &amp; Device Details
          </h2>
          <span className="rounded-full bg-[#002620]/5 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#002620]">
            Active Profile
          </span>
        </div>
        <dl className="mt-3 flex flex-col divide-y divide-[#c1c8c5]/20">
          <Readout label="Signed in as" value={email ?? "Anonymous (Local Mode)"} />
          <Readout
            label="Recording device"
            value={device ? `${device.slice(0, 16)}…` : "—"}
            hint="A baseline is tied to one physical computer/keyboard so keyboard differences don't affect results."
          />
          <Readout label="Sessions recorded" value={rows ? String(rows.length) : "0"} />
          <Readout
            label="Baseline status"
            value={
              progress ? (progress.status === "established" ? "Established" : "Building (In Progress)") : "—"
            }
            hint={
              progress
                ? `${progress.sessions} of ${progress.required} sessions completed · ${progress.distinctDays} of ${progress.requiredDays} calibration days`
                : undefined
            }
          />
        </dl>

        <div className="mt-6 pt-5 border-t border-[#c1c8c5]/25 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[#486455]">
            Review all completed typing sessions and analytical reports:
          </span>
          <Link
            href="/history"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <span>📋</span>
            <span>View Session History →</span>
          </Link>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold tracking-tight text-[#002620] border-b border-[#c1c8c5]/25 pb-4">
          Session Security &amp; Exit
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#486455]">
          Logging out clears your browser session credentials and locks your 4-digit PIN access.
          Your recorded motor sessions remain securely stored on your account until you authenticate again.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <SecondaryButton onClick={() => signOut()} disabled={busy}>
            Log out
          </SecondaryButton>
          <SecondaryButton onClick={() => signOut("/login")} disabled={busy}>
            Sign in with another account
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
