# ParkTrace Feature Engineering & Ablation Summary (Checklist Priority 2)

Evaluation methodology: **Stratified Group 5-Fold Cross-Validation** on `subject_id`.
Ablation testing of 7 candidate biomechanical features added to the 12 baseline features.

## 1. Candidate Features Defined

| Candidate Feature | Formula / Concept | Clinical Rationale |
|---|---|---|
| `ht_ft_ratio` | `ht_mean / ft_mean` | Relative bradykinesia: key-hold prolongation vs transition duration |
| `ht_cv` | `ht_std / ht_mean` | Hold time coefficient of variation: motor steadiness normalized to speed |
| `ft_cv` | `ft_std / ft_mean` | Flight time coefficient of variation: transition hesitation consistency |
| `pause_speed_ratio` | `pause_frequency / typing_speed` | Micro-hesitation density per typing throughput |
| `speed_ht_product` | `typing_speed * (ht_mean/1000)` | Rate-hold coupling |
| `asymmetry_scaled` | `hand_asymmetry * ht_mean` | Amplitude-weighted lateral motor asymmetry |
| `lr_ht_diff_rel` | `abs(left_ht - right_ht) / ht_mean` | Normalized left-right hold discrepancy |

## 2. NeuroQWERTY Controlled Screening Performance

| Model | Feature Set | Features ($k$) | ROC-AUC | Avg Precision | F1-Score | Specificity | Youden J |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **random_forest** (Baseline) | Original 12 | 12 | 0.782 ± 0.063 | 0.845 | 0.710 | 0.718 | 0.626 |
| **random_forest** (Augmented) | + All 7 Candidates | 19 | 0.780 ± 0.058 | 0.841 | 0.706 | 0.736 | 0.658 |
| **xgboost** (Baseline) | Original 12 | 12 | 0.732 ± 0.090 | 0.814 | 0.711 | 0.714 | 0.533 |
| **xgboost** (Augmented) | + All 7 Candidates | 19 | 0.745 ± 0.058 | 0.820 | 0.697 | 0.683 | 0.573 |
| **logistic_regression** (Baseline) | Original 12 | 12 | 0.766 ± 0.091 | 0.821 | 0.667 | 0.736 | 0.565 |
| **logistic_regression** (Augmented) | + All 7 Candidates | 19 | 0.846 ± 0.080 | 0.877 | 0.740 | 0.756 | 0.696 |

## 3. Best Performing Individual Feature Additions on NeuroQWERTY (Random Forest)

| Added Feature | ROC-AUC | $\Delta$ vs Base | Avg Precision | Specificity | Impact |
|---|:---:|:---:|:---:|:---:|---|
| `+ht_ft_ratio` | 0.778 | -0.004 | 0.832 | 0.753 | Neutral |
| `+ht_cv` | 0.819 | +0.036 | 0.869 | 0.773 | Improves discrimination |
| `+ft_cv` | 0.769 | -0.014 | 0.834 | 0.736 | Slight degradation |
| `+pause_speed_ratio` | 0.790 | +0.007 | 0.845 | 0.736 | Improves discrimination |
| `+speed_ht_product` | 0.766 | -0.017 | 0.825 | 0.735 | Slight degradation |
| `+asymmetry_scaled` | 0.771 | -0.011 | 0.833 | 0.715 | Slight degradation |
| `+lr_ht_diff_rel` | 0.776 | -0.006 | 0.839 | 0.717 | Slight degradation |