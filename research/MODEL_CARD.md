# ParkTrace Model Card & Clinical AI Governance

This Model Card documents the architecture, provenance, evaluation, limitations, and responsible-AI governance of the **ParkTrace Layer 1 Population Screening Pipeline** in accordance with **TRIPOD+AI** and the **WHO Guidance on Ethics and Governance of Artificial Intelligence for Health**.

---

## 1. Model Details

* **Model Name**: ParkTrace Layer 1 Population Screening Model
* **Model Version**: `1.1.0-calibrated`
* **Model Family**: Ensemble of Decision Trees (`RandomForestClassifier`, 200 estimators, max depth 8, balanced class weights) + Probability Calibration (`CalibratedClassifierCV`, Sigmoid Platt Scaling).
* **Feature Schema**: 12 canonical physical keyboard typing features (Hold Time, Flight Time, Inter-Key Latency, Lateral Asymmetry, Pause Frequency, Typing Speed, Rhythm Consistency).
* **License**: Research prototype for academic and screening research.

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
   * **Cohort**: 85 participants (42 Parkinson's disease, 43 healthy controls).
   * **Protocol**: Controlled active typing transcriptions on standard physical keyboards.
   * **Demographics**: Balanced cohorts; lab-verified ground truth.
2. **Tappy Keystroke Dataset (PhysioNet)**:
   * **Cohort**: 212 participants (169 Parkinson's disease, 58 healthy controls; 74.4% PD prevalence).
   * **Protocol**: Longitudinal passive typing logs over months.
   * **Exclusions**: Incomplete files (< 2 valid keystrokes) dropped. Zero overlap with NeuroQWERTY.

---

## 4. Evaluation Methodology & Leakage Prevention

* **Cross-Validation**: 5-Fold Stratified Group K-Fold grouped strictly by `subject_id`.
* **Zero Leakage**: Asserted via `assert_no_subject_leakage(train_idx, test_idx, groups)`. No participant ever spans training and evaluation folds.
* **Strict Fold-Internal Scaling**: All `StandardScaler` transformations are fit strictly on training partitions.
* **Calibration Assessment**: Brier Score and reliability diagrams evaluated out-of-fold.

---

## 5. Quantitative Performance Matrix

| Evaluation View | Model | ROC-AUC | Avg Precision | F1-Score | Brier Score | Youden's $J$ |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **NeuroQWERTY** *(Controlled Active)* | Random Forest + `ht_cv` | **0.819 ± 0.055** | **0.869 ± 0.038** | **0.758** | **0.179** | **0.573** |
| **NeuroQWERTY** | Random Forest Baseline | 0.782 ± 0.063 | 0.845 ± 0.046 | 0.710 | 0.187 | 0.506 |
| **NeuroQWERTY** | Logistic Regression | 0.766 ± 0.091 | 0.821 ± 0.094 | 0.667 | 0.196 | 0.433 |
| **NeuroQWERTY** | XGBoost | 0.732 ± 0.090 | 0.814 ± 0.068 | 0.711 | 0.217 | 0.456 |
| **Pooled Dataset** | Random Forest (Calibrated) | 0.595 ± 0.090 | 0.786 ± 0.076 | 0.749 | **0.207** (9.9% gain) | 0.505 |
| **Cross-Domain (Tappy $\rightarrow$ NQ)** | Random Forest | **0.707** | **0.751** | **0.710** | — | — |

---

## 6. Calibrated Decision Thresholds

Rather than arbitrary cutoffs (e.g., 0.4 / 0.7), decision boundaries were empirically calibrated on out-of-fold validation:

1. **Watch Cutoff ($t = 0.4271$)**: High-sensitivity screening threshold ($\ge 85\%$ sensitivity) designed to avoid false negatives in community screening.
2. **Attention Cutoff ($t = 0.5800 - 0.7421$)**: Empirically derived by maximizing Youden's $J$ statistic ($Sensitivity + Specificity - 1$).

---

## 7. Explainability & Clinical Attribution

* **Method**: TreeSHAP feature attribution (`shap.TreeExplainer`) evaluated against 100 representative empirical background typing rows.
* **Categorization**: Attributions are grouped into clinical categories:
  * **Speed & Hold**: Average hold time, inter-key pace, typing speed.
  * **Rhythm & Steadiness**: Flight time variability, hold time variability, rhythm consistency.
  * **Lateral Asymmetry**: Left-hand vs. right-hand hold discrepancy.
  * **Hesitation & Transitions**: Pause frequency, flight times.
* **Communication Rules**:
  * Neutral descriptions (*"Frequency of pauses was higher than typical"*).
  * Clear disclaimers that typing variations can stem from arthritis, fatigue, typing style, or distractions and do not establish a Parkinson's diagnosis.

---

## 8. Limitations & Ethical Considerations

1. **Passive Monthly Averaging Flaw**: As demonstrated in our audit, computing global summary statistics over entire months (Tappy) averages out transient motor fluctuations, reducing discrimination to chance. Controlled or windowed micro-sessions are strongly recommended.
2. **Class Imbalance in Research Cohorts**: Tappy's 74.4% PD prevalence is not representative of the general population (where PD prevalence is ~1–2% over age 65). Research probabilities must not be interpreted as absolute population risk.
3. **Privacy & Data Minimization**: Raw keystroke identities are not retained. Features are derived client-side or in-memory, discarding text content to preserve user privacy.
