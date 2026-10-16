/** Paths anyone may visit without a session. Everything else is private.
 *
 *  Layer 1 is a population-reference screener and needs no account, so the
 *  consent screen, the Layer 1 view and the typing session are all here. The
 *  account starts at Layer 2, where a personal baseline has to survive across
 *  days and devices. */
export const PUBLIC_PATHS = ["/", "/login", "/signup", "/consent", "/layer1", "/test"];

/** Prefixes anyone may visit: the readout for a session this browser holds.
 *  The page itself still refuses an id it does not have. */
export const PUBLIC_PREFIXES = ["/session/"];

export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

/** True when a visitor must be signed in to view this path. */
export function isGatedPath(
  pathname: string,
  opts: { supabaseConfigured: boolean; bypassGuard: boolean }
): boolean {
  return opts.supabaseConfigured && !opts.bypassGuard && !isPublicPath(pathname);
}
