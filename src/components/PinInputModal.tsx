"use client";

import React, { useEffect, useRef, useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import { verifyPin } from "@/lib/pinClient";

interface PinInputModalProps {
  isOpen: boolean;
  onSuccess: (token: string) => void;
  onRequestSetup?: () => void;
  onCancel?: () => void;
}

/** Gate + remount: the inner component mounts only while open, so its
 *  state starts fresh every time. No reset-in-effect cascade. */
export function PinInputModal(props: PinInputModalProps) {
  if (!props.isOpen) return null;
  return <PinInputModalInner {...props} />;
}

function PinInputModalInner({ onSuccess, onRequestSetup, onCancel }: PinInputModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [masked, setMasked] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    const digit = cleaned[cleaned.length - 1];
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");

    if (index < 3) {
      inputsRef.current[index + 1]?.focus();
    } else {
      const fullPin = next.join("");
      if (fullPin.length === 4) {
        submitPin(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;

    const next = ["", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    setError("");

    if (pasted.length === 4) {
      inputsRef.current[3]?.focus();
      submitPin(pasted);
    } else {
      inputsRef.current[pasted.length]?.focus();
    }
  };

  const submitPin = async (pinValue?: string) => {
    const pin = pinValue || digits.join("");
    if (pin.length !== 4) {
      setError("Please enter all 4 digits.");
      return;
    }

    setLoading(true);
    setError("");
    const res = await verifyPin(pin);
    setLoading(false);

    if (res.ok && res.token) {
      onSuccess(res.token);
    } else {
      setError(res.error || "Incorrect 4-digit PIN. Please try again.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setDigits(["", "", "", ""]);
      inputsRef.current[0]?.focus();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-input-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
    >
      <div
        className={`w-full max-w-sm rounded-3xl border border-white/90 bg-white/90 backdrop-blur-2xl p-7 shadow-2xl ${
          shake ? "animate-shake" : ""
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#0e7c66]"></span>
          <p className="label text-[#002620]">Session PIN · Verification</p>
        </div>
        <h3 id="pin-input-title" className="mt-1 font-display text-xl font-bold tracking-tight text-[#183c35]">
          Session Access PIN
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-[#414846]">
          Enter your 4-digit PIN to unlock this measured session. Nothing is recorded until it is unlocked.
        </p>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-800">
            {error}
          </p>
        )}

        <div className="mt-5">
          <div className="flex justify-center gap-3">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputsRef.current[idx] = el;
                }}
                aria-label={`Digit ${idx + 1} of 4`}
                type={masked ? "password" : "text"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={loading}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                className={`h-14 w-12 rounded-2xl border text-center font-mono text-2xl font-bold transition-all disabled:opacity-50 ${
                  error
                    ? "border-red-300 bg-red-50 text-red-900"
                    : "border-[#c1c8c5]/50 bg-white text-[#002620] focus:border-[#0e7c66] focus:bg-white shadow-xs"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between px-1">
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-[#5a6a72] hover:text-[#002620]">
            <input
              type="checkbox"
              checked={!masked}
              onChange={(e) => setMasked(!e.target.checked)}
              className="h-3.5 w-3.5 accent-[#002620] rounded"
            />
            Show digits
          </label>
          {onRequestSetup && (
            <button
              type="button"
              onClick={onRequestSetup}
              className="text-xs font-semibold text-[#002620] hover:underline"
            >
              Reset / Change PIN
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => submitPin()}
            disabled={loading || digits.join("").length !== 4}
            className="w-full py-3 px-5 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-xs font-semibold shadow-md shadow-[#002620]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? "Verifying…" : "Unlock & Start Session"}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 px-4 rounded-full bg-white/80 hover:bg-white text-[#5a6a72] border border-[#c1c8c5]/40 text-xs font-semibold transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
