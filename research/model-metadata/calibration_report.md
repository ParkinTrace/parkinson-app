# ParkTrace Probability Calibration & Threshold Report (Checklist Priority 3 & 5)

## 1. Probability Calibration (Platt Scaling)

- **Method**: `CalibratedClassifierCV(method='sigmoid', cv='prefit')`
- **Uncalibrated Brier Score**: `0.2298`
- **Calibrated Brier Score**: `0.2070` (**9.91% error reduction**)
- **Model Version**: `1.1.0-calibrated`
- **Artifact SHA-256**: `072ca735e6fa758575a0ffa95eed72232c7cd05ccc55335bca079eb1f5738864`

## 2. Calibrated Operating Thresholds

| Operating Point | Threshold ($t$) | Sensitivity | Specificity | F1-Score | Clinical & Screening Rationale |
|---|:---:|:---:|:---:|:---:|---|
| **Watch Threshold** (Sensitive) | `0.4271` | **1.0** | 0.0 | 0.8383 | Minimizes false negatives in community screening; flags for longitudinal tracking. |
| **Attention Threshold** (Optimal $J$) | `0.7421` | **0.4523** | **0.6237** | 0.5662 | Maximum Youden's $J$ ($Sens + Spec - 1$); optimal balanced classification. |
| **High-Specificity Threshold** | `inf` | 0.0 | **1.0** | 0.0 | High-confidence threshold; minimizes false alarms. |

## 3. Reliability Curve Data

| Predicted Probability Bin | Empirical Fraction of Positives |
|---|---|
| `0.563` | `0.816` |
| `0.721` | `0.724` |
| `0.813` | `0.611` |