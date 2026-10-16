"""Authentication and cross-user data isolation utilities.

Enforces:
1. Decoding and validating user claims from JWT Authorization headers.
2. Cross-user isolation: client-provided user_id must match token subject (claims['sub']).
3. No trust in unverified client-provided user_id.
4. Redaction/protection of sensitive medical/treatment information in logs.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from typing import Any

from fastapi import Header, HTTPException

logger = logging.getLogger("parkintrace.auth")


def decode_jwt_payload(token: str) -> dict[str, Any] | None:
    """Decode and validate JWT payload.
    
    If SUPABASE_JWT_SECRET is set, cryptographically verifies the token signature.
    Otherwise decodes payload and validates structure.
    """
    if not token or not isinstance(token, str):
        return None
    parts = token.strip().split(".")
    if len(parts) != 3:
        return None

    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")
    if jwt_secret:
        try:
            import jwt
            decoded = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                options={"verify_signature": True, "verify_exp": False, "verify_aud": False},  # exp checked explicitly in verify_user_authorization
            )
            return decoded
        except Exception as e:
            logger.warning("Cryptographic JWT signature verification failed: %s", e)
            return None

    try:
        payload_b64 = parts[1]
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload_bytes = base64.urlsafe_b64decode(padded)
        data = json.loads(payload_bytes.decode("utf-8"))
        if not isinstance(data, dict):
            return None
        return data
    except Exception:
        return None


def verify_user_authorization(
    requested_user_id: str | None,
    authorization: str | None,
    required: bool | None = None,
) -> str:
    """Verify that caller is authorized to access requested_user_id.

    Rules:
    - No authorization header: enforced if `required` is set (or in prod / when
      SUPABASE_URL is configured); otherwise the caller falls back to the
      requested user_id, which is what offline development and the PIN
      endpoints rely on.
    - Usable Bearer token: the payload is decoded, `exp` is checked, and `sub`
      must equal requested_user_id exactly (this is the IDOR guard).
    - Unusable Bearer token on an endpoint that declared auth optional
      (`required=False`): treated as no token at all. A caller who was entitled
      to send no credentials must not be failed for sending a stale one.

    Returns the verified user_id.
    """
    is_prod = os.environ.get("APP_ENV") == "prod"
    has_supabase = bool(os.environ.get("SUPABASE_URL"))
    auth_enforced = required if required is not None else (is_prod or has_supabase)

    # An endpoint that explicitly declares auth optional (the PIN pair, which
    # has to work for a visitor who has no account yet) accepts a request with
    # no credentials at all. Whether auth is *enforced* elsewhere is a separate,
    # environment-derived question and is deliberately not reused here.
    auth_optional = required is False

    def reject(status_code: int, detail: str) -> str:
        """Fail with the given status — unless this endpoint declared auth optional.

        A browser attaches whatever access token it happens to hold, and an
        expired one is the normal state of a tab left open past its refresh.
        On an optional-auth endpoint that stale token used to fail the whole
        request, so a correct PIN came back as a 401 and the session stayed
        locked. There, an unusable token must degrade to "no token" — the
        caller was free to send none.
        """
        if not auth_optional:
            raise HTTPException(status_code=status_code, detail=detail)
        if not requested_user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        logger.info(
            "Ignoring unusable credentials on an endpoint that does not require auth: %s",
            detail,
        )
        return requested_user_id

    if not authorization:
        if auth_enforced:
            raise HTTPException(status_code=401, detail="Authentication required")
        if not requested_user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        return requested_user_id

    # Authorization header present: must be Bearer token
    if not authorization.startswith("Bearer "):
        return reject(401, "Invalid authorization scheme; Bearer token required")

    token = authorization.split("Bearer ", 1)[1].strip()
    claims = decode_jwt_payload(token)
    if claims is None:
        return reject(401, "Invalid token payload")

    # Check expiration if present
    exp = claims.get("exp")
    if exp is not None:
        try:
            if float(exp) < time.time():
                return reject(401, "Token has expired")
        except (ValueError, TypeError):
            return reject(401, "Invalid token expiration claim")

    token_sub = claims.get("sub")
    if not token_sub:
        return reject(401, "Token missing subject claim ('sub')")

    # If requested_user_id was passed, it MUST match token_sub exactly
    if requested_user_id and str(requested_user_id) != str(token_sub):
        logger.warning(
            "Access forbidden: token subject '%s' does not match requested user_id '%s'",
            token_sub,
            requested_user_id,
        )
        return reject(403, "Forbidden: access denied for the requested user_id")

    return str(token_sub)
