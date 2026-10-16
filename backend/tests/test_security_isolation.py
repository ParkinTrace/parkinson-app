"""Tests for authentication, authorization, and cross-user data isolation."""

import base64
import json
import time
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _make_jwt(sub: str, exp: float | None = None, role: str = "authenticated") -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": sub,
        "role": role,
        "aud": "authenticated",
        "exp": exp if exp is not None else (time.time() + 3600),
    }
    h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig_b64 = "dummy_signature_for_test"
    return f"{h_b64}.{p_b64}.{sig_b64}"


def test_cross_user_treatment_isolation_forbidden():
    user_a = str(uuid4())
    user_b = str(uuid4())
    token_a = _make_jwt(sub=user_a)

    # User A tries to record treatment event for User B -> 403 Forbidden
    resp = client.post(
        f"/api/v1/treatment-events?user_id={user_b}",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "event_date": "2026-10-12T10:00:00Z",
            "event_type": "medication_change",
            "description": "Adjusted levodopa dose",
        },
    )
    assert resp.status_code == 403
    assert "Forbidden" in resp.json()["detail"]


def test_cross_user_treatment_list_forbidden():
    user_a = str(uuid4())
    user_b = str(uuid4())
    token_a = _make_jwt(sub=user_a)

    # User A tries to list User B's treatment events -> 403 Forbidden
    resp = client.get(
        f"/api/v1/treatment-events?user_id={user_b}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp.status_code == 403
    assert "Forbidden" in resp.json()["detail"]


def test_cross_user_session_creation_forbidden():
    user_a = str(uuid4())
    user_b = str(uuid4())
    token_a = _make_jwt(sub=user_a)

    # User A tries to create session under User B -> 403 Forbidden
    resp = client.post(
        "/api/v1/sessions",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "sessionId": str(uuid4()),
            "userId": user_b,
            "sessionType": "structured",
            "deviceId": "kbd-1",
            "startedAt": "2026-10-12T10:00:00Z",
            "endedAt": "2026-10-12T10:02:00Z",
            "durationMs": 120000,
            "keystrokeCount": 100,
            "qualityFlags": [],
            "features": {
                "ht_mean": 100, "ht_std": 10, "ft_mean": 200, "ft_std": 20,
                "ikl_mean": 300, "ikl_std": 30, "left_ht_mean": 100, "right_ht_mean": 100,
                "hand_asymmetry": 0.0, "pause_frequency": 1.0, "typing_speed": 2.5,
                "session_consistency": 0.1,
            },
        },
    )
    assert resp.status_code == 403
    assert "Forbidden" in resp.json()["detail"]


def test_expired_token_rejected():
    user_a = str(uuid4())
    expired_token = _make_jwt(sub=user_a, exp=time.time() - 60)

    resp = client.get(
        f"/api/v1/treatment-events?user_id={user_a}",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp.status_code == 401
    assert "expired" in resp.json()["detail"].lower()


def test_malformed_token_rejected():
    user_a = str(uuid4())

    resp = client.get(
        f"/api/v1/treatment-events?user_id={user_a}",
        headers={"Authorization": "Bearer not-a-valid-jwt"},
    )
    assert resp.status_code == 401
    assert "Invalid token" in resp.json()["detail"]


def test_authorized_user_access_succeeds():
    user_a = str(uuid4())
    token_a = _make_jwt(sub=user_a)

    # User A records event for User A with matching token -> 200 OK
    resp = client.post(
        f"/api/v1/treatment-events?user_id={user_a}",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "event_date": "2026-10-12T10:00:00Z",
            "event_type": "dosage_adjustment",
            "description": "Morning dose adjusted",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert (data.get("userId") or data.get("user_id")) == user_a

    # User A retrieves own events -> 200 OK
    get_resp = client.get(
        f"/api/v1/treatment-events?user_id={user_a}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert get_resp.status_code == 200
    assert len(get_resp.json()) >= 1


def test_cryptographic_signature_enforcement(monkeypatch):
    import jwt
    secret = "test-secret-key-for-supabase-validation-12345"
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)

    user_a = str(uuid4())
    # 1. Valid signed token succeeds
    valid_payload = {"sub": user_a, "aud": "authenticated", "exp": time.time() + 3600}
    valid_token = jwt.encode(valid_payload, secret, algorithm="HS256")

    resp = client.get(
        f"/api/v1/treatment-events?user_id={user_a}",
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert resp.status_code == 200

    # 2. Forged signature fails with 401
    forged_token = valid_token[:-4] + "abcd"
    fail_resp = client.get(
        f"/api/v1/treatment-events?user_id={user_a}",
        headers={"Authorization": f"Bearer {forged_token}"},
    )
    assert fail_resp.status_code == 401


def test_cross_user_analysis_forbidden():
    user_a = str(uuid4())
    user_b = str(uuid4())
    token_a = _make_jwt(sub=user_a)

    resp = client.post(
        "/api/v1/analysis/session",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "sessionId": str(uuid4()),
            "userId": user_b,
            "sessionType": "structured",
            "deviceId": "kbd-1",
            "startedAt": "2026-10-12T10:00:00Z",
            "endedAt": "2026-10-12T10:02:00Z",
            "durationMs": 120000,
            "keystrokeCount": 100,
            "qualityFlags": [],
            "features": {
                "ht_mean": 100, "ht_std": 10, "ft_mean": 200, "ft_std": 20,
                "ikl_mean": 300, "ikl_std": 30, "left_ht_mean": 100, "right_ht_mean": 100,
                "hand_asymmetry": 0.0, "pause_frequency": 1.0, "typing_speed": 2.5,
                "session_consistency": 0.1,
            },
        },
    )
    assert resp.status_code == 403
    assert "Forbidden" in resp.json()["detail"]

