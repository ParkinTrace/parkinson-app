/** Paths anyone may visit without a session. Everything else is private. */
export const PUBLIC_PATHS = ["/", "/login", "/signup"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}
