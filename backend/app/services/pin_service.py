"""PIN security service for daily typing sessions.

Enforces a 4-digit numeric verification PIN before each clinical measurement.
Protects against timing attacks and ensures zero plaintext retention.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
import time
from typing import Any

from app.services.supabase_store import get_service_client

PIN_REGEX = re.compile(r"^\d{4}$")
PBKDF2_ITERATIONS = 100_000

# In-memory store for local offline dev when Supabase is not configured.
# Structure: {user_id: {"hash": str, "updated_at": str}}
_LOCAL_PIN_STORE: dict[str, dict[str, Any]] = {}

# In-memory active verification tokens: {token: {"user_id": str, "expires_at": float}}
_ACTIVE_VERIFICATION_TOKENS: dict[str, dict[str, Any]] = {}
TOKEN_TTL_SECONDS = 86_400  # Valid for 24 hours


def is_valid_pin_format(pin: str) -> bool:
    """Validate that PIN is exactly 4 decimal digits."""
    return bool(pin and isinstance(pin, str) and PIN_REGEX.match(pin.strip()))


def hash_pin(pin: str) -> str:
    """Hash a 4-digit PIN using PBKDF2-HMAC-SHA256 with a random salt."""
    if not is_valid_pin_format(pin):
        raise ValueError("PIN must be exactly 4 numeric digits")
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        pin.strip().encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${key.hex()}"


def verify_pin_hash(pin: str, stored_hash: str) -> bool:
    """Verify a 4-digit PIN against a stored hash with constant-time comparison."""
    if not is_valid_pin_format(pin) or not stored_hash:
        return False

    parts = stored_hash.split("$")
    if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
        return False

    try:
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_key = bytes.fromhex(parts[3])
    except (ValueError, TypeError):
        return False

    computed_key = hashlib.pbkdf2_hmac(
        "sha256",
        pin.strip().encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(computed_key, expected_key)


def get_pin_status(user_id: str) -> bool:
    """Check whether a user has configured a session PIN."""
    client = get_service_client()
    if client is not None:
        try:
            res = (
                client.table("profiles")
                .select("session_pin_set")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            rows = res.data or []
            if rows:
                return bool(rows[0].get("session_pin_set", False))
        except Exception:
            pass

    # Fallback to local store
    return user_id in _LOCAL_PIN_STORE


def set_user_pin(user_id: str, pin: str) -> bool:
    """Save hashed PIN for user in Supabase profiles or local store."""
    if not is_valid_pin_format(pin):
        raise ValueError("PIN must be exactly 4 numeric digits")

    hashed = hash_pin(pin)
    iso_now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    client = get_service_client()
    if client is not None:
        try:
            client.table("profiles").upsert({
                "id": user_id,
                "session_pin_hash": hashed,
                "session_pin_set": True,
                "session_pin_updated_at": iso_now,
            }).execute()
        except Exception:
            pass

    _LOCAL_PIN_STORE[user_id] = {
        "hash": hashed,
        "updated_at": iso_now,
    }
    return True


def verify_user_pin(user_id: str, pin: str) -> tuple[bool, str | None]:
    """Verify submitted PIN. Returns (True, verification_token) on success."""
    if not is_valid_pin_format(pin):
        return False, None

    stored_hash: str | None = None

    client = get_service_client()
    if client is not None:
        try:
            res = (
                client.table("profiles")
                .select("session_pin_hash, session_pin_set")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            rows = res.data or []
            if rows and rows[0].get("session_pin_set"):
                stored_hash = rows[0].get("session_pin_hash")
        except Exception:
            pass

    if not stored_hash and user_id in _LOCAL_PIN_STORE:
        stored_hash = _LOCAL_PIN_STORE[user_id]["hash"]

    if not stored_hash:
        return False, None

    if not verify_pin_hash(pin, stored_hash):
        return False, None

    # Issue session unlock token
    token = secrets.token_urlsafe(32)
    _ACTIVE_VERIFICATION_TOKENS[token] = {
        "user_id": user_id,
        "expires_at": time.time() + TOKEN_TTL_SECONDS,
    }
    return True, token


def is_session_token_valid(token: str, user_id: str) -> bool:
    """Verify that a session authorization token is valid and unexpired."""
    if not token or token not in _ACTIVE_VERIFICATION_TOKENS:
        return False
    data = _ACTIVE_VERIFICATION_TOKENS[token]
    if data["user_id"] != user_id:
        return False
    if time.time() > data["expires_at"]:
        del _ACTIVE_VERIFICATION_TOKENS[token]
        return False
    return True


def clear_local_pin_store() -> None:
    """For testing purposes."""
    _LOCAL_PIN_STORE.clear()
    _ACTIVE_VERIFICATION_TOKENS.clear()
