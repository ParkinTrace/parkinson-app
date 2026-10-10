"""Automated unit and regression tests for Tappy dataset adapter & data-quality validation.

Verifies:
1. Rejection of negative hold times (ht <= 0).
2. Rejection of extreme/sleep hold times (ht > 2000 ms).
3. Handling of non-numeric, NaN, and corrupted buffer rows.
4. Strict positivity and plausibility of derived monthly feature statistics.
5. Minimum keystroke thresholding (requires >= 10 valid keystrokes).
"""

import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from functions.services.tappy_adapter import (
    clean_keystroke_dataframe,
    month_to_features,
    MIN_VALID_HT_MS,
    MAX_VALID_HT_MS,
    MIN_SESSION_KEYSTROKES,
)


def test_clean_keystroke_dataframe_filters_negative_hold_times():
    """Negative hold times (like the -39,693ms anomaly) must be stripped."""
    raw_df = pd.DataFrame({
        "user": ["USER1"] * 5,
        "date": ["170301"] * 5,
        "time": ["10:00:00"] * 5,
        "hand": ["L", "L", "R", "R", "L"],
        "ht": [100.0, -39693.2, 120.0, -111484.0, 95.0],
        "direction": ["LL", "LL", "LR", "RR", "RL"],
        "pp": [250.0, 300.0, 280.0, 200.0, 260.0],
        "ft": [150.0, 200.0, 160.0, 100.0, 165.0],
    })
    cleaned = clean_keystroke_dataframe(raw_df)
    assert len(cleaned) == 3
    assert (cleaned["ht"] >= MIN_VALID_HT_MS).all()
    assert not (cleaned["ht"] < 0).any()


def test_clean_keystroke_dataframe_filters_extreme_hold_times():
    """Implausibly large hold times (like 3,103,576ms) must be stripped."""
    raw_df = pd.DataFrame({
        "user": ["USER1"] * 4,
        "date": ["170301"] * 4,
        "time": ["10:00:00"] * 4,
        "hand": ["L", "R", "L", "R"],
        "ht": [110.0, 3103576.8, 980424.9, 130.0],
        "direction": ["LL", "LR", "RL", "RR"],
        "pp": [200.0, 250.0, 220.0, 240.0],
        "ft": [90.0, 140.0, 110.0, 110.0],
    })
    cleaned = clean_keystroke_dataframe(raw_df)
    assert len(cleaned) == 2
    assert (cleaned["ht"] <= MAX_VALID_HT_MS).all()
    assert not (cleaned["ht"] > 2000.0).any()


def test_clean_keystroke_dataframe_filters_invalid_hands_and_nans():
    """Rows with non-L/R hands or non-numeric strings must be dropped."""
    raw_df = pd.DataFrame({
        "user": ["USER1"] * 5,
        "date": ["170301"] * 5,
        "time": ["10:00:00"] * 5,
        "hand": ["L", "X", "R", "L", "invalid"],
        "ht": [100.0, 110.0, "corrupt_str", 120.0, 105.0],
        "direction": ["LL", "LL", "LR", "RL", "RR"],
        "pp": [200.0, 210.0, 220.0, 230.0, 240.0],
        "ft": [100.0, 100.0, 100.0, 110.0, 135.0],
    })
    cleaned = clean_keystroke_dataframe(raw_df)
    assert len(cleaned) == 2
    assert set(cleaned["hand"].unique()).issubset({"L", "R"})


def test_month_to_features_produces_strictly_positive_statistics():
    """Summary features must be strictly positive, plausible, and finite."""
    np.random.seed(42)
    n = 50
    raw_df = pd.DataFrame({
        "user": ["USER1"] * n,
        "date": ["170301"] * n,
        "time": ["10:00:00"] * n,
        "hand": np.random.choice(["L", "R"], size=n),
        "ht": np.random.uniform(70.0, 180.0, size=n),
        "direction": ["LL"] * n,
        "pp": np.random.uniform(150.0, 450.0, size=n),
        "ft": np.random.uniform(50.0, 250.0, size=n),
    })
    # Inject corrupted outliers into raw input
    raw_df.loc[0, "ht"] = -111484.0
    raw_df.loc[1, "ht"] = 3103576.8
    
    feats = month_to_features(raw_df)
    assert feats is not None
    assert feats["ht_mean"] > 0
    assert 50.0 <= feats["ht_mean"] <= 250.0
    assert feats["left_ht_mean"] > 0
    assert feats["right_ht_mean"] > 0
    assert feats["ht_std"] > 0
    assert feats["ht_std"] < 500.0
    assert feats["n_keystrokes"] == n - 2  # 2 outliers stripped


def test_month_to_features_rejects_insufficient_keystrokes():
    """Months with fewer than MIN_SESSION_KEYSTROKES valid rows must return None."""
    raw_df = pd.DataFrame({
        "user": ["USER1"] * 5,
        "date": ["170301"] * 5,
        "time": ["10:00:00"] * 5,
        "hand": ["L", "R", "L", "R", "L"],
        "ht": [100.0, 110.0, 120.0, 130.0, 140.0],
        "direction": ["LL"] * 5,
        "pp": [200.0] * 5,
        "ft": [100.0] * 5,
    })
    assert month_to_features(raw_df) is None
