"use client";
import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabaseClient";

export type SessionStatus = "loading" | "signed-in" | "signed-out";

/** Current Supabase auth state for the browser. "loading" only until the
 *  first resolve, so consumers never flash private UI to a signed-out user. */
export function useSession(): SessionStatus {
  const [status, setStatus] = useState<SessionStatus>(
    isSupabaseConfigured ? "loading" : "signed-out"
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supa = supabaseBrowser();
    if (!supa) {
      setStatus("signed-out");
      return;
    }

    let active = true;
    supa.auth
      .getSession()
      .then(({ data }) => {
        if (active) setStatus(data.session ? "signed-in" : "signed-out");
      })
      .catch(() => {
        if (active) setStatus("signed-out");
      });

    const { data: sub } = supa.auth.onAuthStateChange((_event, session) => {
      if (active) setStatus(session ? "signed-in" : "signed-out");
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return status;
}
