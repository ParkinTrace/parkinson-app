"""Dataset Cleaning and Verification Script for Harmonized Sessions.

Integrates directly with `functions/services/tappy_adapter.py` validation logic.
Identifies, audits, and flags the 8 corrupted Tappy records.
Exports a verified cleaned dataset: `functions/data/harmonized/harmonized_sessions_cleaned.csv`.
Outputs transparent audit logs with row-by-row exclusion rationales.
"""

import os
import sys
import json
import pandas as pd
import numpy as np

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

from functions.services.tappy_adapter import (
    MIN_VALID_HT_MS,
    MAX_VALID_HT_MS,
    MAX_ACTIVE_PP_MS,
    MIN_SESSION_KEYSTROKES,
)

RAW_CSV = os.path.join(REPO_ROOT, "functions", "data", "harmonized", "harmonized_sessions.csv")
CLEAN_CSV = os.path.join(REPO_ROOT, "functions", "data", "harmonized", "harmonized_sessions_cleaned.csv")
EXCLUSIONS_JSON = os.path.join(REPO_ROOT, "research", "model-metadata", "tappy_exclusions_report.json")

def audit_and_clean_dataset():
    df = pd.read_csv(RAW_CSV)
    print(f"Total raw records loaded: {len(df)}")
    
    # Validation filters based on physical keyboard dynamics from tappy_adapter:
    # 1. Hold times must be strictly positive (ht >= MIN_VALID_HT_MS)
    # 2. Hold times must not exceed MAX_VALID_HT_MS (2000 ms)
    # 3. Standard deviations must not exceed 1000 ms
    
    corrupt_mask = (
        (df["ht_mean"] < MIN_VALID_HT_MS) |
        (df["left_ht_mean"] < MIN_VALID_HT_MS) |
        (df["right_ht_mean"] < MIN_VALID_HT_MS) |
        (df["ht_mean"] > MAX_VALID_HT_MS) |
        (df["ht_std"] > 1000.0) |
        (df["n_keystrokes"] < MIN_SESSION_KEYSTROKES)
    )
    
    corrupt_rows = df[corrupt_mask].copy()
    print(f"Identified {len(corrupt_rows)} corrupted records using tappy_adapter rules.")
    
    exclusions = []
    for idx, r in corrupt_rows.iterrows():
        reasons = []
        if r["ht_mean"] < MIN_VALID_HT_MS:
            reasons.append(f"ht_mean negative/sub-minimum ({r['ht_mean']:.1f}ms < {MIN_VALID_HT_MS}ms)")
        if r["left_ht_mean"] < MIN_VALID_HT_MS:
            reasons.append(f"left_ht_mean negative/sub-minimum ({r['left_ht_mean']:.1f}ms < {MIN_VALID_HT_MS}ms)")
        if r["right_ht_mean"] < MIN_VALID_HT_MS:
            reasons.append(f"right_ht_mean negative/sub-minimum ({r['right_ht_mean']:.1f}ms < {MIN_VALID_HT_MS}ms)")
        if r["ht_std"] > 1000.0:
            reasons.append(f"ht_std extreme variance ({r['ht_std']:.1f}ms > 1000ms)")
        if r["n_keystrokes"] < MIN_SESSION_KEYSTROKES:
            reasons.append(f"n_keystrokes below threshold ({r['n_keystrokes']} < {MIN_SESSION_KEYSTROKES})")
            
        record_info = {
            "row_index": int(idx),
            "subject_id": str(r["subject_id"]),
            "dataset_source": str(r["dataset_source"]),
            "parkinsons_label": int(r["parkinsons_label"]),
            "source_file": str(r["source_file"]),
            "ht_mean": float(r["ht_mean"]),
            "left_ht_mean": float(r["left_ht_mean"]),
            "right_ht_mean": float(r["right_ht_mean"]),
            "ht_std": float(r["ht_std"]),
            "n_keystrokes": int(r["n_keystrokes"]),
            "exclusion_reasons": reasons
        }
        exclusions.append(record_info)
        print(f"  Exclusion [Row {idx}]: {record_info['subject_id']} -> {', '.join(reasons)}")
        
    df_clean = df[~corrupt_mask].copy().reset_index(drop=True)
    df_clean.to_csv(CLEAN_CSV, index=False)
    print(f"\nCleaned dataset exported to: {CLEAN_CSV} ({len(df_clean)} rows remaining)")
    
    with open(EXCLUSIONS_JSON, "w", encoding="utf-8") as f:
        json.dump({
            "total_raw_rows": len(df),
            "excluded_count": len(exclusions),
            "remaining_clean_rows": len(df_clean),
            "exclusions": exclusions
        }, f, indent=2)
    print(f"Exclusions report exported to: {EXCLUSIONS_JSON}")
    return df_clean

if __name__ == "__main__":
    audit_and_clean_dataset()
