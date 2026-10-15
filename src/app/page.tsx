"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Logo, PrimaryButton } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/config";
import { getOnboardingState } from "@/lib/onboarding";

export default function SplashPage() {
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
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Logo size={72} />
      <h1 className="text-3xl font-bold">ParkinTrace</h1>
      <p className="max-w-md text-slate-600">
        Typing-based motor-pattern screening &amp; longitudinal monitoring. We analyze{" "}
        <strong>how you type, not what you type</strong>.
      </p>
      <Card className="max-w-md text-left">
        <p className="text-sm text-slate-600">
          This is a research aid — not a medical device, and never a diagnosis. The first typing
          session is a real measurement; there is no practice session.
        </p>
      </Card>
      <div className="flex gap-3">
        <PrimaryButton onClick={() => router.push("/login")}>Log in</PrimaryButton>
        <a
          href="/signup"
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Sign up
        </a>
      </div>
      {!isSupabaseConfigured && (
        <p className="text-sm text-amber-700">
          Backend not configured — connect Supabase to enable sign-in.
        </p>
      )}
    </div>
  );
}
