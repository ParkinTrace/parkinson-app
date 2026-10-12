"""Tests for treatment event timeline comparison and clinician longitudinal report."""

from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.treatment_comparator import (
    compare_pre_post_event,
    compile_clinician_longitudinal_report,
)

client = TestClient(app)


def test_treatment_event_api_crud():
    user_id = "test-user-1234"
    event_payload = {
        "eventDate": "2026-06-01T10:00:00Z",
        "eventType": "medication_change",
        "description": "Started Levodopa 100mg BID",
        "notes": "Prescribed by Dr. Smith for clinical observation."
    }

    # 1. Create treatment event
    res = client.post(f"/api/v1/treatment-events?user_id={user_id}", json=event_payload)
    assert res.status_code == 200
    data = res.json()
    assert "id" in data
    assert data["description"] == event_payload["description"]
    assert data["eventType"] == "medication_change"

    # 2. List treatment events
    res_list = client.get(f"/api/v1/treatment-events?user_id={user_id}")
    assert res_list.status_code == 200
    events = res_list.json()
    assert len(events) >= 1
    assert any(e["id"] == data["id"] for e in events)


def test_pre_post_event_comparison_math():
    event = {
        "id": "event-1",
        "event_date": "2026-06-15T00:00:00Z",
        "event_type": "dosage_adjustment",
        "description": "Adjusted evening dose"
    }

    # 3 sessions before June 15, 3 sessions after
    t0 = datetime(2026, 6, 1)
    sessions = []
    for day, ht, speed in [
        (1, 120.0, 3.5),
        (5, 122.0, 3.6),
        (10, 118.0, 3.4),  # Pre-event median HT = 120.0
        (16, 105.0, 4.0),
        (20, 108.0, 4.2),
        (25, 102.0, 4.1),  # Post-event median HT = 105.0
    ]:
        sessions.append({
            "session": {"started_at": (t0 + timedelta(days=day)).isoformat(), "valid": True},
            "features": {"ht_mean": ht, "typing_speed": speed, "ft_mean": 200.0, "hand_asymmetry": 0.05}
        })

    res = compare_pre_post_event(event, sessions)
    assert res["pre_session_count"] == 3
    assert res["post_session_count"] == 3

    # Check HT comparison
    ht_comp = next(c for c in res["feature_comparisons"] if c["feature"] == "ht_mean")
    assert ht_comp["pre_median"] == 120.0
    assert ht_comp["post_median"] == 105.0
    assert ht_comp["difference"] == -15.0
    assert ht_comp["percent_change"] == pytest.approx(-12.5, rel=1e-2)

    # Verify non-causality disclaimer exists
    assert "disclaimer" in res
    assert "does NOT establish clinical efficacy" in res["disclaimer"]


def test_clinician_longitudinal_summary_report():
    user_id = "test-clinician-patient-1"
    baseline = {
        "status": "established",
        "anchor_device_id": "test-keyboard-uuid",
        "built_date": "2026-05-15T00:00:00Z",
        "features": {
            "ht_mean": {"median": 115.0, "mad": 8.0, "p25": 110.0, "p75": 122.0},
            "ft_mean": {"median": 210.0, "mad": 15.0, "p25": 195.0, "p75": 225.0},
        }
    }

    t0 = datetime(2026, 5, 1)
    sessions = [
        {"started_at": (t0 + timedelta(days=i)).isoformat(), "valid": True}
        for i in range(12)
    ]
    metrics = [
        {
            "session_id": f"s-{i}",
            "features": {"ht_mean": 115.0 + i},
            "layer2_result": {
                "drift_result": {
                    "drift_signals": {
                        "ht_mean": {"drift_detected": (i >= 8)}  # persistent deviation in last sessions
                    }
                }
            }
        }
        for i in range(12)
    ]

    report = compile_clinician_longitudinal_report(
        user_id=user_id,
        baseline=baseline,
        sessions_history=sessions,
        metrics_history=metrics,
        treatment_events=[]
    )

    assert report["user_id"] == user_id
    assert report["compliance"]["total_sessions"] == 12
    assert report["compliance"]["valid_sessions"] == 12
    assert report["compliance"]["distinct_days"] == 12
    assert report["baseline"]["status"] == "established"
    assert report["baseline"]["anchor_device_id"] == "test-keyboard-uuid"

    # Persistent deviation should be detected for ht_mean
    assert len(report["persistent_motor_pattern_changes"]) >= 1
    drift_item = report["persistent_motor_pattern_changes"][0]
    assert drift_item["feature"] == "ht_mean"
    assert drift_item["status"] == "persistent_deviation"

    # Must contain TRIPOD+AI / Medical AI governance disclaimer
    assert "clinical_governance_disclaimer" in report
    assert "NOT establish a diagnosis" in report["clinical_governance_disclaimer"]


def test_clinician_report_api_endpoint():
    user_id = "patient-api-test"
    res = client.get(f"/api/v1/reports/clinician-summary?user_id={user_id}")
    assert res.status_code == 200
    report = res.json()
    assert "report_id" in report
    assert "compliance" in report
    assert "baseline" in report
    assert "clinical_governance_disclaimer" in report
