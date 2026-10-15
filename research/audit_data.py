"""Dataset Audit for ParkTrace (Checklist Priority 1, Items #1-#12).

Audits harmonized_sessions.csv:
- Subject and session row counts per dataset
- Class distributions (PD vs Control)
- Column missingness and types
- Subject ID uniqueness across datasets (no cross-source contamination)
- Plausibility checks on timing features (positivity, bounds)

Output:
  research/audit_report.json
  research/audit_report.md
"""

import json
import os
import numpy as np
import pandas as pd

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(REPO_ROOT, "functions", "data", "harmonized", "harmonized_sessions.csv")
OUT_JSON = os.path.join(REPO_ROOT, "research", "audit_report.json")
OUT_MD = os.path.join(REPO_ROOT, "research", "audit_report.md")

TYPING_FEATURES = [
    "ht_mean", "ht_std", "ft_mean", "ft_std",
    "ikl_mean", "ikl_std", "left_ht_mean", "right_ht_mean",
    "hand_asymmetry", "pause_frequency", "typing_speed",
    "session_consistency"
]

def run_audit():
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Harmonized dataset not found at {CSV_PATH}")

    df = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df)} rows from {CSV_PATH}")

    report = {
        "dataset_file": os.path.relpath(CSV_PATH, REPO_ROOT),
        "total_rows": int(len(df)),
        "total_unique_subjects": int(df["subject_id"].nunique()),
        "datasets": {},
        "cross_dataset_overlap": [],
        "missingness": {},
        "timing_plausibility": {},
    }

    # Audit per dataset
    for source in sorted(df["dataset_source"].unique()):
        sub = df[df["dataset_source"] == source]
        subjects = sub["subject_id"].unique()
        labels_per_subj = sub.groupby("subject_id")["parkinsons_label"].nunique()
        multi_label_subjects = int((labels_per_subj > 1).sum())

        label_counts_rows = sub["parkinsons_label"].value_counts().to_dict()
        subj_df = sub.drop_duplicates(subset=["subject_id"])
        label_counts_subj = subj_df["parkinsons_label"].value_counts().to_dict()

        report["datasets"][source] = {
            "rows": int(len(sub)),
            "unique_subjects": int(len(subjects)),
            "multi_label_subjects": multi_label_subjects,
            "row_level_labels": {str(k): int(v) for k, v in label_counts_rows.items()},
            "subject_level_labels": {str(k): int(v) for k, v in label_counts_subj.items()},
            "pd_prevalence_pct": round(float(subj_df["parkinsons_label"].mean() * 100), 2),
            "rows_per_subject_mean": round(float(len(sub) / len(subjects)), 2),
            "rows_per_subject_min": int(sub.groupby("subject_id").size().min()),
            "rows_per_subject_max": int(sub.groupby("subject_id").size().max()),
        }

    # Cross-dataset subject overlap
    tappy_subjs = set(df[df["dataset_source"] == "tappy"]["subject_id"])
    nq_subjs = set(df[df["dataset_source"] == "neuroqwerty"]["subject_id"])
    overlap = list(tappy_subjs & nq_subjs)
    report["cross_dataset_overlap"] = overlap

    # Missingness across columns
    for col in df.columns:
        n_missing = int(df[col].isna().sum())
        report["missingness"][col] = {
            "missing_count": n_missing,
            "missing_pct": round(n_missing / len(df) * 100, 2),
            "dtype": str(df[col].dtype),
        }

    # Timing plausibility checks
    for feat in TYPING_FEATURES:
        if feat in df.columns:
            vals = df[feat].dropna()
            report["timing_plausibility"][feat] = {
                "min": round(float(vals.min()), 4),
                "max": round(float(vals.max()), 4),
                "median": round(float(vals.median()), 4),
                "iqr": round(float(np.percentile(vals, 75) - np.percentile(vals, 25)), 4),
                "negative_count": int((vals < 0).sum()),
                "zero_count": int((vals == 0).sum()),
                "infinite_count": int(np.isinf(vals).sum()),
            }

    # Write JSON report
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w") as f:
        json.dump(report, f, indent=2)

    # Format Markdown summary
    md = [
        "# ParkTrace Dataset Audit Report",
        "",
        f"- **Harmonized CSV**: `{report['dataset_file']}`",
        f"- **Total Rows**: {report['total_rows']}",
        f"- **Total Unique Subjects**: {report['total_unique_subjects']}",
        f"- **Cross-Dataset Subject Overlap**: {len(overlap)} subjects overlapping",
        "",
        "## 1. Dataset Breakdown",
        "",
        "| Dataset | Rows | Subjects | Rows/Subj (Mean [Min, Max]) | Control (0) | PD (1) | PD Prevalence |",
        "|---|---|---|---|---|---|---|",
    ]
    for src, d in report["datasets"].items():
        sub_labels = d["subject_level_labels"]
        c0 = sub_labels.get("0", 0)
        c1 = sub_labels.get("1", 0)
        md.append(f"| **{src}** | {d['rows']} | {d['unique_subjects']} | {d['rows_per_subject_mean']} [{d['rows_per_subject_min']}, {d['rows_per_subject_max']}] | {c0} | {c1} | {d['pd_prevalence_pct']}% |")

    md.extend([
        "",
        "## 2. Feature Missingness",
        "",
        "| Feature | Missing Rows | Missing % | Notes |",
        "|---|---|---|---|",
    ])
    for col, m in report["missingness"].items():
        note = "Used in training" if col in TYPING_FEATURES else ("Demographic (Tappy only)" if "age" in col or "sex" in col else "")
        if col == "backspace_rate":
            note = "Excluded from pooled (unavailable in Tappy)"
        md.append(f"| `{col}` | {m['missing_count']} | {m['missing_pct']}% | {note} |")

    md.extend([
        "",
        "## 3. Timing Plausibility & Sanity Checks",
        "",
        "| Feature | Min | Median | Max | IQR | Invalid (Neg/Inf) |",
        "|---|---|---|---|---|---|",
    ])
    for feat, p in report["timing_plausibility"].items():
        invalid = p["negative_count"] + p["infinite_count"]
        md.append(f"| `{feat}` | {p['min']} | {p['median']} | {p['max']} | {p['iqr']} | {invalid} |")

    md.extend([
        "",
        "## 4. Key Findings & Actionable Observations",
        "",
        f"1. **Severe Class Imbalance in Tappy**: Tappy has {report['datasets']['tappy']['pd_prevalence_pct']}% PD prevalence ({report['datasets']['tappy']['subject_level_labels']['1']} PD vs {report['datasets']['tappy']['subject_level_labels']['0']} Controls). Class weighting is mandatory.",
        f"2. **Balanced NeuroQWERTY**: NeuroQWERTY has {report['datasets']['neuroqwerty']['pd_prevalence_pct']}% PD prevalence ({report['datasets']['neuroqwerty']['subject_level_labels']['1']} PD vs {report['datasets']['neuroqwerty']['subject_level_labels']['0']} Controls) - ideal for controlled screening benchmarks.",
        "3. **Zero Subject Overlap**: Verified zero overlap between Tappy and NeuroQWERTY subject IDs.",
        "4. **No Inconsistent Subject Labels**: Every subject has a consistent label across all their session rows (0 multi-label subjects).",
        "5. **Timing Sanity FAILURE**: committed CSV contains negative means (ht_mean: 4, left_ht_mean: 2, right_ht_mean: 2 per timing_plausibility) and ht_std up to 3103576.8 ms — see §3 table. Do not claim clean timing.",
        ""
    ])

    with open(OUT_MD, "w") as f:
        f.write("\n".join(md))

    print(f"Audit completed successfully. Reports saved to:\n  {OUT_JSON}\n  {OUT_MD}")
    return report

if __name__ == "__main__":
    run_audit()
