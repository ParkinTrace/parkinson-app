"""Dataset Cleaning and Verification Script for Harmonized Sessions.

Identifies, audits, and flags the 8 corrupted Tappy records.
Exports a verified cleaned dataset: `functions/data/harmonized/harmonized_sessions_cleaned.csv`.
Outputs transparent audit logs with row-by-row exclusion rationales.
"""

import os
import json
import pandas as pd
import numpy as np

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_CSV = os.path.join(REPO_ROOT, "functions", "data", "harmonized", "harmonized_sessions.csv")
CLEAN_CSV = os.path.join(REPO_ROOT, "functions", "data", "harmonized", "harmonized_sessions_cleaned.csv")
EXCLUSIONS_JSON = os.path.join(REPO_ROOT, "research", "model-metadata", "tappy_exclusions_report.json")

def audit_and_clean_dataset():
    df = pd.read_csv(RAW_CSV)
    print(f"Total raw records loaded: {len(df)}")
    
    # Validation filters based on physical physical keyboard dynamics
    # 1. Hold times must be strictly positive
    # 2. Hold times must not exceed 2000 ms (implausible multi-second keypresses)
    # 3. Standard deviations must not exceed 1000 ms
    
    corrupt_mask = (
        (df["ht_mean"] <= 0) |
        (df["left_ht_mean"] <= 0) |
        (df["right_ht_mean"] <= 0) |
        (df["ht_mean"] > 2000.0) |
        (df["ht_std"] > 1000.0)
    )
    
    corrupt_rows = df[corrupt_mask].copy()
    print(f"Identified {len(corrupt_rows)} corrupted records.")
    
    exclusions = []
    for idx, r in corrupt_rows.iterrows():
        reasons = []
        if r["ht_mean"] <= 0:
            reasons.append(f"ht_mean negative/zero ({r['ht_mean']:.1f}ms)")
        if r["left_ht_mean"] <= 0:
            reasons.append(f"left_ht_mean negative/zero ({r['left_ht_mean']:.1f}ms)")
        if r["right_ht_mean"] <= 0:
            reasons.append(f"right_ht_mean negative/zero ({r['right_ht_mean']:.1f}ms)")
        if r["ht_std"] > 1000.0:
            reasons.append(f"ht_std extreme variance ({r['ht_std']:.1f}ms)")
            
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

if __name__ == "__main__":
    audit_and_clean_dataset()
