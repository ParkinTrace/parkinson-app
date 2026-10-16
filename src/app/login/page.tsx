"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { claimLocalSessions } from "@/lib/session";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { isSupabaseConfigured } from "@/lib/config";
import { useAppStore } from "@/store/useAppStore";
import { BackButton } from "@/components/BackButton";
import { Mascot } from "@/components/Mascot";

export default function LoginPage() {
  const router = useRouter();
  const setUserId = useAppStore((s) => s.setUserId);
  const setLayer = useAppStore((s) => s.setLayer);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberKeyboard, setRememberKeyboard] = useState(true);
  const [isPinMode, setIsPinMode] = useState(false);
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSessionEmail, setCurrentSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser()
      ?.auth.getSession()
      .then(({ data }) => {
        if (data.session?.user?.email) {
          setCurrentSessionEmail(data.session.user.email);
        }
      })
      .catch(() => {});
  }, []);

  const hasConsented =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("consented") === "1";

  const handleSignOutActive = async () => {
    try {
      await supabaseBrowser()?.auth.signOut();
    } catch {}
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("parkintrace_freshly_signed_in");
      sessionStorage.removeItem("parkintrace_active_email");
      localStorage.removeItem("parkintrace_active_email");
    }
    setCurrentSessionEmail(null);
    setUserId(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Activating Layer 2 client-based baseline upon user login
      setLayer("layer2");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("parkintrace_active_email", email);
        localStorage.setItem("parkintrace_active_email", email);
      }

      const supa = supabaseBrowser();
      if (!supa || !isSupabaseConfigured) {
        // Fallback for offline/demo environment
        setUserId(email ? `user-${email.split("@")[0]}` : "demo-participant-id");
        if (typeof window !== "undefined") {
          sessionStorage.setItem("parkintrace_freshly_signed_in", "1");
        }
        await claimLocalSessions();
        router.replace("/dashboard");
        return;
      }

      const { data, error: authErr } = await supa.auth.signInWithPassword({
        email,
        password,
      });

      if (authErr) {
        setError(authErr.message);
        setIsSubmitting(false);
        return;
      }

      setUserId(data.user?.id ?? null);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("parkintrace_freshly_signed_in", "1");
      }
      // Hand this browser's unsigned sessions to the account being entered
      await claimLocalSessions();
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setIsSubmitting(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pinDigits.join("");
    if (pin.length < 4) {
      setError("Please enter all 4 digits of your workstation PIN");
      return;
    }
    setLayer("layer2");
    if (typeof window !== "undefined") {
      sessionStorage.setItem("parkintrace_freshly_signed_in", "1");
    }
    await claimLocalSessions();
    router.replace("/dashboard");
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
            <button
              type="button"
              className="flex-1 py-2 px-4 rounded-full text-xs font-semibold transition-all duration-200 bg-white text-[#002620] shadow-sm"
            >
              Sign In
            </button>
            <Link
              href="/signup"
              className="flex-1 py-2 px-4 rounded-full text-xs font-medium text-center transition-all duration-200 text-[#5a6a72] hover:text-[#002620]"
            >
              Enroll Cohort
            </Link>
          </div>

          {/* Context Notice Pills */}
          {currentSessionEmail ? (
            <div className="mb-5 rounded-2xl border border-[#c1c8c5]/40 bg-[#f7f9f8] p-3 text-xs leading-relaxed text-[#002620] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0e7c66] shrink-0"></span>
                <span>Active: <strong>{currentSessionEmail}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleSignOutActive}
                className="text-xs font-semibold text-[#ba1a1a] hover:underline cursor-pointer ml-2"
              >
                Switch account
              </button>
            </div>
          ) : hasConsented ? (
            <div className="mb-5 rounded-2xl border border-[#0e7c66]/25 bg-[#caead7]/50 p-3 text-xs leading-relaxed text-[#002620] font-medium flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#0e7c66] shrink-0"></span>
              <span>Informed Consent Verified • Ready for Account Linking</span>
            </div>
          ) : null}

          {/* Header & Quick PIN toggle */}
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#d9e5e0]">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#183c35]">
                {isPinMode ? "Quick PIN Check-In" : "Participant Sign In"}
              </h1>
              <p className="text-xs text-[#5a6a72] mt-0.5">
                {isPinMode
                  ? "Enter your 4-digit workstation code"
                  : "Access your daily keystroke telemetry & baseline"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPinMode(!isPinMode)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#002620]/20 hover:border-[#002620]/40 text-xs font-semibold text-[#002620] bg-white transition-all shadow-xs"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
              </svg>
              <span>{isPinMode ? "Email Sign In" : "4-Digit PIN"}</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#ffdad6]/60 border border-[#ba1a1a]/30 text-xs text-[#93000a] flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!isPinMode ? (
            /* Standard Email/Password Form */
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-xs font-semibold text-[#131e1b] mb-1.5" htmlFor="login-email">
                  Registered Study Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5a6a72]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="participant@institution.org"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#c1c8c5]/60 text-[#131e1b] placeholder:text-[#5a6a72]/60 focus:border-[#002620] focus:ring-2 focus:ring-[#002620]/10 transition-all text-sm font-sans shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#131e1b]" htmlFor="login-password">
                    Password
                  </label>
                  <a href="#forgot" className="text-xs text-[#0e7c66] hover:underline font-semibold">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5a6a72]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-[#c1c8c5]/60 text-[#131e1b] placeholder:text-[#5a6a72]/60 focus:border-[#002620] focus:ring-2 focus:ring-[#002620]/10 transition-all text-sm font-sans shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#5a6a72] hover:text-[#131e1b]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberKeyboard}
                    onChange={(e) => setRememberKeyboard(e.target.checked)}
                    className="w-4 h-4 rounded text-[#002620] border-[#c1c8c5] focus:ring-[#002620]/20 bg-white"
                  />
                  <span className="text-xs text-[#131e1b] select-none font-medium">
                    Remember my keyboard anchor
                  </span>
                </label>
                <div className="group relative inline-block">
                  <span className="w-4 h-4 rounded-full border border-[#5a6a72]/40 text-[#5a6a72] hover:text-[#002620] flex items-center justify-center text-[10px] font-bold cursor-pointer">
                    i
                  </span>
                  <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-56 p-2.5 bg-[#183c35] text-white text-[11px] rounded-xl shadow-lg z-30 font-sans leading-relaxed">
                    Maintains the calibrated latency baselines for this physical laptop or keyboard.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3.5 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-sm font-semibold tracking-wide transition-all duration-200 flex items-center justify-center space-x-2 shadow-md shadow-[#002620]/15 active:scale-[0.99] disabled:opacity-50"
                >
                  <span>{isSubmitting ? "Signing In..." : "Sign In to ParkinTrace"}</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </form>
          ) : (
            /* 4-Digit PIN Quick Login Form */
            <form className="space-y-5" onSubmit={handlePinSubmit}>
              <div className="text-center py-2">
                <p className="text-xs text-[#5a6a72] mb-4">
                  Enter your 4-digit quick check-in code for this registered workstation
                </p>
                <div className="flex justify-center space-x-3">
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      id={`login-pin-${idx}`}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={pinDigits[idx]}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        const next = [...pinDigits];
                        next[idx] = val;
                        setPinDigits(next);
                        if (val && idx < 3) {
                          const nextEl = document.getElementById(`login-pin-${idx + 1}`);
                          nextEl?.focus();
                        }
                      }}
                      className="w-12 h-14 text-center font-mono text-2xl font-bold bg-[#f7f9f8] border border-[#c1c8c5]/60 rounded-2xl focus:border-[#002620] focus:ring-2 focus:ring-[#002620]/10 shadow-2xs"
                    />
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full px-6 py-3.5 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-sm font-semibold tracking-wide transition-all duration-200 flex items-center justify-center space-x-2 shadow-md shadow-[#002620]/15"
                >
                  <span>Unlock &amp; Start Daily Session</span>
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-[#d9e5e0] text-center">
            <p className="text-xs text-[#5a6a72]">
              New participant?{" "}
              <Link href="/signup" className="text-[#002620] font-semibold hover:underline">
                Enroll in observational cohort
              </Link>
            </p>
          </div>
        </div>

        {/* Zero-Knowledge Guarantee Badge */}
        <div className="mt-6 pt-4 border-t border-[#d9e5e0]">
          <div className="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-2xl bg-[#caead7]/40 border border-[#0e7c66]/20 mb-2">
            <svg className="w-4 h-4 text-[#0e7c66] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[11px] font-medium text-[#002620] leading-tight">
              Zero-Knowledge Guarantee: Raw keystrokes are destroyed instantly upon timing extraction.
            </span>
          </div>
          <p className="text-[10px] text-[#5a6a72] leading-tight text-center">
            ParkinTrace is an investigational research instrument and does not autonomously diagnose medical conditions.
          </p>
        </div>
      </section>
    </div>
  );
}
