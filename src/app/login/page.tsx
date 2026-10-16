"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Card, Field, PrimaryButton, inputCls } from "@/components/ui";
import { claimLocalSessions } from "@/lib/session";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { isSupabaseConfigured } from "@/lib/config";
import { getOnboardingState } from "@/lib/onboarding";
import { useAppStore } from "@/store/useAppStore";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Minimum 8 characters"),
});

type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setUserId = useAppStore((s) => s.setUserId);
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Form) => {
    setError("");
    const supa = supabaseBrowser();
    if (!supa) {
      setError("Backend not configured — connect Supabase to sign in.");
      return;
    }
    const { data, error } = await supa.auth.signInWithPassword(v);
    if (error) {
      setError(error.message);
      return;
    }
    setUserId(data.user?.id ?? null);
    // Hand this browser's unsigned sessions to the account being entered, so a
    // Layer 1 measured before logging in counts from the first day.
    await claimLocalSessions();
    const state = await getOnboardingState();
    router.replace(state === "complete" ? "/dashboard" : "/consent");
  };

  return (
    <div className="mx-auto max-w-md">
      <p className="label">Returning</p>
      <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
        Log in
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Your sessions and baseline are tied to your account.
      </p>

      {!isSupabaseConfigured && (
        <p className="mt-3 rounded-md border border-signal/35 bg-signal-wash px-3 py-2 text-xs text-[#8a5a06]">
          Backend not configured — sign-in is disabled.
        </p>
      )}

      <Card className="mt-5">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Email" error={formState.errors.email?.message}>
            <input className={inputCls} type="email" autoComplete="email" {...register("email")} />
          </Field>
          <Field label="Password" error={formState.errors.password?.message}>
            <input
              className={inputCls}
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
          </Field>

          {error && (
            <p className="rounded-md border border-alert/25 bg-alert-wash px-3 py-2 text-xs text-alert">
              {error}
            </p>
          )}

          <div className="pt-1">
            <PrimaryButton type="submit">Log in</PrimaryButton>
          </div>
        </form>
      </Card>

      <p className="mt-4 text-sm text-ink-soft">
        No account?{" "}
        <a className="font-semibold text-trace underline decoration-trace/30 underline-offset-2" href="/signup">
          Sign up
        </a>
      </p>
    </div>
  );
}
