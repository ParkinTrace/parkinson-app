/** Paths anyone may visit without a session. Everything else is private. */
export const PUBLIC_PATHS = ["/", "/login", "/signup"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

/** True when a visitor must be signed in to view this path. */
export function isGatedPath(
  pathname: string,
  opts: { supabaseConfigured: boolean; bypassGuard: boolean }
): boolean {
  return opts.supabaseConfigured && !opts.bypassGuard && !isPublicPath(pathname);
}
