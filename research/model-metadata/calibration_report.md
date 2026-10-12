# ParkTrace Probability Calibration & Threshold Report (Checklist Priority 3 & 5)

## 1. Probability Calibration (Platt Scaling)

- **Method**: `CalibratedClassifierCV(method='sigmoid', cv='prefit')`
- **Uncalibrated Brier Score**: `0.1872`
- **Calibrated Brier Score**: `0.1981` (**-5.83% error reduction**)
- **Model Version**: `1.1.0-calibrated`
- **Artifact SHA-256**: `9e5b047479545698907adc28c5cf6d1967d0e9f8dce0a726a4889b2905399333`

## 2. Calibrated Operating Thresholds

| Operating Point | Threshold ($t$) | Sensitivity | Specificity | F1-Score | Clinical & Screening Rationale |
|---|:---:|:---:|:---:|:---:|---|
| **Watch Threshold** (Sensitive) | `0.2653` | **1.0** | 0.0 | 0.6818 | Minimizes false negatives in community screening; flags for longitudinal tracking. |
| **Attention Threshold** (Optimal $J$) | `0.4966` | **0.7167** | **0.7321** | 0.7288 | Maximum Youden's $J$ ($Sens + Spec - 1$); optimal balanced classification. |
| **High-Specificity Threshold** | `0.7882` | 0.0167 | **1.0** | 0.0328 | High-confidence threshold; minimizes false alarms. |

## 3. Reliability Curve Data

| Predicted Probability Bin | Empirical Fraction of Positives |
|---|---|
| `0.332` | `0.200` |
| `0.497` | `0.481` |
| `0.708` | `0.875` |