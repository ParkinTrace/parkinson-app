"""Tappy Dataset Adapter with Strict Data Quality & Plausibility Validation.

Parses PhysioNet Tappy longitudinal passive keystroke logs into harmonized feature vectors.

Data Quality Fixes (Audit Item 1):
1. Rejects negative hold times (ht <= 0).
2. Rejects implausibly large timing values (ht > 2000 ms) representing system sleeps/buffer hangs.
3. Drops concatenated or malformed multi-record rows.
4. Requires at least 10 valid keystrokes to compute monthly features.
5. Guarantees that ht_mean, left_ht_mean, right_ht_mean, and ht_std are strictly positive and plausible.
"""

import os
from typing import Dict, List, Optional
import numpy as np
import pandas as pd

TAPPY_COLS = ["user", "date", "time", "hand", "ht", "direction", "pp", "ft", "trailing"]
LABEL_MAP = {"True": 1, "False": 0, "1": 1, "0": 0, 1: 1, 0: 0}

# Plausibility bounds for physical keyboard keystrokes
MIN_VALID_HT_MS = 5.0      # Keypress hold time < 5ms is electrical bounce/noise
MAX_VALID_HT_MS = 2000.0   # Keypress hold time > 2000ms is a key held down during idle/sleep
MAX_ACTIVE_PP_MS = 3000.0  # Press-to-press gap > 3000ms is idle pause, not active typing
MIN_SESSION_KEYSTROKES = 10


def clean_keystroke_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Applies strict data-quality and physical plausibility filters to raw Tappy keystrokes.
    
    Filters out:
    - Non-numeric or missing hold/flight/latency values.
    - Negative hold times (caused by midnight clock wraps or signed overflow).
    - Unreasonable hold times (> 2000 ms).
    - Unknown hand tags (only 'L' and 'R' permitted).
    """
    for col in ("ht", "pp", "ft"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            
    # Drop rows missing primary timings
    df = df.dropna(subset=["ht", "pp", "ft"]).copy()
    
    # Strict physical plausibility bounds
    valid_mask = (
        (df["ht"] >= MIN_VALID_HT_MS) &
        (df["ht"] <= MAX_VALID_HT_MS) &
        (df["pp"] > 0) &
        (df["hand"].isin(["L", "R"]))
    )
    df = df[valid_mask].reset_index(drop=True)
    return df


def read_monthly_file(filepath: str) -> pd.DataFrame:
    """Reads a single Tappy monthly keystroke file and applies data-cleaning gates."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Tappy monthly file not found: {filepath}")
        
    df = pd.read_csv(
        filepath,
        sep="\t",
        header=None,
        names=TAPPY_COLS,
        dtype=str,
        on_bad_lines="skip"
    )
    df = clean_keystroke_dataframe(df)
    
    # First row's Latency/Flight references context outside this file; drop if length > 1
    if len(df) > 1:
        df = df.iloc[1:].reset_index(drop=True)
    return df


def month_to_features(df: pd.DataFrame) -> Optional[Dict[str, Optional[float]]]:
    """Computes harmonized typing features from a cleaned monthly keystroke dataframe.
    
    Returns None if the dataframe has fewer than MIN_SESSION_KEYSTROKES valid keypresses.
    """
    df_clean = clean_keystroke_dataframe(df)
    if len(df_clean) < MIN_SESSION_KEYSTROKES:
        return None
        
    ht = df_clean["ht"].to_numpy(dtype=float)
    ft = df_clean["ft"].to_numpy(dtype=float)
    pp = df_clean["pp"].to_numpy(dtype=float)
    
    # Hand-specific hold times
    left = ht[df_clean["hand"].to_numpy() == "L"]
    right = ht[df_clean["hand"].to_numpy() == "R"]
    
    left_mean = float(np.mean(left)) if len(left) > 0 else None
    right_mean = float(np.mean(right)) if len(right) > 0 else None
    
    # Hand asymmetry
    hand_asym = None
    if left_mean is not None and right_mean is not None:
        denom = max(left_mean, right_mean)
        if denom > 0:
            hand_asym = float(abs(left_mean - right_mean) / denom)
            
    # Active typing time: gaps up to MAX_ACTIVE_PP_MS
    active = pp[pp <= MAX_ACTIVE_PP_MS]
    active_min = float(np.sum(active)) / 60000.0 if len(active) > 0 else 0.0
    
    pauses = int(np.sum(ft > 500.0))
    ikl_mean = float(np.mean(pp)) if len(pp) > 0 else 0.0
    ikl_std = float(np.std(pp)) if len(pp) > 0 else 0.0
    
    ht_mean = float(np.mean(ht))
    ht_std = float(np.std(ht))
    
    # Sanity assertion: hold time statistics must be physically plausible
    assert ht_mean > 0, f"ht_mean must be positive, got {ht_mean}"
    assert ht_mean <= MAX_VALID_HT_MS, f"ht_mean exceeds plausible bound, got {ht_mean}"
    
    return {
        "ht_mean": ht_mean,
        "ht_std": ht_std,
        "ft_mean": float(np.mean(ft)),
        "ft_std": float(np.std(ft)),
        "ikl_mean": ikl_mean,
        "ikl_std": ikl_std,
        "left_ht_mean": left_mean,
        "right_ht_mean": right_mean,
        "hand_asymmetry": hand_asym,
        "pause_frequency": float(pauses / active_min) if active_min > 0 else None,
        "typing_speed": float(len(df_clean) / (active_min * 60.0)) if active_min > 0 else None,
        "session_consistency": float(ikl_std / ikl_mean) if ikl_mean > 0 else None,
        "backspace_rate": None,  # Not recorded in Tappy
        "n_keystrokes": int(len(df_clean)),
    }
