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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-sm rounded-lg border border-hair bg-paper p-6 shadow-xl ${
          shake ? "animate-shake" : ""
        }`}
      >
        <p className="label">Session PIN · verify</p>
        <h3 className="mt-2 font-display text-lg font-semibold tracking-tight text-ink">
          Session Access PIN
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Enter your 4-digit PIN to unlock this measured session. Nothing is recorded until it is unlocked.
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-alert/25 bg-alert-wash px-3 py-2 text-xs text-alert">
            {error}
          </p>
        )}

        <div className="mt-5">
          <span className="label">4-digit PIN</span>
          <div className="mt-2 flex justify-center gap-3">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputsRef.current[idx] = el;
                }}
                type={masked ? "password" : "text"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={loading}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                className={`h-14 w-12 rounded-md border text-center font-mono text-2xl font-semibold transition-colors disabled:opacity-50 ${
                  error
                    ? "border-alert/50 bg-alert-wash text-alert"
                    : "border-hair bg-canvas text-ink focus:border-trace focus:bg-paper"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between px-1">
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted hover:text-ink">
            <input
              type="checkbox"
              checked={!masked}
              onChange={(e) => setMasked(!e.target.checked)}
              className="h-3.5 w-3.5 accent-[#0e7c66]"
            />
            Show digits
          </label>
          {onRequestSetup && (
            <button
              type="button"
              onClick={onRequestSetup}
              className="text-xs font-semibold text-trace underline decoration-trace/30 underline-offset-2"
            >
              Reset / Change PIN
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <PrimaryButton
            onClick={() => submitPin()}
            disabled={loading || digits.join("").length !== 4}
            className="w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Unlock & Start Session"}
          </PrimaryButton>

          {onCancel && (
            <SecondaryButton
              onClick={onCancel}
              className="w-full py-2 text-xs transition-colors disabled:opacity-50"
            >
              Cancel
            </SecondaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
