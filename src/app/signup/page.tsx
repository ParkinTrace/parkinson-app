"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Card, Field, PrimaryButton, inputCls } from "@/components/ui";
import { hasLocalConsent } from "@/lib/localCache";
import { claimLocalSessions } from "@/lib/session";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { isSupabaseConfigured } from "@/lib/config";
import { useAppStore } from "@/store/useAppStore";

const schema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Minimum 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

type Form = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const setUserId = useAppStore((s) => s.setUserId);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Form) => {
    setError("");
    setNotice("");
    const supa = supabaseBrowser();
    if (!supa) {
      setError("Backend not configured — connect Supabase to sign up.");
      return;
    }
    const { data, error } = await supa.auth.signUp({ email: v.email, password: v.password });
    if (error) {
      setError(error.message);
      return;
    }
    if (!data.session) {
      setNotice("Account created — check your email to confirm, then log in.");
      return;
    }
    setUserId(data.user?.id ?? null);
    // Anything this browser measured before the account existed — the Layer 1
    // session in particular — belongs to this account now.
    await claimLocalSessions();
    router.replace(hasLocalConsent() ? "/demographics" : "/consent");
  };

  return (
    <div className="mx-auto max-w-md">
      <p className="label">New here</p>
      <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-ink">
        Create an account
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Email and password first. Consent and context come next, and nothing is measured until you have
        agreed to it.
      </p>

      {!isSupabaseConfigured && (
        <p className="mt-3 rounded-md border border-signal/35 bg-signal-wash px-3 py-2 text-xs text-[#8a5a06]">
          Backend not configured — sign-up is disabled.
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
              autoComplete="new-password"
              {...register("password")}
            />
          </Field>
          <Field label="Confirm password" error={formState.errors.confirm?.message}>
            <input
              className={inputCls}
              type="password"
              autoComplete="new-password"
              {...register("confirm")}
            />
          </Field>

          {error && (
            <p className="rounded-md border border-alert/25 bg-alert-wash px-3 py-2 text-xs text-alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-md border border-trace/25 bg-trace-wash px-3 py-2 text-xs text-trace-deep">
              {notice}
            </p>
          )}

          <div className="pt-1">
            <PrimaryButton type="submit">Create account</PrimaryButton>
          </div>
        </form>
      </Card>

      <p className="mt-4 text-sm text-ink-soft">
        Already registered?{" "}
        <a className="font-semibold text-trace underline decoration-trace/30 underline-offset-2" href="/login">
          Log in
        </a>
      </p>
    </div>
  );
}
