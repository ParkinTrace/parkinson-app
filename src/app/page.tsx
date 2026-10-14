"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Logo, PrimaryButton } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { isSupabaseConfigured } from "@/lib/config";
import { useAppStore } from "@/store/useAppStore";

export default function SplashPage() {
  const router = useRouter();
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);

  useEffect(() => {
    const go = async () => {
      if (!isSupabaseConfigured) return;
      const { data } = await supabaseBrowser()!.auth.getSession();
      if (!data.session) return;
      router.replace(onboardingCompleted ? "/dashboard" : "/consent");
    };
    go();
  }, [router, onboardingCompleted]);

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
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <a
          href="/layer2"
          className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-100 transition-colors"
        >
          View Layer 2 Longitudinal Dashboard →
        </a>
        <a
          href="/test"
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
        >
          Try Typing Test →
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
