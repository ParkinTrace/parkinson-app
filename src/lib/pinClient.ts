/**
 * Frontend client for 4-digit session access PIN security.
 * Enforces pre-session numeric verification for every daily measurement.
 */

import { API_URL, isApiConfigured } from "./config";
import { supabaseBrowser } from "./supabaseClient";

const PIN_STORAGE_KEY = "parkintrace_session_unlock_token";
const LOCAL_FALLBACK_PIN_KEY = "parkintrace_local_offline_pin";

export function isSessionUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(sessionStorage.getItem(PIN_STORAGE_KEY));
}

export function markSessionUnlocked(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PIN_STORAGE_KEY, token);
}

export function lockSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PIN_STORAGE_KEY);
}

export async function getCurrentUserId(): Promise<string> {
  const supa = supabaseBrowser();
  if (supa) {
    try {
      const { data } = await supa.auth.getUser();
      if (data?.user?.id) return data.user.id;
    } catch {
      // Fallback
    }
  }
  return "00000000-0000-0000-0000-000000000000";
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const supa = supabaseBrowser();
  if (supa) {
    try {
      const { data } = await supa.auth.getSession();
      if (data?.session?.access_token) {
        return { Authorization: `Bearer ${data.session.access_token}` };
      }
    } catch {
      // Fallback
    }
  }
  return {};
}

/** Check if current user has a PIN configured. */
export async function fetchPinStatus(userId?: string): Promise<boolean> {
  const uid = userId || (await getCurrentUserId());

  if (isApiConfigured) {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/api/v1/auth/pin/status?user_id=${encodeURIComponent(uid)}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        return Boolean(data.pin_set);
      }
    } catch {
      // Fallback to offline store
    }
  }

  // Local offline fallback (e.g. demo mode)
  if (typeof window !== "undefined") {
    return Boolean(localStorage.getItem(`${LOCAL_FALLBACK_PIN_KEY}_${uid}`));
  }
  return false;
}

/** Set up or update a 4-digit PIN. */
export async function setupPin(
  pin: string,
  confirmPin: string,
  userId?: string,
  currentPin?: string
): Promise<{ ok: boolean; error?: string }> {
  const uid = userId || (await getCurrentUserId());

  if (!/^\d{4}$/.test(pin)) {
    return { ok: false, error: "PIN must be exactly 4 numeric digits." };
  }
  if (pin !== confirmPin) {
    return { ok: false, error: "PIN and confirmation do not match." };
  }

  if (isApiConfigured) {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(await getAuthHeader()),
      };
      const res = await fetch(`${API_URL}/api/v1/auth/pin/setup`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          pin,
          confirm_pin: confirmPin,
          current_pin: currentPin || null,
          user_id: uid,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: body.detail || "Failed to set PIN." };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error" };
    }
  }

  // Offline dev fallback
  if (typeof window !== "undefined") {
    localStorage.setItem(`${LOCAL_FALLBACK_PIN_KEY}_${uid}`, pin);
    return { ok: true };
  }

  return { ok: true };
}

/** Verify entered PIN before starting daily session. */
export async function verifyPin(
  pin: string,
  userId?: string
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const uid = userId || (await getCurrentUserId());

  if (!/^\d{4}$/.test(pin)) {
    return { ok: false, error: "Please enter all 4 digits." };
  }

  if (isApiConfigured) {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(await getAuthHeader()),
      };
      const res = await fetch(`${API_URL}/api/v1/auth/pin/verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          pin,
          user_id: uid,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: body.detail || "Incorrect PIN." };
      }

      const body = await res.json();
      if (body.verified && body.token) {
        markSessionUnlocked(body.token);
        return { ok: true, token: body.token };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Verification request failed" };
    }
  }

  // Offline dev fallback
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(`${LOCAL_FALLBACK_PIN_KEY}_${uid}`);
    if (saved === pin) {
      const dummyToken = `offline_token_${Math.round(performance.now())}`;
      markSessionUnlocked(dummyToken);
      return { ok: true, token: dummyToken };
    }
    return { ok: false, error: "Incorrect 4-digit PIN. Please try again." };
  }

  return { ok: false, error: "Unable to verify PIN." };
}
