"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hasLocalConsent } from "@/lib/localCache";
import { claimLocalSessions } from "@/lib/session";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { isSupabaseConfigured } from "@/lib/config";
import { useAppStore } from "@/store/useAppStore";
import { BackButton } from "@/components/BackButton";
import { Mascot } from "@/components/Mascot";

const schema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Minimum 8 characters required"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type Form = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const setUserId = useAppStore((s) => s.setUserId);
  const setLayer = useAppStore((s) => s.setLayer);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consentCheck, setConsentCheck] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Form) => {
    setError("");
    setNotice("");
    setLayer("layer2");

    if (typeof window !== "undefined") {
      sessionStorage.setItem("parkintrace_active_email", v.email);
      localStorage.setItem("parkintrace_active_email", v.email);
    }

    const supa = supabaseBrowser();
    if (!supa || !isSupabaseConfigured) {
      setUserId(v.email ? `user-${v.email.split("@")[0]}` : "demo-enrolled-participant");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("parkintrace_freshly_signed_in", "1");
      }
      await claimLocalSessions();
      router.replace(hasLocalConsent() ? "/demographics" : "/consent");
      return;
    }

    const { data, error: signupErr } = await supa.auth.signUp({
      email: v.email,
      password: v.password,
    });

    if (signupErr) {
      setError(signupErr.message);
      return;
    }

    if (!data.session) {
      setNotice("Account created. Please check your email to verify your profile before signing in.");
      return;
    }

    setUserId(data.user?.id ?? null);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("parkintrace_freshly_signed_in", "1");
    }
    await claimLocalSessions();
    router.replace(hasLocalConsent() ? "/demographics" : "/consent");
  };

  return (
    <div className="w-full max-w-lg mx-auto py-4 sm:py-8">
      {/* Back Button */}
      <div className="mb-4">
        <BackButton fallbackHref="/" />
      </div>

      <section className="bg-white border border-[#c1c8c5]/50 rounded-3xl p-6 sm:p-9 shadow-[0_20px_50px_-12px_rgba(0,38,32,0.08)] flex flex-col justify-between">
        <div>
          {/* Mascot & Clinical Portal Brand Header */}
          <div className="flex flex-col items-center justify-center mb-6">
            <Mascot pose="welcome" className="w-20 h-auto mb-2" />
            <div className="flex items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#002620] flex items-center justify-center text-white shadow-xs">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-bold text-base tracking-tight text-[#002620]">
                  ParkinTrace
                </span>
                <span className="text-xs font-medium text-[#0e7c66] uppercase tracking-wider">
                  Clinical Portal
                </span>
              </div>
            </div>
          </div>

          {/* Segmented Tab Pill Navigation */}
          <div className="bg-[#f0f4f1] p-1 rounded-full flex items-center mb-6 border border-[#c1c8c5]/30">
            <Link
              href="/login"
              className="flex-1 py-2 px-4 rounded-full text-xs font-medium text-center transition-all duration-200 text-[#5a6a72] hover:text-[#002620]"
            >
              Sign In
            </Link>
            <button
              type="button"
              className="flex-1 py-2 px-4 rounded-full text-xs font-semibold transition-all duration-200 bg-white text-[#002620] shadow-sm"
            >
              Enroll Cohort
            </button>
          </div>

          <div className="mb-6 pb-3 border-b border-[#d9e5e0]">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#183c35]">
              Cohort Enrollment
            </h1>
            <p className="text-xs text-[#5a6a72] mt-1">
              Create an observational study participant profile for longitudinal motor tracking
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#fff2f0] border border-[#ffccc7] text-xs font-medium text-[#cf1322] flex items-start gap-2 shadow-xs">
              <svg className="w-4 h-4 text-[#cf1322] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#e6f4ea] border border-[#b7eb8f] text-xs font-medium text-[#137333] flex items-start gap-2 shadow-xs">
              <svg className="w-4 h-4 text-[#137333] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{notice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#183c35] mb-1.5" htmlFor="signup-email">
                Participant Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#717976]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="signup-email"
                  type="email"
                  required
                  placeholder="name@example.org"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f7f9f8] border border-[#c1c8c5]/70 text-[#131e1b] placeholder:text-[#889290] focus:bg-white focus:border-[#0e7c66] focus:ring-2 focus:ring-[#0e7c66]/20 text-sm transition-all outline-none"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-[#cf1322] mt-1 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#183c35] mb-1.5" htmlFor="signup-password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#717976]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimum 8 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#f7f9f8] border border-[#c1c8c5]/70 text-[#131e1b] placeholder:text-[#889290] focus:bg-white focus:border-[#0e7c66] focus:ring-2 focus:ring-[#0e7c66]/20 text-sm transition-all outline-none"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#717976] hover:text-[#183c35] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-[#cf1322] mt-1 font-medium">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#183c35] mb-1.5" htmlFor="signup-confirm">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#717976]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="signup-confirm"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Re-type password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f7f9f8] border border-[#c1c8c5]/70 text-[#131e1b] placeholder:text-[#889290] focus:bg-white focus:border-[#0e7c66] focus:ring-2 focus:ring-[#0e7c66]/20 text-sm transition-all outline-none"
                  {...register("confirm")}
                />
              </div>
              {errors.confirm && (
                <p className="text-[11px] text-[#cf1322] mt-1 font-medium">{errors.confirm.message}</p>
              )}
            </div>

            <div className="pt-2">
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentCheck}
                  onChange={(e) => setConsentCheck(e.target.checked)}
                  required
                  className="mt-0.5 w-4 h-4 rounded text-[#0e7c66] border-[#c1c8c5] focus:ring-[#0e7c66]/30 bg-white"
                />
                <span className="text-xs text-[#5a6a72] leading-snug">
                  I consent to anonymous motor kinematic extraction under IRB Protocol #2024-PD-09.
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !consentCheck}
                className="w-full px-6 py-3.5 rounded-xl bg-[#002620] hover:bg-[#183c35] text-white text-sm font-semibold tracking-wide transition-all duration-200 flex items-center justify-center space-x-2 shadow-xs hover:shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? "Creating Profile..." : "Enroll in Observational Study"}</span>
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-[#d9e5e0] text-center">
            <p className="text-xs text-[#5a6a72]">
              Already enrolled?{" "}
              <Link href="/login" className="text-[#0e7c66] font-semibold hover:underline">
                Sign in to existing account
              </Link>
            </p>
          </div>
        </div>

        {/* Clinical Privacy & Protocol Guarantee */}
        <div className="mt-8 pt-4 border-t border-[#d9e5e0]">
          <div className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl bg-[#f0f4f1] border border-[#c1c8c5]/40 mb-2">
            <svg className="w-4 h-4 text-[#0e7c66] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[11px] font-medium text-[#002620]">
              Zero-Knowledge Guarantee: Raw keystrokes are destroyed instantly upon math vectorization.
            </span>
          </div>
          <p className="text-[11px] text-[#717976] leading-tight text-center">
            ParkinTrace is an investigational research instrument and does not autonomously diagnose medical conditions.
          </p>
        </div>
      </section>
    </div>
  );
}
