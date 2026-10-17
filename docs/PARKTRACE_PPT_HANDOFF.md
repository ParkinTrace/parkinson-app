# ParkinTrace: Final Project Comprehensive Technical Report & PPT Handoff Document

> **Project Name**: ParkinTrace (also referenced as ParkTrace)  
> **Academic Degree**: Bachelor of Technology / Bachelor of Engineering — Final Year Capstone Project  
> **Project Version**: `2.1.0-clinical` (Clinical Longitudinal Edition)  
> **Evaluation Period**: Final College Project Evaluation & Presentation  
> **Clinical Governance Notice**: *Academic Research Aid — Not an Autonomous Medical Diagnostic Device. Objective digital biomarker analysis for longitudinal motor-pattern tracking.*

---

## 1. Executive Summary

### 1.1 Project Title
**ParkinTrace: A Two-Layer Keystroke-Dynamics Digital Biomarker System for Parkinson's Disease Motor-Pattern Screening and Longitudinal Tracking.**

### 1.2 Problem Being Addressed
Parkinson’s Disease (PD) is the second most common neurodegenerative disorder globally, characterized pathologically by progressive loss of dopaminergic neurons in the substantia nigra. Clinical motor symptoms (resting tremor, bradykinesia, muscle rigidity, and postural instability) are traditionally assessed in clinic via the Unified Parkinson's Disease Rating Scale (MDS-UPDRS). However:
1. **Infrequent & Episodic**: Clinical evaluations occur months apart (typically 1–2 annual visits), missing diurnal motor fluctuations, "on/off" medication cycles, and insidious day-to-day progression.
2. **Subjective & Inter-Rater Variability**: Visual motor examination introduces subjective clinical judgment.
3. **Late Stage Identification**: Compensatory neuroplasticity often masks motor degeneration until 50–70% of substantia nigra dopamine neurons are already lost.

### 1.3 Motivation
Computer keyboards are ubiquitous physical interfaces used daily by hundreds of millions of adults. Typing requires millisecond-level motor coordination involving motor cortex activation, basal ganglia timing circuits, and cerebellum fine-tuning. Parkinsonian motor degradation manifests subtly in keyboard timing characteristics (e.g., prolonged key hold times, disrupted inter-key transition rhythms, micro-hesitations, and bilateral hand asymmetries) long before gross tremors become clinically obvious.

### 1.4 Proposed Solution
ParkinTrace introduces a full-stack, decoupled software platform that passively and non-invasively captures natural keystroke timing on standard desktop keyboards. It splits motor evaluation into two independent, validated analytical layers:
* **Layer 1 (Population Reference Screening)**: Evaluates a user’s typing dynamics against a laboratory-verified reference cohort (MIT NeuroQWERTY) using a calibrated Random Forest classifier with TreeSHAP explainability.
* **Layer 2 (Personal Longitudinal Monitoring)**: Establishes a frozen personal baseline (median and median absolute deviation) after 10 qualifying sessions across 5+ days on an anchor physical keyboard. It applies Statistical Process Control (CUSUM and EWMA) to detect true persistent motor drift versus temporary diurnal fatigue, and evaluates motor response before and after clinical treatment adjustments (e.g., Levodopa titration).

### 1.5 Target Users & Intended Use
* **Individuals at Risk or Seeking Self-Monitoring**: Engaging in at-home periodic typing assessments to track fine-motor stability over weeks and months.
* **Clinical Neurologists & Researchers**: Reviewing objective longitudinal motor trend reports, anchor hardware compliance, and pre/post medication shift medians during routine checkups.
* **Intended Boundary**: Desktop/laptop physical keyboards only (membrane, mechanical, scissor switches). Touchscreen mobile devices are out of scope due to fundamentally different motor mechanics (zero key travel).

### 1.6 Major Features Implemented
1. **Zero-Text Keystroke Capture**: Captures high-precision monotonic timing (`pressTimestamp`, `releaseTimestamp`), hand assignment (`left`/`right`), and row index. Raw character identities are dropped immediately from memory client-side.
2. **12-Feature Canonical Biomechanical Extractor**: Measures Hold Time (HT), Flight Time (FT), Inter-Key Latency (IKL), Hand Asymmetry, Pause Frequency, and Session Consistency with 1.5x IQR outlier filtering.
3. **Calibrated Random Forest Screening (Layer 1)**: 200 decision trees benchmarked on MIT NeuroQWERTY ($N=116$ sessions, ROC-AUC = 0.8213 with candidate `ht_cv`).
4. **Local Feature Attribution (TreeSHAP)**: Explains the top 3 contributing factors in neutral, clinically categorized terms (*Speed & Hold*, *Rhythm Steadiness*, *Lateral Asymmetry*, *Hesitations*).
5. **Frozen Personal Baseline Engine (Layer 2)**: Establishes individual reference intervals without data leakage, requiring $\ge 10$ sessions across $\ge 5$ distinct days.
6. **Statistical Process Control (SPC)**: Deploys cumulative sum (CUSUM, threshold 4.0, slack 0.5) and exponential weighted moving average (EWMA, $\alpha=0.3$) for robust change-point detection.
7. **Clinical Treatment Timeline**: Logs clinician-directed adjustments (`medication_change`, `dosage_adjustment`) and computes pre vs. post median shifts with robust percentage delta metrics.
8. **Clinician Longitudinal Summary Modal**: Printable, exportable clinical summary report with compliance tracking and non-diagnostic disclaimers.
9. **Interactive Evaluation Profile**: Instant evaluation toggle loading a 12-session, 14-day longitudinal dataset with Levodopa titration analysis for viva presentation.

### 1.7 Current Implementation Status
* **Frontend**: Next.js 16 (React 19, Tailwind CSS 4, Recharts, Zustand) — **100% Implemented & Verified** (15 Vitest tests pass).
* **Backend API**: FastAPI (Python 3.10/3.14, Uvicorn, Pydantic v2, Scikit-learn 1.6.1) — **100% Implemented & Verified** (46 Pytest tests pass).
* **Database & Auth**: PostgreSQL 15 via Supabase with Row-Level Security (RLS) across 5 relational tables — **Implemented & Tested**.
* **Machine Learning**: Frozen Random Forest model (`model_full.joblib`, 2.03 MB) and standard scaler (`live_scaler.json`) — **Loaded & Audited**.

---

## 2. Complete Application Workflow

```
[ User Opens Web App ] (src/app/page.tsx, /test)
        │
        ▼
[ Typing Assessment Initiated ] 
  - Standard prompt text presented (30s / 50 keystroke minimum)
  - DOM Event Listener: keydown & keyup on window
        │
        ▼
[ High-Precision Keystroke Capture ] (src/hooks/useTypingCapture.ts)
  - Clock: DOM High-Resolution Timestamp (performance.now() basis in ms)
  - Key filtering: repeats & control keys dropped
  - Key mapping: character code mapped to 'left'/'right' hand & keyboard row
  - PRIVACY FIREWALL: Character identity (letter/symbol) dropped immediately
        │
        ▼
[ Session Completion & Client Feature Extraction ] (src/lib/features.ts)
  - Hold times (HT = release - press)
  - Flight times (FT = next_press - release)
  - Inter-key latencies (IKL = next_press - press)
  - 1.5x IQR outlier filtering and pause detection (>500 ms)
        │
        ▼
[ REST API Transmission ] (POST /api/v1/analysis/session)
  - Transport: HTTPS JSON payload adhering to Pydantic SessionIngest schema
  - Validates: duration >= 30s, keystroke_count >= 50, device_id
        │
        ▼
[ FastAPI Analytics Engine Orchestration ] (backend/app/services/pipeline.py)
  - Extracts/validates server-side 12 canonical features
  - Verifies device consistency against baseline hardware
        │
 ┌──────┴──────────────────────────────────────────────────────┐
 │                                                             │
 ▼                                                             ▼
[ Layer 1: Population Screening ]           [ Layer 2: Personal Monitoring ]
(app/services/layer1_screening.py)          (app/services/layer2_drift.py)
 - Features normalized via live_scaler.json  - Checks baseline status:
 - Inference: RandomForestClassifier           * If <10 sessions: Status "collecting"
 - Prediction calibrated into bands:           * If >=10 sessions: CUSUM + EWMA drift
   * Normal (< 0.40)                         - Detects drifting features & trend
   * Watch (0.40 - 0.70)                     - Isolation Forest personal anomaly run
   * Attention (>= 0.70)                                       │
 - TreeSHAP Feature Attribution (explain.py)                   │
   * Top 3 contributors extracted                              │
   * Grouped into clinical categories                          │
 └──────┬──────────────────────────────────────────────────────┘
        │
        ▼
[ Database Persistence ] (Supabase PostgreSQL via Supabase RLS)
  - Table 'sessions': UUID, user_id, timestamps, device_id, quality_flags
  - Table 'session_metrics': features, layer1_result, layer2_result, series
        │
        ▼
[ Frontend Visualization & Insights ] (src/app/layer1, src/app/layer2)
  - Recharts: Motor stability radar, feature comparisons, longitudinal trends
  - SHAP attribution cards with neutral non-alarmist descriptions
  - Clinician summary modal with pre/post treatment delta indicators
```

---

## 3. Technology Stack & System Architecture Rationale

| Tier | Technology | Version | Theoretical Rationale & Why Chosen |
|---|---|---|---|
| **Frontend Framework** | Next.js (App Router, Turbopack) | `16.0.0` (React 19) | Server/Client hybrid rendering. Chosen because it provides fast initial hydration and executes the high-precision browser clock (`performance.now()`) with sub-millisecond accuracy. |
| **Styling & Design System** | Tailwind CSS | `4.0.0` | Utility-first clinical design tokens. Chosen for responsive healthcare card layouts, status badges, and rapid dark/light mode switching. |
| **Data Visualization** | Recharts | `2.15.1` | Declarative React charting. Chosen for interactive time-series trend curves, baseline reference intervals, and feature comparison bar charts. |
| **Backend API** | FastAPI | `0.115.8` (Uvicorn ASGI) | High-performance asynchronous REST API. Chosen for native Pydantic v2 runtime validation and direct integration with scientific Python ML packages. |
| **Machine Learning Core** | Scikit-learn | `1.6.1` | Random Forest ensemble, StandardScaler, StratifiedGroupKFold. Chosen for strong tabular performance without deep learning overfitting on small cohorts. |
| **Explainable AI (XAI)** | SHAP | `0.46.0` | TreeExplainer for additive Shapley attributions. Chosen because it computes exact local feature importance in low latency ($<20\text{ ms}$). |
| **Cloud Database** | PostgreSQL via Supabase | `15.x` with RLS | Relational database with Row-Level Security. Chosen because PostgreSQL enforces cryptographic patient isolation (`auth.uid() = user_id`) across all tables. |
| **Testing Suite** | Pytest, Vitest, Playwright | `8.3.4`, `3.2.7`, `1.50` | 46 backend tests, 15 frontend tests, and 13 browser E2E tests validating 100% end-to-end functionality. |

---

## 4. Dataset Investigation & Forensic Audit

### 4.1 Tappy Dataset (Passive Monthly Logs) — Audited & Excluded
* **Cohort**: 212 subjects, 552 monthly aggregated records from home computers.
* **Audit Finding**: Audit discovered 8 corrupted records with negative timing values (down to -111s) due to buffer wraps in the original logging software.
* **Monthly Averaging Defect**: Averaging millions of keystrokes over an entire month washes out fine resting tremors, hesitations, and motor fluctuations.
* **Result**: Produced chance-level accuracy (ROC-AUC = 0.5048), underperforming a simple majority-class dummy baseline (67.8% vs. 76.5%). **Quarantined and excluded from production.**

### 4.2 MIT NeuroQWERTY Dataset (Controlled Transcription) — Selected Reference
* **Cohort**: 85 subjects (42 PD, 43 Controls), 116 sessions on standard desktop keyboards.
* **Protocol**: Real-time continuous transcription with verified ground truth (51.7% PD prevalence).
* **Result**: High discriminative signal (**0.8213 ROC-AUC**, **75.0% Accuracy vs. 51.7% dummy baseline**). **Selected as the primary reference model.**

---

## 5. Biomechanical Feature Engineering (12 Features)

1. **`ht_mean` (Hold Time Average)**: Duration a key remains depressed. Captures finger bradykinesia during key release.
2. **`ht_std` (Hold Time Variability)**: Key hold duration standard deviation. Reflects rigidity and motor fluctuation.
3. **`ft_mean` (Flight Time Average)**: Transition duration between releasing one key and pressing the next. Measures movement coordination.
4. **`ft_std` (Flight Time Variability)**: Standard deviation of transition delays across the keyboard.
5. **`ikl_mean` (Inter-Key Latency Average)**: Overall typing cadence ($\text{HT} + \text{FT}$).
6. **`ikl_std` (Inter-Key Latency Variability)**: Cadence irregularity reflecting basal ganglia timing deficits.
7. **`left_ht_mean`**: Left-hand specific hold duration.
8. **`right_ht_mean`**: Right-hand specific hold duration.
9. **`hand_asymmetry`**: Bilateral discrepancy $\lvert \overline{\text{HT}}_L - \overline{\text{HT}}_R \rvert / \max(\overline{\text{HT}}_L, \overline{\text{HT}}_R)$. Detects unilateral disease onset.
10. **`pause_frequency`**: Pauses $> 500\text{ ms}$ per minute. Measures motor hesitation and micro-freezes.
11. **`typing_speed`**: Keystrokes per second. Global motor tempo.
12. **`session_consistency`**: Ratio $\text{ikl\_std} / \text{ikl\_mean}$. Measures normalized rhythm variation.
* **`ht_cv` (Candidate Feature)**: Hold-time coefficient of variation ($\text{ht\_std} / \text{ht\_mean}$). Boosts ROC-AUC by **+2.02 pp** in research benchmarks.
