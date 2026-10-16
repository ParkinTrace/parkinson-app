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
  "h-14 w-12 rounded-md border border-hair bg-canvas text-center font-mono text-2xl font-semibold text-ink transition-colors focus:border-trace focus:bg-paper disabled:opacity-50";

function PinSetupModalInner({ onSuccess, onCancel, isChangeMode = false }: PinSetupModalProps) {
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
      // Move to the confirm row once the create row is complete.
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

  const handleKeyDown = (index: number, isConfirm: boolean, e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const confirmReady = step === "confirm";
  const canSave = pin.join("").length === 4 && confirmPin.join("").length === 4 && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-hair bg-paper p-6 shadow-xl">
        <p className="label">{isChangeMode ? "Session PIN · change" : "Session PIN · setup"}</p>
        <h3 className="mt-2 font-display text-lg font-semibold tracking-tight text-ink">
          {isChangeMode ? "Change Session PIN" : "Create 4-Digit Session PIN"}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          {isChangeMode
            ? "Replace the 4-digit PIN that unlocks a measured session."
            : "Set a 4-digit PIN. It is required before every measured session, so nobody else can start one on this device."}
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-alert/25 bg-alert-wash px-3 py-2 text-xs text-alert">
            {error}
          </p>
        )}

        {/* Enter PIN */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="label">Enter PIN</span>
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
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={loading}
                onChange={(e) => handlePinChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, false, e)}
                className={boxCls}
              />
            ))}
          </div>
        </div>

        {/* Confirm PIN */}
        <div className={`mt-4 transition-opacity ${confirmReady ? "opacity-100" : "opacity-50"}`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="label">Confirm PIN</span>
            <span className="label">{confirmReady ? "ready" : "waiting for the first row"}</span>
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
                className={boxCls}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <PrimaryButton
            onClick={handleSave}
            disabled={!canSave}
            className="w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save PIN & Continue"}
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
