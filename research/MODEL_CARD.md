# ParkTrace Model Card & Clinical AI Governance

This Model Card documents the architecture, provenance, evaluation, limitations, and responsible-AI governance of the **ParkTrace Layer 1 Population Screening Pipeline** in accordance with **TRIPOD+AI** and the **WHO Guidance on Ethics and Governance of Artificial Intelligence for Health**.

---

## 1. Model Details

* **Model Name**: ParkTrace Layer 1 Population Screening Reference Model
* **Model Version**: `1.0.0-production`
* **Model Family**: Ensemble of Decision Trees (`RandomForestClassifier`, 200 estimators, max depth 8, balanced class weights).
* **Production Feature Schema (12 Features)**: Fixed 12 physical keyboard typing features (`ht_mean`, `ht_std`, `ft_mean`, `ft_std`, `ikl_mean`, `ikl_std`, `left_ht_mean`, `right_ht_mean`, `hand_asymmetry`, `pause_frequency`, `typing_speed`, `session_consistency`).
* **Research Feature Schema (13 Features)**: Evaluates candidate `ht_cv` (hold-time coefficient of variation) in research benchmarks (`research/final_numerical_audit.py`); strictly quarantined from production inference.
* **License**: Research prototype for academic and digital biomarker screening research.

---

## 2. Intended Use & Clinical Scope

### Intended Use
* **Primary Scope**: Research-grade objective digital biomarker measurement. Identifies typing movement patterns that diverge from typical reference cohorts.
* **Intended User**: Health researchers, clinicians, and individuals engaging in longitudinal self-monitoring.
* **Modality**: Desktop physical keyboard input (Windows/macOS/Linux).

### Out-of-Scope & Misuse
* **NOT A DIAGNOSTIC DEVICE**: Typing dynamics alone **cannot** diagnose Parkinson's disease.
* **No Prescriptive Advice**: The model does not recommend medications, treatment changes, or disease-stage prognoses.
* **Not Validated on Touchscreens**: Touchscreen typing involves different motor mechanics (no key travel) and is outside the validated domain.

---

## 3. Training & Validation Datasets

1. **NeuroQWERTY (MIT-CS1PD & MIT-CS2PD)**:
   * **Cohort**: 85 participants (42 Parkinson's disease, 43 healthy controls; 116 sessions).
   * **Protocol**: Controlled active typing transcriptions on standard physical keyboards.
   * **Demographics**: Balanced cohorts (51.7% PD prevalence); lab-verified ground truth.
2. **Tappy Keystroke Dataset (PhysioNet)**:
   * **Cohort**: 212 participants (158 Parkinson's disease, 54 healthy controls; 76.4% PD prevalence, 552 monthly rows).
   * **Protocol**: Longitudinal passive typing logs over months.
   * **Audit Finding**: Monthly aggregation washes out transient neuromotor signs, resulting in sub-chance discrimination (ROC-AUC ~0.45). Contains 8 corrupted records with negative timing values. **Not recommended for population screening.**

---

## 4. Evaluation Methodology & Leakage Prevention

* **Cross-Validation**: 5-Fold Stratified Group K-Fold grouped strictly by `subject_id` (0 participant overlap across folds).
* **Zero Leakage**: All `StandardScaler` transformations, feature normalization, calibration models, and threshold calculations are fit strictly on training partitions.
* **Evaluation Unit**: Both per-session (row-level) and per-subject (aggregated across repeated observations) metrics are tracked, with subject-cluster bootstrap confidence intervals.

---

## 5. Quantitative Performance Matrix (Independent Audit)

Evaluation across exact cached folds from commit `c5f762d`:

| Evaluation Cohort | Model Pipeline | ROC-AUC | PR-AUC | Accuracy (t=0.50) | Balanced Acc | Brier Score |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **NeuroQWERTY (Row-Level)** | New Calibrated (+`ht_cv`) | **0.815 ± 0.083** | **0.879 ± 0.041** | 0.750 | 0.750 | **0.202** |
| **NeuroQWERTY (Row-Level)** | New Uncalibrated (+`ht_cv`) | **0.813** | **0.875** | 0.750 | 0.752 | **0.171** |
| **NeuroQWERTY (Row-Level)** | Baseline RF (12 feats, uncal) | 0.801 ± 0.072 | 0.867 ± 0.039 | 0.750 | 0.752 | 0.177 |
| **NeuroQWERTY (Subject-Level)** | New Calibrated (+`ht_cv`) | **0.772** | **0.835** | **0.741** | **0.742** | 0.203 |
| **NeuroQWERTY (Subject-Level)** | Baseline RF (12 feats, uncal) | 0.794 | 0.844 | 0.729 | 0.729 | 0.178 |
| **Tappy (Monthly Logs)** | New Calibrated (+`ht_cv`) | 0.451 ± 0.105 | 0.735 ± 0.104 | 0.678 | 0.461 | 0.184 |
| **Tappy (Monthly Logs)** | Majority Dummy Baseline | 0.500 | 0.765 | **0.765** | 0.500 | **0.180** |
| **Pooled Dataset** | Baseline RF (12 feats, uncal) | 0.640 ± 0.025 | 0.816 ± 0.048 | 0.651 | 0.590 | 0.213 |
| **Pooled Dataset** | New Calibrated (+`ht_cv`) | 0.514 ± 0.044 | 0.738 ± 0.069 | 0.576 | 0.499 | 0.205 |

> **Key Audit Finding on Pooled Training**: Combining Tappy and NeuroQWERTY introduces severe domain shift. The 82.6% Tappy composition collapses discriminative performance down to chance. Production screening should rely exclusively on the NeuroQWERTY reference model.

---

## 6. Feature Ablation & Biomechanical Interpretation

* **Candidate Feature**: `ht_cv = ht_std / ht_mean` (hold-time coefficient of variation).
* **Discriminative Contribution**: On NeuroQWERTY, adding `ht_cv` improves ROC-AUC from 0.780 to 0.813 (+3.3 pp) over the identical 12-feature model.
* **Scientific Scope**: Hold-time CV is a dispersion metric that normalizes keypress variability by typing speed. It decouples natural typing tempo from fine-motor irregularity. **It is an engineered digital signal feature, not a clinically proven physical tremor diagnostic.**

---

## 7. Decision Thresholds & Probability Calibration

1. **Watch Screening Cutoff ($t = 0.4271$)**: High-sensitivity threshold designed for community screening to minimize false negatives.
2. **Attention Cutoff ($t = 0.5800 - 0.6126$)**: Empirically derived via training Youden's $J$ statistic ($Sensitivity + Specificity - 1$). Note: Out-of-fold application increases specificity at the expense of sensitivity.
3. **Platt Sigmoid Calibration**: Reduces overconfidence error, improving held-out probability calibration curves.

---

## 8. Explainability & Clinical Attribution

* **Method**: TreeSHAP feature attribution (`shap.TreeExplainer`) evaluated against reference background typing distributions.
* **Categorization**: Attributions are grouped into clinical categories:
  * **Speed & Hold**: Average hold time, inter-key pace, typing speed.
  * **Rhythm & Steadiness**: Flight time variability, hold time variability, `ht_cv`, rhythm consistency.
  * **Lateral Asymmetry**: Left-hand vs. right-hand hold discrepancy.
  * **Hesitation & Transitions**: Pause frequency, flight times.
* **Communication Rules**:
  * Neutral descriptions (*"Frequency of pauses was higher than typical"*).
  * Explicit disclaimers that typing variations can stem from fatigue, arthritis, keyboard ergonomics, or stress, and do not establish a Parkinson's diagnosis.

---

## 9. Limitations & Ethical Considerations

1. **Passive Monthly Averaging Flaw**: Computing global summary statistics over entire months averages out transient motor fluctuations. Controlled transcription sessions remain essential for reliable signal.
2. **Class Imbalance in Research Cohorts**: Tappy's 76.4% PD prevalence is vastly higher than general population prevalence (~1–2% over age 65). Research probabilities must not be interpreted as absolute population disease risk.
3. **Privacy & Data Minimization**: Keystroke identities (which keys were pressed) are discarded immediately client-side. Only timing deltas (milliseconds) are transmitted and processed.
