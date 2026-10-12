"""Probability Calibration & Operating Point Calibration (Checklist Items #53-#57).

1. Fits probability calibration (Sigmoid / Platt scaling) inside StratifiedGroupKFold.
2. Compares uncalibrated vs calibrated Brier Score and reliability.
3. Derives 3 clinically grounded operating thresholds:
   - Watch Threshold: High Sensitivity (>=85%) to prevent false negatives.
   - Attention Threshold: Optimal Youden's J (Sensitivity + Specificity - 1).
   - Specificity Threshold: High Specificity (>=85%) to prevent false alarms.
4. Exports authoritative calibrated model package with metadata:
   - Version, checksum, calibrated cutoffs, and Brier score.
"""

import hashlib
import json
import os
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    brier_score_loss, confusion_matrix, recall_score,
    roc_auc_score, average_precision_score, f1_score, roc_curve
)
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(REPO_ROOT, "functions", "data", "harmonized", "harmonized_sessions.csv")
ARTIFACT_DIR = os.path.join(REPO_ROOT, "backend", "app", "artifacts")
LEGACY_DIR = os.path.join(REPO_ROOT, "functions", "models", "experiments", "rf")
REPORTS_DIR = os.path.join(REPO_ROOT, "research", "model-metadata")

BASE_FEATURES = [
    "ht_mean", "ht_std", "ft_mean", "ft_std",
    "ikl_mean", "ikl_std", "left_ht_mean", "right_ht_mean",
    "hand_asymmetry", "pause_frequency", "typing_speed",
    "session_consistency"
]

N_SPLITS = 5
SEED = 42

def compute_threshold_metrics(y_true, y_prob, threshold):
    y_pred = (y_prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    sens = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    return {"threshold": round(float(threshold), 4), "sensitivity": round(sens, 4),
            "specificity": round(spec, 4), "f1": round(f1, 4),
            "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}

def run_calibration_experiment():
    print(f"Loading dataset: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    if "dataset_source" in df.columns:
        print("Filtering exclusively for authoritative Layer 1 reference cohort: NeuroQWERTY (active typing)")
        df = df[df["dataset_source"] == "neuroqwerty"].copy().reset_index(drop=True)

    X_raw = df[BASE_FEATURES].to_numpy(dtype=float)
    y = df["parkinsons_label"].to_numpy(dtype=int)
    groups = df["subject_id"].to_numpy()

    cv = StratifiedGroupKFold(n_splits=N_SPLITS, shuffle=True, random_state=SEED)

    uncal_probs = np.zeros(len(y))
    cal_probs = np.zeros(len(y))

    uncal_briers = []
    cal_briers = []

    for fold, (train_idx, test_idx) in enumerate(cv.split(X_raw, y, groups)):
        scaler = StandardScaler()
        X_tr = scaler.fit_transform(X_raw[train_idx])
        X_te = scaler.transform(X_raw[test_idx])
        y_tr, y_te = y[train_idx], y[test_idx]

        # Base RF
        base_rf = RandomForestClassifier(n_estimators=200, max_depth=8, class_weight="balanced", random_state=SEED)
        base_rf.fit(X_tr, y_tr)
        p_uncal = base_rf.predict_proba(X_te)[:, 1]
        uncal_probs[test_idx] = p_uncal
        uncal_briers.append(brier_score_loss(y_te, p_uncal))

        # Calibrated model (Platt scaling / Sigmoid)
        cal_clf = CalibratedClassifierCV(estimator=base_rf, method="sigmoid", cv=3)
        cal_clf.fit(X_tr, y_tr)
        p_cal = cal_clf.predict_proba(X_te)[:, 1]
        cal_probs[test_idx] = p_cal
        cal_briers.append(brier_score_loss(y_te, p_cal))

    # Overall Metrics
    uncal_brier_mean = float(np.mean(uncal_briers))
    cal_brier_mean = float(np.mean(cal_briers))
    auc_uncal = float(roc_auc_score(y, uncal_probs))
    auc_cal = float(roc_auc_score(y, cal_probs))

    # Reliability curve points (5 bins)
    prob_true, prob_pred = calibration_curve(y, cal_probs, n_bins=5, strategy="uniform")

    # Threshold optimization on calibrated out-of-fold probabilities
    fpr, tpr, threshs = roc_curve(y, cal_probs)
    j_scores = tpr - fpr
    best_j_idx = np.argmax(j_scores)
    youden_thresh = float(threshs[best_j_idx])

    # Find sensitivity >= 85% threshold
    sens_85_idx = np.where(tpr >= 0.85)[0]
    watch_thresh = float(threshs[sens_85_idx[-1]]) if len(sens_85_idx) else 0.40

    # Find specificity >= 85% threshold (FPR <= 0.15)
    spec_85_idx = np.where((fpr <= 0.15) & np.isfinite(threshs))[0]
    high_spec_thresh = float(threshs[spec_85_idx[0]]) if len(spec_85_idx) else 0.70

    watch_metrics = compute_threshold_metrics(y, cal_probs, watch_thresh)
    youden_metrics = compute_threshold_metrics(y, cal_probs, youden_thresh)
    spec_metrics = compute_threshold_metrics(y, cal_probs, high_spec_thresh)

    results = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model": "RandomForestClassifier",
        "calibration_method": "sigmoid_platt_scaling",
        "n_samples": len(df),
        "n_subjects": int(df["subject_id"].nunique()),
        "uncalibrated_brier": round(uncal_brier_mean, 4),
        "calibrated_brier": round(cal_brier_mean, 4),
        "brier_improvement_pct": round((uncal_brier_mean - cal_brier_mean) / uncal_brier_mean * 100, 2),
        "roc_auc": round(auc_cal, 4),
        "reliability_curve": {
            "mean_predicted_prob": [round(float(p), 4) for p in prob_pred],
            "fraction_of_positives": [round(float(p), 4) for p in prob_true],
        },
        "operating_thresholds": {
            "watch_threshold_high_sensitivity": watch_metrics,
            "attention_threshold_youden_optimal": youden_metrics,
            "high_specificity_threshold": spec_metrics,
        }
    }

    print("\n--- Calibration Results ---")
    print(f"Uncalibrated Brier Score: {uncal_brier_mean:.4f}")
    print(f"Calibrated Brier Score:   {cal_brier_mean:.4f} ({results['brier_improvement_pct']}% improvement)")
    print(f"Calibrated ROC-AUC:       {auc_cal:.4f}")
    print("\n--- Calibrated Decision Boundaries ---")
    print(f"1. Watch Cutoff (Sensitivity >= 85%):    {watch_thresh:.4f} -> Sens: {watch_metrics['sensitivity']}, Spec: {watch_metrics['specificity']}")
    print(f"2. Attention Cutoff (Youden's J):        {youden_thresh:.4f} -> Sens: {youden_metrics['sensitivity']}, Spec: {youden_metrics['specificity']}")
    print(f"3. High Specificity Cutoff (Spec >= 85%): {high_spec_thresh:.4f} -> Sens: {spec_metrics['sensitivity']}, Spec: {spec_metrics['specificity']}")

    # Fit final calibrated production model on full data
    print("\n--- Training and Exporting Final Production Calibrated Model ---")
    full_scaler = StandardScaler()
    X_scaled = full_scaler.fit_transform(X_raw)

    base_model = RandomForestClassifier(n_estimators=200, max_depth=8, class_weight="balanced", random_state=SEED)
    base_model.fit(X_scaled, y)

    calibrated_model = CalibratedClassifierCV(estimator=base_model, method="sigmoid", cv=3)
    calibrated_model.fit(X_scaled, y)

    artifact_bundle = {
        "model": calibrated_model,
        "base_model": base_model,
        "features": BASE_FEATURES,
        "version": "1.1.0-calibrated",
        "trained_date": time.strftime("%Y-%m-%d"),
        "brier_score": cal_brier_mean,
        "calibrated_thresholds": {
            "watch": round(watch_thresh, 4),
            "attention": round(youden_thresh, 4),
            "high_specificity": round(high_spec_thresh, 4),
        },
    }

    scaler_bundle = {
        "mean_": full_scaler.mean_.tolist(),
        "scale_": full_scaler.scale_.tolist(),
        "features": BASE_FEATURES,
    }

    # Save to backend artifacts and legacy directory
    for t_dir in [ARTIFACT_DIR, LEGACY_DIR]:
        os.makedirs(t_dir, exist_ok=True)
        m_path = os.path.join(t_dir, "model_full.joblib")
        s_path = os.path.join(t_dir, "live_scaler.json")
        joblib.dump(artifact_bundle, m_path)
        with open(s_path, "w") as f:
            json.dump(scaler_bundle, f, indent=2)

    # Compute SHA-256
    with open(os.path.join(ARTIFACT_DIR, "model_full.joblib"), "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()
    results["artifact_sha256"] = sha256
    print(f"Exported artifact SHA-256: {sha256}")

    # Save reports
    os.makedirs(REPORTS_DIR, exist_ok=True)
    json_path = os.path.join(REPORTS_DIR, "calibration_report.json")
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2)

    md_path = os.path.join(REPORTS_DIR, "calibration_report.md")
    md = [
        "# ParkTrace Probability Calibration & Threshold Report (Checklist Priority 3 & 5)",
        "",
        "## 1. Probability Calibration (Platt Scaling)",
        "",
        f"- **Method**: `CalibratedClassifierCV(method='sigmoid', cv='prefit')`",
        f"- **Uncalibrated Brier Score**: `{uncal_brier_mean:.4f}`",
        f"- **Calibrated Brier Score**: `{cal_brier_mean:.4f}` (**{results['brier_improvement_pct']}% error reduction**)",
        f"- **Model Version**: `1.1.0-calibrated`",
        f"- **Artifact SHA-256**: `{sha256}`",
        "",
        "## 2. Calibrated Operating Thresholds",
        "",
        "| Operating Point | Threshold ($t$) | Sensitivity | Specificity | F1-Score | Clinical & Screening Rationale |",
        "|---|:---:|:---:|:---:|:---:|---|",
        f"| **Watch Threshold** (Sensitive) | `{watch_thresh:.4f}` | **{watch_metrics['sensitivity']}** | {watch_metrics['specificity']} | {watch_metrics['f1']} | Minimizes false negatives in community screening; flags for longitudinal tracking. |",
        f"| **Attention Threshold** (Optimal $J$) | `{youden_thresh:.4f}` | **{youden_metrics['sensitivity']}** | **{youden_metrics['specificity']}** | {youden_metrics['f1']} | Maximum Youden's $J$ ($Sens + Spec - 1$); optimal balanced classification. |",
        f"| **High-Specificity Threshold** | `{high_spec_thresh:.4f}` | {spec_metrics['sensitivity']} | **{spec_metrics['specificity']}** | {spec_metrics['f1']} | High-confidence threshold; minimizes false alarms. |",
        "",
        "## 3. Reliability Curve Data",
        "",
        "| Predicted Probability Bin | Empirical Fraction of Positives |",
        "|---|---|",
    ]
    for p_pred, p_true in zip(results["reliability_curve"]["mean_predicted_prob"], results["reliability_curve"]["fraction_of_positives"]):
        md.append(f"| `{p_pred:.3f}` | `{p_true:.3f}` |")

    with open(md_path, "w") as f:
        f.write("\n".join(md))

    print(f"Reports saved to:\n  {json_path}\n  {md_path}")
    return results

if __name__ == "__main__":
    run_calibration_experiment()
