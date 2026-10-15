"""Unit tests for 4-digit daily session PIN security."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.pin_service import (
    clear_local_pin_store,
    hash_pin,
    is_session_token_valid,
    is_valid_pin_format,
    verify_pin_hash,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_pin_store():
    clear_local_pin_store()
    yield
    clear_local_pin_store()


def test_pin_format_validation():
    """Only exact 4 numeric digits are valid."""
    assert is_valid_pin_format("1234") is True
    assert is_valid_pin_format("0000") is True
    assert is_valid_pin_format("9876") is True

    # Invalid cases
    assert is_valid_pin_format("123") is False       # 3 digits
    assert is_valid_pin_format("12345") is False     # 5 digits
    assert is_valid_pin_format("abcd") is False      # non-numeric
    assert is_valid_pin_format("12a4") is False      # alphanumeric
    assert is_valid_pin_format("") is False          # empty
    assert is_valid_pin_format("    ") is False      # spaces
    assert is_valid_pin_format(None) is False        # None


def test_pin_hash_and_verification():
    """Hash is non-reversible, salted, and verifies correctly."""
    pin = "4826"
    h1 = hash_pin(pin)
    h2 = hash_pin(pin)

    # Different salts produce different hashes for identical PINs
    assert h1 != h2
    assert h1.startswith("pbkdf2_sha256$100000$")

    # Correct pin verifies
    assert verify_pin_hash(pin, h1) is True
    assert verify_pin_hash(pin, h2) is True

    # Wrong pin fails
    assert verify_pin_hash("4827", h1) is False
    assert verify_pin_hash("0000", h1) is False
    assert verify_pin_hash("123", h1) is False


def test_pin_api_status_flow():
    """Status returns pin_set: False initially, then True after setup."""
    user_id = "test-user-pin-001"

    # 1. Initial status -> not set
    res = client.get(f"/api/v1/auth/pin/status?user_id={user_id}")
    assert res.status_code == 200
    assert res.json()["pin_set"] is False

    # 2. Setup PIN
    setup_res = client.post(
        "/api/v1/auth/pin/setup",
        json={"pin": "7139", "confirm_pin": "7139", "user_id": user_id},
    )
    assert setup_res.status_code == 200
    assert setup_res.json()["status"] == "ok"

    # 3. Status is now set
    res_after = client.get(f"/api/v1/auth/pin/status?user_id={user_id}")
    assert res_after.status_code == 200
    assert res_after.json()["pin_set"] is True


def test_pin_api_setup_mismatch_and_format_errors():
    """Setup rejects mismatched confirmation and invalid length."""
    user_id = "test-user-err"

    # Mismatch
    res1 = client.post(
        "/api/v1/auth/pin/setup",
        json={"pin": "1234", "confirm_pin": "5678", "user_id": user_id},
    )
    assert res1.status_code == 400
    assert "do not match" in res1.json()["detail"]

    # Invalid format (non-digit)
    res2 = client.post(
        "/api/v1/auth/pin/setup",
        json={"pin": "abcd", "confirm_pin": "abcd", "user_id": user_id},
    )
    assert res2.status_code == 400
    assert "4 numeric digits" in res2.json()["detail"]


def test_pin_api_verification_and_token():
    """Verify returns token on correct PIN, 401 on wrong PIN."""
    user_id = "test-user-verify"

    # Setup
    client.post(
        "/api/v1/auth/pin/setup",
        json={"pin": "2468", "confirm_pin": "2468", "user_id": user_id},
    )

    # Wrong PIN -> 401
    bad_res = client.post(
        "/api/v1/auth/pin/verify",
        json={"pin": "1357", "user_id": user_id},
    )
    assert bad_res.status_code == 401
    assert "Incorrect" in bad_res.json()["detail"]

    # Correct PIN -> 200 with session unlock token
    good_res = client.post(
        "/api/v1/auth/pin/verify",
        json={"pin": "2468", "user_id": user_id},
    )
    assert good_res.status_code == 200
    body = good_res.json()
    assert body["verified"] is True
    token = body["token"]
    assert token is not None and len(token) > 16

    # Validate token
    val_res = client.get(f"/api/v1/auth/pin/validate-token?token={token}&user_id={user_id}")
    assert val_res.status_code == 200
    assert val_res.json()["valid"] is True
