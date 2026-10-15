"use client";

import React, { useEffect, useRef, useState } from "react";
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

function PinInputModalInner({
  onSuccess,
  onRequestSetup,
  onCancel,
}: PinInputModalProps) {
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
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    const digit = cleaned[cleaned.length - 1]; // take last entered digit
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");

    // Auto advance
    if (index < 3) {
      inputsRef.current[index + 1]?.focus();
    } else {
      // Completed 4 digits -> automatically submit
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        className={`w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 transition-transform ${
          shake ? "animate-shake" : ""
        }`}
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600 mb-3">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900">Session Access PIN</h3>
          <p className="mt-1 text-xs text-slate-600">
            Enter your 4-digit security PIN to unlock today&apos;s typing session.
          </p>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 p-2 text-center text-xs font-medium text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        {/* 4 Digit Boxes */}
        <div className="mt-5 flex justify-center gap-3">
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
              className={`h-14 w-12 rounded-xl text-center text-2xl font-bold transition-all border outline-hidden ${
                error
                  ? "border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-400"
                  : "border-slate-300 bg-slate-50 text-slate-900 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              }`}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
          <label className="flex items-center gap-1.5 cursor-pointer select-none hover:text-slate-700">
            <input
              type="checkbox"
              checked={!masked}
              onChange={(e) => setMasked(!e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Show digits
          </label>
          {onRequestSetup && (
            <button
              type="button"
              onClick={onRequestSetup}
              className="text-teal-700 hover:text-teal-900 font-medium hover:underline"
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
            className="w-full justify-center rounded-xl bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {loading ? "Verifying..." : "Unlock & Start Session"}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full justify-center rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-teal-500 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
