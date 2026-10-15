/**
 * Account-based onboarding status.
 *
 * "First-time user" is a property of the account, not the browser. The
 * Supabase `profiles.onboarding_completed` column is the source of truth;
 * localStorage is only the offline fallback. Nothing here may throw.
 */
import { isSupabaseConfigured } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useAppStore } from "@/store/useAppStore";

export type OnboardingState = "incomplete" | "complete" | "anonymous";

const LOCAL_KEY = "parkintrace-onboarded";

function readLocalFlag(): boolean {
  try {
    return localStorage.getItem(LOCAL_KEY) === "1";
  } catch {
    return false;
  }
}

/** Ask the account whether onboarding finished. "anonymous" means do not gate. */
export async function getOnboardingState(): Promise<OnboardingState> {
  if (!isSupabaseConfigured) return "anonymous";

  const supa = supabaseBrowser();
  if (!supa) return "anonymous";

  let userId: string | null = null;
  try {
    const { data } = await supa.auth.getSession();
    userId = data.session?.user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return "anonymous";

  try {
    const { data, error } = await supa
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .limit(1)
      .maybeSingle();
    if (!error && data) return data.onboarding_completed ? "complete" : "incomplete";
  } catch {
    /* fall through to the offline fallback */
  }

  return readLocalFlag() ? "complete" : "incomplete";
}

/** Persist onboarding completion locally first, then best-effort to the account. */
export async function markOnboardingComplete(): Promise<void> {
  // Writes state + localStorage["parkintrace-onboarded"].
  useAppStore.getState().setOnboardingCompleted(true);

  const supa = supabaseBrowser();
  if (!supa) return;
  try {
    const { data } = await supa.auth.getUser();
    const id = data.user?.id;
    if (!id) return;
    await supa.from("profiles").upsert({ id, onboarding_completed: true });
  } catch {
    /* the local fallback is already written */
  }
}
