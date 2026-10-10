"""Tests for explainability and clinical feature attribution (Checklist Priority 4)."""

import pytest
from app.services.explain import explain_session
from app.services.layer1_screening import screen_against_reference

SAMPLE_FEATURES = {
    "ht_mean": 130.0,
    "ht_std": 35.0,
    "ft_mean": 195.0,
    "ft_std": 45.0,
    "ikl_mean": 325.0,
    "ikl_std": 65.0,
    "left_ht_mean": 125.0,
    "right_ht_mean": 135.0,
    "hand_asymmetry": 0.08,
    "pause_frequency": 2.2,
    "typing_speed": 3.8,
    "session_consistency": 0.22,
}

def test_explain_session_returns_structured_contributors():
    contributors = explain_session(SAMPLE_FEATURES)
    assert isinstance(contributors, list)
    assert len(contributors) > 0
    assert len(contributors) <= 3

    for item in contributors:
        assert "feature" in item
        assert "humanName" in item
        assert "category" in item
        assert "contribution" in item
        assert "impact" in item
        assert "direction" in item
        assert "text" in item
        assert isinstance(item["contribution"], float)
        assert item["impact"] in ("increased_risk_score", "decreased_risk_score")
        assert item["direction"] in ("above_typical", "below_typical")

def test_screen_against_reference_includes_top_contributors():
    result = screen_against_reference(SAMPLE_FEATURES)
    assert result["status"] in ("normal", "watch", "attention")
    assert isinstance(result["pd_probability"], float)
    assert 0.0 <= result["pd_probability"] <= 1.0

    assert "top_contributors" in result
    assert result["top_contributors"] is not None
    assert len(result["top_contributors"]) > 0

def test_explain_session_handles_invalid_gracefully():
    # Incomplete dictionary should return empty list gracefully (fail-closed, never crash)
    incomplete = {"ht_mean": 100.0}
    res = explain_session(incomplete)
    assert isinstance(res, list)
