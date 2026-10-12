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
    assert len(res) == 0


def test_production_feature_contract_alignment():
    """Verify production feature count, order, and isolation of research features."""
    import joblib
    from app.core.constants import RF_LAYER1_FEATURES
    from app.services.layer1_screening import ARTIFACT

    bundle = joblib.load(ARTIFACT)
    artifact_features = bundle["features"]

    # 1. Must be exactly 12 features
    assert len(artifact_features) == 12
    assert len(RF_LAYER1_FEATURES) == 12

    # 2. Must be strictly identical in order
    assert list(artifact_features) == list(RF_LAYER1_FEATURES)

    # 3. ht_cv and backspace_rate must NOT be present in production model
    assert "ht_cv" not in artifact_features
    assert "backspace_rate" not in artifact_features


def test_screening_and_explainability_handles_non_finite_and_malformed():
    """Verify robust fail-closed handling of NaN, Inf, None, and string values."""
    import numpy as np

    # 1. Missing keys
    incomplete = {"ht_mean": 120.0}
    res_l1 = screen_against_reference(incomplete)
    assert res_l1["status"] == "insufficient_data"
    assert res_l1["pd_probability"] is None
    assert res_l1["top_contributors"] is None
    assert explain_session(incomplete) == []

    # 2. NaN values
    with_nan = dict(SAMPLE_FEATURES)
    with_nan["ht_mean"] = float(np.nan)
    res_l1 = screen_against_reference(with_nan)
    assert res_l1["status"] == "insufficient_data"
    assert res_l1["pd_probability"] is None
    assert explain_session(with_nan) == []

    # 3. Inf values
    with_inf = dict(SAMPLE_FEATURES)
    with_inf["pause_frequency"] = float(np.inf)
    res_l1 = screen_against_reference(with_inf)
    assert res_l1["status"] == "insufficient_data"
    assert res_l1["pd_probability"] is None
    assert explain_session(with_inf) == []

    # 4. Malformed / None values
    with_none = dict(SAMPLE_FEATURES)
    with_none["typing_speed"] = None
    res_l1 = screen_against_reference(with_none)
    assert res_l1["status"] == "insufficient_data"
    assert res_l1["pd_probability"] is None
    assert explain_session(with_none) == []

    # 5. String types
    with_str = dict(SAMPLE_FEATURES)
    with_str["session_consistency"] = "invalid_string"
    res_l1 = screen_against_reference(with_str)
    assert res_l1["status"] == "insufficient_data"
    assert res_l1["pd_probability"] is None
    assert explain_session(with_str) == []
