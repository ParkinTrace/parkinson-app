import type { BrowserContext } from "@playwright/test";

/**
 * A signed-in browser, without needing an account.
 *
 * Every other e2e run is signed out, which leaves the signed-in half of the app
 * untested: the PIN gate on a personal session, and the account panel on the
 * landing page. This writes the session cookie exactly the way the app's own
 * client writes it.
 *
 * The format matters and is easy to get wrong. `@supabase/ssr` 0.12.7 stores
 * the session as `"base64-" + base64url(JSON.stringify(session))`
 * (`dist/main/cookies.js`: `BASE64_PREFIX + stringToBase64URL(value)`). A value
 * without the `base64-` prefix fails to decode, and the app is *silently*
 * signed out — no error, no warning. An earlier attempt at this helper omitted
 * the prefix and was misdiagnosed as "supabase-js rejects fake tokens".
 *
 * `auth.getSession()` reads this cookie locally, so no auth server is involved.
 * The `profiles` lookup that decides onboarding *does* go to the network and
 * 401s against the real project, which is why callers that need a *finished*
 * account must also seed the offline flag with `onboardedInitScript`.
 */
const PROJECT_REF = "zymdvngqgneratsfpzwu";

/**
 * The id the app will actually send to the API for a seeded session.
 *
 * `getCurrentUserId()` (`src/lib/pinClient.ts`) calls `auth.getUser()`, which
 * validates against the Supabase auth server — unreachable with a seeded token
 * — and then falls back to the all-zero demo id. The backend requires the JWT
 * `sub` to equal the `user_id` the client sends and answers 403 otherwise
 * ("Forbidden: access denied for the requested user_id"), so the two have to
 * agree. That means seeding *must* use the app's own fallback id rather than a
 * distinctive one.
 */
export const SEEDED_USER_ID = "00000000-0000-0000-0000-000000000000";
export const SEEDED_EMAIL = "seeded-user@example.test";

/**
 * The `access_token` must be a three-part JWT, not an opaque string.
 *
 * The API reads the payload without verifying the signature
 * (`backend/app/core/auth.py`: `decode_jwt_payload` just base64url-decodes the
 * middle segment), but it does require `sub` — and `sub` must equal the
 * `user_id` the client sends, or every call is a 403. A token that is not a
 * JWT is rejected outright with "Invalid token payload", which is how the PIN
 * setup modal failed while everything else looked signed in.
 */
function seededJwt(userId: string): string {
  const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return [
    b64({ alg: "HS256", typ: "JWT" }),
    b64({
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      iat: now,
      exp: now + 60 * 60 * 24 * 365,
    }),
    "seeded-signature-never-verified",
  ].join(".");
}

export async function seedSignedInSession(
  context: BrowserContext,
  userId: string = SEEDED_USER_ID,
  email: string = SEEDED_EMAIL,
): Promise<void> {
  const session = {
    access_token: seededJwt(userId),
    token_type: "bearer",
    expires_in: 60 * 60 * 24 * 365,
    // Far future: a refresh would need a real server, and an expired session
    // would be cleared back to signed-out.
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    refresh_token: "seeded-refresh-token",
    user: {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email,
      app_metadata: {},
      user_metadata: {},
    },
  };

  await context.addCookies([
    {
      name: `sb-${PROJECT_REF}-auth-token`,
      value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
      domain: "localhost",
      path: "/",
    },
  ]);
}

/** Pass to `page.addInitScript`. The offline onboarding flag, which
 *  `getOnboardingState()` falls back to when the profile lookup fails. */
export function onboardedInitScript() {
  localStorage.setItem("parkintrace-onboarded", "1");
}
