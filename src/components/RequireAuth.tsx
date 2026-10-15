"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { E2E_BYPASS_GUARD, isSupabaseConfigured } from "@/lib/config";
import { isGatedPath } from "@/lib/routes";
import { useSession } from "@/lib/useSession";

/** Sends signed-out visitors to "/" for every private path. In demo mode
 *  (Supabase unconfigured) nothing is gated. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useSession();

  const gated = isGatedPath(pathname, {
    supabaseConfigured: isSupabaseConfigured,
    bypassGuard: E2E_BYPASS_GUARD,
  });

  useEffect(() => {
    if (gated && status === "signed-out") router.replace("/");
  }, [gated, status, router]);

  // Render nothing while an unknown session state would otherwise flash
  // private content before the redirect lands.
  if (gated && status !== "signed-in") return null;

  return <>{children}</>;
}
