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

  // Render a clean loading indicator while auth resolves, preventing private flash
  if (gated && status !== "signed-in") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2.5">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-hair border-t-trace" />
          <span className="font-mono text-xs text-muted">Checking authentication…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
