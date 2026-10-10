"""Feature Engineering & Ablation Study for ParkTrace (Checklist Priority 2, Items #13-#26).

Scientifically motivated biomechanical features:
1. ht_ft_ratio: Hold-to-Flight ratio (measures relative bradykinesia in press vs flight)
2. ht_cv: Coefficient of variation of hold time (ht_std / ht_mean, relative motor steadiness)
3. ft_cv: Coefficient of variation of flight time (ft_std / ft_mean, transition hesitation spread)
4. pause_speed_ratio: pause_frequency / (typing_speed + 1e-5) (hesitation density per unit typing rate)
5. speed_ht_product: typing_speed * (ht_mean / 1000.0) (rate-hold coupling)
6. asymmetry_scaled: hand_asymmetry * ht_mean (amplitude-scaled lateral discrepancy)
7. lr_ht_diff_rel: abs(left_ht_mean - right_ht_mean) / (ht_mean + 1e-5) (normalized lateral difference)

Runs controlled 5-fold Stratified Group K-Fold cross-validation grouped by subject_id.
Compares Baseline (12 features) vs Augmented candidate sets across all 3 model families.
"""

import json
import os
import time
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    roc_auc_score, average_precision_score, f1_score,
    recall_score, confusion_matrix, brier_score_loss, roc_curve
)
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(REPO_ROOT, "functions", "data", "harmonized", "harmonized_sessions.csv")
OUT_JSON = os.path.join(REPO_ROOT, "research", "model-metadata", "feature_ablation_results.json")
OUT_MD = os.path.join(REPO_ROOT, "research", "model-metadata", "feature_ablation_summary.md")

BASE_FEATURES = [
    "ht_mean", "ht_std", "ft_mean", "ft_std",
    "ikl_mean", "ikl_std", "left_ht_mean", "right_ht_mean",
    "hand_asymmetry", "pause_frequency", "typing_speed",
    "session_consistency"
]

N_SPLITS = 5
SEED = 42

def engineer_candidate_features(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    eps = 1e-6
    d["ht_ft_ratio"] = d["ht_mean"] / (d["ft_mean"] + eps)
    d["ht_cv"] = d["ht_std"] / (d["ht_mean"] + eps)
    d["ft_cv"] = d["ft_std"] / (d["ft_mean"] + eps)
    d["pause_speed_ratio"] = d["pause_frequency"] / (d["typing_speed"] + eps)
    d["speed_ht_product"] = d["typing_speed"] * (d["ht_mean"] / 1000.0)
    d["asymmetry_scaled"] = d["hand_asymmetry"] * d["ht_mean"]
    d["lr_ht_diff_rel"] = (d["left_ht_mean"] - d["right_ht_mean"]).abs() / (d["ht_mean"] + eps)
    return d

NEW_CANDIDATES = [
    "ht_ft_ratio", "ht_cv", "ft_cv",
    "pause_speed_ratio", "speed_ht_product",
    "asymmetry_scaled", "lr_ht_diff_rel"
]

def assert_no_subject_leakage(train_idx, test_idx, groups):
    train_groups = set(groups[train_idx])
    test_groups = set(groups[test_idx])
    leaked = train_groups & test_groups
    if leaked:
        raise AssertionError(f"Subject leakage: {len(leaked)} subjects")

def evaluate_feature_set(df_view, feature_cols, model_family="random_forest"):
    X = df_view[feature_cols].to_numpy(dtype=float)
    y = df_view["parkinsons_label"].to_numpy(dtype=int)
    groups = df_view["subject_id"].to_numpy()

    cv = StratifiedGroupKFold(n_splits=N_SPLITS, shuffle=True, random_state=SEED)
    aucs, aps, f1s, senss, specs, briers, youdens, best_threshs = [], [], [], [], [], [], [], []

    for fold, (train_idx, test_idx) in enumerate(cv.split(X, y, groups)):
        assert_no_subject_leakage(train_idx, test_idx, groups)

        scaler = StandardScaler()
        X_tr = scaler.fit_transform(X[train_idx])
        X_te = scaler.transform(X[test_idx])
        y_tr = y[train_idx]
        y_te = y[test_idx]

        n_pos = int(y_tr.sum())
        n_neg = int(len(y_tr) - n_pos)
        spw = (n_neg / n_pos) if n_pos > 0 else 1.0

        if model_family == "logistic_regression":
            clf = LogisticRegression(class_weight="balanced", C=1.0, random_state=SEED, max_iter=500)
        elif model_family == "random_forest":
            clf = RandomForestClassifier(n_estimators=200, max_depth=8, class_weight="balanced", random_state=SEED)
        elif model_family == "xgboost":
            clf = XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.05,
                                scale_pos_weight=spw, eval_metric="logloss", random_state=SEED)
        else:
            raise ValueError(f"Unknown model: {model_family}")

        clf.fit(X_tr, y_tr)
        probs = clf.predict_proba(X_te)[:, 1]

        # Calculate metrics
        y_pred = (probs >= 0.5).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_te, y_pred, labels=[0, 1]).ravel()

        aucs.append(roc_auc_score(y_te, probs))
        aps.append(average_precision_score(y_te, probs))
        f1s.append(f1_score(y_te, y_pred, zero_division=0))
        senss.append(recall_score(y_te, y_pred, zero_division=0))
        specs.append(tn / (tn + fp) if (tn + fp) > 0 else 0.0)
        briers.append(brier_score_loss(y_te, probs))

        # Youden's J
        fpr, tpr, threshs = roc_curve(y_te, probs)
        j_scores = tpr - fpr
        best_i = np.argmax(j_scores)
        youdens.append(float(j_scores[best_i]))
        best_threshs.append(float(threshs[best_i]))

    return {
        "n_features": len(feature_cols),
        "roc_auc": {"mean": round(float(np.mean(aucs)), 4), "std": round(float(np.std(aucs)), 4)},
        "avg_precision": {"mean": round(float(np.mean(aps)), 4), "std": round(float(np.std(aps)), 4)},
        "f1": {"mean": round(float(np.mean(f1s)), 4), "std": round(float(np.std(f1s)), 4)},
        "sensitivity": {"mean": round(float(np.mean(senss)), 4), "std": round(float(np.std(senss)), 4)},
        "specificity": {"mean": round(float(np.mean(specs)), 4), "std": round(float(np.std(specs)), 4)},
        "brier_score": {"mean": round(float(np.mean(briers)), 4), "std": round(float(np.std(briers)), 4)},
        "youden_j": {"mean": round(float(np.mean(youdens)), 4), "std": round(float(np.std(youdens)), 4)},
        "optimal_threshold": {"mean": round(float(np.mean(best_threshs)), 4), "std": round(float(np.std(best_threshs)), 4)},
    }

def main():
    print(f"Loading harmonized dataset for feature engineering ablation...")
    raw_df = pd.read_csv(CSV_PATH)
    df = engineer_candidate_features(raw_df)

    results = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "base_features": BASE_FEATURES,
        "new_candidates": NEW_CANDIDATES,
        "ablation": {},
    }

    # Evaluate across views (Focus on NeuroQWERTY controlled and Pooled)
    views = ["neuroqwerty", "pooled"]
    models = ["random_forest", "xgboost", "logistic_regression"]

    for view in views:
        view_df = df if view == "pooled" else df[df["dataset_source"] == view].reset_index(drop=True)
        results["ablation"][view] = {}
        print(f"\n=================== View: {view.upper()} ===================")

        for m in models:
            results["ablation"][view][m] = {}
            print(f"\n--- Model: {m} ---")

            # 1. Baseline (12 features)
            base_res = evaluate_feature_set(view_df, BASE_FEATURES, m)
            results["ablation"][view][m]["baseline"] = base_res
            print(f"  [Baseline (12 feats)] ROC-AUC: {base_res['roc_auc']['mean']:.3f} ± {base_res['roc_auc']['std']:.3f} | "
                  f"AP: {base_res['avg_precision']['mean']:.3f} | Specificity: {base_res['specificity']['mean']:.3f}")

            # 2. Add all new candidates (19 features)
            all_feats = BASE_FEATURES + NEW_CANDIDATES
            all_res = evaluate_feature_set(view_df, all_feats, m)
            results["ablation"][view][m]["all_augmented"] = all_res
            print(f"  [All Candidates (19)] ROC-AUC: {all_res['roc_auc']['mean']:.3f} ± {all_res['roc_auc']['std']:.3f} | "
                  f"AP: {all_res['avg_precision']['mean']:.3f} | Specificity: {all_res['specificity']['mean']:.3f}")

            # 3. Individual candidate additions (Ablation)
            results["ablation"][view][m]["individual"] = {}
            for cand in NEW_CANDIDATES:
                cand_feats = BASE_FEATURES + [cand]
                cand_res = evaluate_feature_set(view_df, cand_feats, m)
                results["ablation"][view][m]["individual"][cand] = cand_res
                delta = cand_res["roc_auc"]["mean"] - base_res["roc_auc"]["mean"]
                sign = "+" if delta >= 0 else ""
                print(f"    + {cand:<18} ROC-AUC: {cand_res['roc_auc']['mean']:.3f} ({sign}{delta:.3f}) | "
                      f"AP: {cand_res['avg_precision']['mean']:.3f} | Spec: {cand_res['specificity']['mean']:.3f}")

    # Save results
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w") as f:
        json.dump(results, f, indent=2)

    # Format Markdown Summary
    md = [
        "# ParkTrace Feature Engineering & Ablation Summary (Checklist Priority 2)",
        "",
        "Evaluation methodology: **Stratified Group 5-Fold Cross-Validation** on `subject_id`.",
        "Ablation testing of 7 candidate biomechanical features added to the 12 baseline features.",
        "",
        "## 1. Candidate Features Defined",
        "",
        "| Candidate Feature | Formula / Concept | Clinical Rationale |",
        "|---|---|---|",
        "| `ht_ft_ratio` | `ht_mean / ft_mean` | Relative bradykinesia: key-hold prolongation vs transition duration |",
        "| `ht_cv` | `ht_std / ht_mean` | Hold time coefficient of variation: motor steadiness normalized to speed |",
        "| `ft_cv` | `ft_std / ft_mean` | Flight time coefficient of variation: transition hesitation consistency |",
        "| `pause_speed_ratio` | `pause_frequency / typing_speed` | Micro-hesitation density per typing throughput |",
        "| `speed_ht_product` | `typing_speed * (ht_mean/1000)` | Rate-hold coupling |",
        "| `asymmetry_scaled` | `hand_asymmetry * ht_mean` | Amplitude-weighted lateral motor asymmetry |",
        "| `lr_ht_diff_rel` | `abs(left_ht - right_ht) / ht_mean` | Normalized left-right hold discrepancy |",
        "",
        "## 2. NeuroQWERTY Controlled Screening Performance",
        "",
        "| Model | Feature Set | Features ($k$) | ROC-AUC | Avg Precision | F1-Score | Specificity | Youden J |",
        "|---|---|:---:|:---:|:---:|:---:|:---:|:---:|",
    ]

    for m in models:
        b = results["ablation"]["neuroqwerty"][m]["baseline"]
        a = results["ablation"]["neuroqwerty"][m]["all_augmented"]
        md.append(f"| **{m}** (Baseline) | Original 12 | 12 | {b['roc_auc']['mean']:.3f} ± {b['roc_auc']['std']:.3f} | {b['avg_precision']['mean']:.3f} | {b['f1']['mean']:.3f} | {b['specificity']['mean']:.3f} | {b['youden_j']['mean']:.3f} |")
        md.append(f"| **{m}** (Augmented) | + All 7 Candidates | 19 | {a['roc_auc']['mean']:.3f} ± {a['roc_auc']['std']:.3f} | {a['avg_precision']['mean']:.3f} | {a['f1']['mean']:.3f} | {a['specificity']['mean']:.3f} | {a['youden_j']['mean']:.3f} |")

    md.extend([
        "",
        "## 3. Best Performing Individual Feature Additions on NeuroQWERTY (Random Forest)",
        "",
        "| Added Feature | ROC-AUC | $\\Delta$ vs Base | Avg Precision | Specificity | Impact |",
        "|---|:---:|:---:|:---:|:---:|---|",
    ])
    rf_base_auc = results["ablation"]["neuroqwerty"]["random_forest"]["baseline"]["roc_auc"]["mean"]
    for cand, res in results["ablation"]["neuroqwerty"]["random_forest"]["individual"].items():
        delta = res["roc_auc"]["mean"] - rf_base_auc
        sign = "+" if delta >= 0 else ""
        impact = "Improves discrimination" if delta > 0.005 else ("Neutral" if abs(delta) <= 0.005 else "Slight degradation")
        md.append(f"| `+{cand}` | {res['roc_auc']['mean']:.3f} | {sign}{delta:.3f} | {res['avg_precision']['mean']:.3f} | {res['specificity']['mean']:.3f} | {impact} |")

    with open(OUT_MD, "w") as f:
        f.write("\n".join(md))

    print(f"\nAblation study complete! Reports saved to:\n  {OUT_JSON}\n  {OUT_MD}")

if __name__ == "__main__":
    main()
