"use client";

import React, { useEffect, useRef, useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
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

const boxCls =
  "h-13 w-12 rounded-2xl border border-[#c1c8c5]/50 bg-white text-center font-mono text-2xl font-bold text-[#002620] shadow-xs transition-all focus:border-[#0e7c66] focus:bg-white disabled:opacity-40";

function PinSetupModalInner({ onSuccess, onCancel, isChangeMode = false }: PinSetupModalProps) {
  const [currentPin, setCurrentPin] = useState<string[]>(["", "", "", ""]);
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState<string[]>(["", "", "", ""]);
  const [step, setStep] = useState<"current" | "create" | "confirm">(isChangeMode ? "current" : "create");
  const [masked, setMasked] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const currentInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const pinInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const confirmInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (isChangeMode) {
        currentInputsRef.current[0]?.focus();
      } else {
        pinInputsRef.current[0]?.focus();
      }
    }, 50);
    return () => clearTimeout(t);
  }, [isChangeMode]);

  const handleCurrentChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...currentPin];
      next[index] = "";
      setCurrentPin(next);
      return;
    }

    const digit = cleaned[cleaned.length - 1];
    const next = [...currentPin];
    next[index] = digit;
    setCurrentPin(next);
    setError("");

    if (index < 3) {
      currentInputsRef.current[index + 1]?.focus();
    } else {
      setStep("create");
      setTimeout(() => {
        pinInputsRef.current[0]?.focus();
      }, 100);
    }
  };

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
    field: "current" | "create" | "confirm",
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      const targetArray = field === "confirm" ? confirmPin : field === "create" ? pin : currentPin;
      const refArray = field === "confirm" ? confirmInputsRef : field === "create" ? pinInputsRef : currentInputsRef;
      if (!targetArray[index] && index > 0) {
        refArray.current[index - 1]?.focus();
      }
    }
  };

  const handleSave = async () => {
    const curr = currentPin.join("");
    const p = pin.join("");
    const cp = confirmPin.join("");

    if (isChangeMode && curr.length !== 4) {
      setError("Please enter your current 4-digit PIN.");
      setStep("current");
      currentInputsRef.current[0]?.focus();
      return;
    }

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
    const res = await setupPin(p, cp, undefined, isChangeMode ? curr : undefined);
    setLoading(false);

    if (res.ok) {
      onSuccess();
    } else {
      setError(res.error || "Failed to set up PIN. Please try again.");
    }
  };

  const createReady = !isChangeMode || step === "create" || step === "confirm";
  const confirmReady = step === "confirm";
  const canSave =
    (!isChangeMode || currentPin.join("").length === 4) &&
    pin.join("").length === 4 &&
    confirmPin.join("").length === 4 &&
    !loading;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-setup-title"
      onKeyDown={(e) => {
        if (e.key === "Escape" && onCancel && !loading) {
          onCancel();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/90 bg-white/95 backdrop-blur-2xl p-7 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#0e7c66]"></span>
          <p className="label text-[#002620]">{isChangeMode ? "Session PIN · Change" : "Session PIN · Setup"}</p>
        </div>
        <h3 id="pin-setup-title" className="mt-1 font-display text-xl font-bold tracking-tight text-[#183c35]">
          {isChangeMode ? "Change Session PIN" : "Create 4-Digit Session PIN"}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-[#414846]">
          {isChangeMode
            ? "Enter your current PIN, then choose a new 4-digit PIN."
            : "Set a 4-digit PIN. It is required before every measured session, so nobody else can start one on this device."}
        </p>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-800">
            {error}
          </p>
        )}

        {/* Current PIN (if change mode) */}
        {isChangeMode && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">Current PIN</span>
              {step !== "current" && (
                <button
                  type="button"
                  onClick={() => {
                    setStep("current");
                    setTimeout(() => currentInputsRef.current[3]?.focus(), 50);
                  }}
                  className="text-[11px] font-semibold text-trace underline decoration-trace/30 underline-offset-2"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="flex justify-center gap-2.5">
              {currentPin.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    currentInputsRef.current[idx] = el;
                  }}
                  aria-label={`Current PIN digit ${idx + 1} of 4`}
                  type={masked ? "password" : "text"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  disabled={loading}
                  onChange={(e) => handleCurrentChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, "current", e)}
                  className={boxCls}
                />
              ))}
            </div>
          </div>
        )}

        {/* Enter PIN */}
        <div className={`mt-4 transition-opacity ${createReady ? "opacity-100" : "opacity-50"}`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="label">{isChangeMode ? "New PIN" : "Enter PIN"}</span>
            {confirmReady && (
              <button
                type="button"
                onClick={() => {
                  setStep("create");
                  setTimeout(() => pinInputsRef.current[3]?.focus(), 50);
                }}
                className="text-[11px] font-semibold text-trace underline decoration-trace/30 underline-offset-2"
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
                aria-label={`New PIN digit ${idx + 1} of 4`}
                type={masked ? "password" : "text"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={loading || !createReady}
                onChange={(e) => handlePinChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, "create", e)}
                className={boxCls}
              />
            ))}
          </div>
        </div>

        {/* Confirm PIN */}
        <div className={`mt-4 transition-opacity ${confirmReady ? "opacity-100" : "opacity-50"}`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="label">{isChangeMode ? "Confirm New PIN" : "Confirm PIN"}</span>
            <span className="label">{confirmReady ? "ready" : "waiting for new PIN"}</span>
          </div>
          <div className="flex justify-center gap-2.5">
            {confirmPin.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  confirmInputsRef.current[idx] = el;
                }}
                aria-label={`Confirm digit ${idx + 1} of 4`}
                type={masked ? "password" : "text"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={loading || !confirmReady}
                onChange={(e) => handleConfirmChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, "confirm", e)}
                className={boxCls}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center px-1">
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted hover:text-ink">
            <input
              type="checkbox"
              checked={!masked}
              onChange={(e) => setMasked(!e.target.checked)}
              className="h-3.5 w-3.5 accent-trace"
            />
            Show digits
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full py-3 px-5 rounded-full bg-[#002620] hover:bg-[#183c35] text-white text-xs font-semibold shadow-md shadow-[#002620]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? "Saving…" : isChangeMode ? "Update PIN" : "Save PIN & Continue"}
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
