"use client";

import React, { useEffect, useRef, useState } from "react";
import { setupPin } from "@/lib/pinClient";

interface PinSetupModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
  isChangeMode?: boolean;
}

/** Gate + remount: the inner component mounts only while open, so its
 *  state starts fresh every time. No reset-in-effect cascade. */
export function PinSetupModal(props: PinSetupModalProps) {
  if (!props.isOpen) return null;
  return <PinSetupModalInner {...props} />;
}

function PinSetupModalInner({
  onSuccess,
  onCancel,
  isChangeMode = false,
}: PinSetupModalProps) {
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState<string[]>(["", "", "", ""]);
  const [currentPin] = useState<string>("");
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const pinInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const confirmInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      pinInputsRef.current[0]?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  const handlePinChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...pin];
      next[index] = "";
      setPin(next);
      return;
    }

    const digit = cleaned[cleaned.length - 1];
    const next = [...pin];
    next[index] = digit;
    setPin(next);
    setError("");

    if (index < 3) {
      pinInputsRef.current[index + 1]?.focus();
    } else {
      // Move to confirm step
      setStep("confirm");
      setTimeout(() => {
        confirmInputsRef.current[0]?.focus();
      }, 100);
    }
  };

  const handleConfirmChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...confirmPin];
      next[index] = "";
      setConfirmPin(next);
      return;
    }

    const digit = cleaned[cleaned.length - 1];
    const next = [...confirmPin];
    next[index] = digit;
    setConfirmPin(next);
    setError("");

    if (index < 3) {
      confirmInputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    isConfirm: boolean,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      const targetArray = isConfirm ? confirmPin : pin;
      const refArray = isConfirm ? confirmInputsRef : pinInputsRef;
      if (!targetArray[index] && index > 0) {
        refArray.current[index - 1]?.focus();
      }
    }
  };

  const handleSave = async () => {
    const p = pin.join("");
    const cp = confirmPin.join("");

    if (p.length !== 4) {
      setError("Please enter all 4 digits for your new PIN.");
      setStep("create");
      pinInputsRef.current[0]?.focus();
      return;
    }

    if (p !== cp) {
      setError("PIN and confirmation do not match. Please try again.");
      setConfirmPin(["", "", "", ""]);
      confirmInputsRef.current[0]?.focus();
      return;
    }

    setLoading(true);
    setError("");
    const res = await setupPin(p, cp, undefined, isChangeMode ? currentPin : undefined);
    setLoading(false);

    if (res.ok) {
      onSuccess();
    } else {
      setError(res.error || "Failed to set up PIN. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {isChangeMode ? "Change Session PIN" : "Create 4-Digit Session PIN"}
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            {isChangeMode
              ? "Update your numeric access PIN for clinical sessions."
              : "Set a 4-digit numeric password required before daily measurements."}
          </p>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 p-2 text-center text-xs font-medium text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        {/* Enter PIN Section */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
            <span>Enter 4-Digit PIN:</span>
            {step === "confirm" && (
              <button
                type="button"
                onClick={() => {
                  setStep("create");
                  setTimeout(() => pinInputsRef.current[3]?.focus(), 50);
                }}
                className="text-teal-600 hover:text-teal-800 text-[11px]"
              >
                Edit
              </button>
            )}
          </div>
          <div className="flex justify-center gap-2.5">
            {pin.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  pinInputsRef.current[idx] = el;
                }}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={loading}
                onChange={(e) => handlePinChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, false, e)}
                className="h-12 w-11 rounded-lg text-center text-xl font-bold border border-slate-300 bg-slate-50 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-hidden"
              />
            ))}
          </div>
        </div>

        {/* Confirm PIN Section */}
        <div className={`mt-4 transition-opacity ${step === "create" ? "opacity-60" : "opacity-100"}`}>
          <div className="text-xs font-medium text-slate-700 mb-1.5">
            <span>Confirm 4-Digit PIN:</span>
          </div>
          <div className="flex justify-center gap-2.5">
            {confirmPin.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  confirmInputsRef.current[idx] = el;
                }}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={loading}
                onChange={(e) => handleConfirmChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, true, e)}
                className="h-12 w-11 rounded-lg text-center text-xl font-bold border border-slate-300 bg-slate-50 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-hidden"
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || pin.join("").length !== 4 || confirmPin.join("").length !== 4}
            className="w-full justify-center rounded-xl bg-teal-600 px-5 py-2.5 font-semibold text-white hover:bg-teal-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Save PIN & Continue"}
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
