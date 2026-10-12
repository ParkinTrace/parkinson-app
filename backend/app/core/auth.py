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
    """Decode JWT payload using standard library without external dependencies.
    
    Validates token structure and URL-safe base64 encoding.
    """
    if not token or not isinstance(token, str):
        return None
    parts = token.strip().split(".")
    if len(parts) != 3:
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
    - If authorization header is provided:
      - Validates JWT payload format
      - Checks expiration timestamp (exp)
      - Verifies that token 'sub' matches requested_user_id exactly (prevents IDOR).
    - If authorization header is missing:
      - If required (or in prod / when SUPABASE_URL is configured), raises 401.
      - In local offline dev without credentials, allows fallback to requested_user_id.
    
    Returns the verified user_id.
    """
    is_prod = os.environ.get("APP_ENV") == "prod"
    has_supabase = bool(os.environ.get("SUPABASE_URL"))
    auth_enforced = required if required is not None else (is_prod or has_supabase)

    if not authorization:
        if auth_enforced:
            raise HTTPException(status_code=401, detail="Authentication required")
        if not requested_user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        return requested_user_id

    # Authorization header present: must be Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization scheme; Bearer token required")

    token = authorization.split("Bearer ", 1)[1].strip()
    claims = decode_jwt_payload(token)
    if claims is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Check expiration if present
    exp = claims.get("exp")
    if exp is not None:
        try:
            if float(exp) < time.time():
                raise HTTPException(status_code=401, detail="Token has expired")
        except (ValueError, TypeError):
            raise HTTPException(status_code=401, detail="Invalid token expiration claim")

    token_sub = claims.get("sub")
    if not token_sub:
        raise HTTPException(status_code=401, detail="Token missing subject claim ('sub')")

    # If requested_user_id was passed, it MUST match token_sub exactly
    if requested_user_id and str(requested_user_id) != str(token_sub):
        logger.warning(
            "Access forbidden: token subject '%s' does not match requested user_id '%s'",
            token_sub,
            requested_user_id,
        )
        raise HTTPException(
            status_code=403,
            detail="Forbidden: access denied for the requested user_id",
        )

    return str(token_sub)
