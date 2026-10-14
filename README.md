# ParkinTrace — Keystroke-Dynamics Based Parkinson's Screening & Longitudinal Monitoring System

> **Academic Research & Capstone Project** — Version 2.1.0 (Clinical Longitudinal Edition)  
> Submitted in partial fulfillment of degree requirements.  
> This repository is maintained for academic evaluation and clinical demonstration purposes.  
>  
> ⚠️ **Research Aid — Not a Medical Device.** All outputs are objective digital biomarker signals for clinical discussion and longitudinal monitoring, never an autonomous medical diagnosis.

---

## 🛠️ Complete Tech Stack Architecture

The ParkinTrace platform consists of a modern, decoupled three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                 NEXT.JS 16 FRONTEND APPLICATION             │
│  - Framework: Next.js 16 (App Router, Turbopack) & React 19 │
│  - Styling: Tailwind CSS 4 (Custom clinical design tokens)  │
│  - Visualizations: Recharts (Rolling rhythm & time-series)  │
│  - State & Storage: Zustand, LocalStorage Cache Fallback    │
│  - Keystroke Capture: performance.now() high-res clock      │
│  - Client Auth: @supabase/ssr Browser Client                │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    FASTAPI ANALYTICS ENGINE                 │
│  - API Framework: FastAPI (Python 3.10.11), Uvicorn ASGI   │
│  - Validation: Pydantic v2 (Strict millisecond timing schema)│
│  - Core ML: Scikit-learn 1.6.1 (Calibrated Random Forest)   │
│  - Explainable AI: SHAP (TreeExplainer with background ref) │
│  - Longitudinal Engine: CUSUM, EWMA, and Isolation Forest   │
│  - Security: JWT claims validation with IDOR protection     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Supabase Service Role / RLS
┌──────────────────────────────▼──────────────────────────────┐
│                  SUPABASE POSTGRESQL DATABASE               │
│  - Relational Database: PostgreSQL 15 via Supabase Cloud    │
│  - Security: Row-Level Security (RLS) on all 5 tables       │
│  - Authentication: Supabase Auth (JWT bearer verification)  │
│  - Migrations: 0001_core.sql, 0002_grants, 0003_treatment   │
│  - Privacy Protection: Zero raw typed text stored           │
└─────────────────────────────────────────────────────────────┘
```

| Component | Directory | Core Technologies & Libraries |
|---|---|---|
| **Web Client** | `src/`, `public/` | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Recharts, Lucide icons |
| **Machine Learning Backend** | `backend/` | FastAPI, Python 3.10, Scikit-learn 1.6.1, NumPy, SciPy, SHAP, Joblib |
| **Cloud Database & Auth** | `supabase/` | PostgreSQL, Supabase RLS, JWT Auth, Migration schemas |
| **Research & Auditing** | `research/` | Python, Matplotlib, Seaborn, StratifiedGroupKFold, SciPy Stats |
| **Automated Testing** | `tests/`, `e2e/`, `backend/tests/` | Pytest (46 tests), Vitest (15 tests), Playwright (13 browser E2E tests) |

---

## 🚀 Key Modules & Two-Layer Architecture

### 1. Layer 1 — Population Screening Reference Model
* **12 Canonical Features**: Evaluates `ht_mean`, `ht_std`, `ft_mean`, `ft_std`, `ikl_mean`, `ikl_std`, `left_ht_mean`, `right_ht_mean`, `hand_asymmetry`, `pause_frequency`, `typing_speed`, and `session_consistency`.
* **NeuroQWERTY Reference Anchor**: Trained and benchmarked against the lab-validated MIT NeuroQWERTY cohort ($N=116$, **ROC-AUC: 0.8213**, **Accuracy: 75.0%** vs 51.7% dummy baseline).
* **Explainable AI (TreeSHAP)**: Automatically maps feature attributions into human-understandable clinical movement categories (*Speed & Hold*, *Rhythm Steadiness*, *Lateral Asymmetry*, and *Hesitations*).

### 2. Layer 2 — Personal Longitudinal Motor-Pattern Monitoring
* **Frozen Baseline Engine**: Establishes a personalized reference median and MAD interval after collecting 10+ qualifying sessions across 5+ distinct days on an anchor physical keyboard.
* **Statistical Process Control (SPC)**: Deploys **CUSUM** and **EWMA** change-point detection to differentiate temporary diurnal fatigue from genuine, persistent motor degradation.
* **Neuromotor Health Scorecard**: Real-time display of 4 Parkinson's digital biomarkers:
  - **⏱️ Bradykinesia Index**: Hold duration & key release latency.
  - **📈 Rhythm Steadiness**: Cadence coefficient of variation and fine-motor tremor fluctuations.
  - **⚖️ Bilateral Symmetry**: Left-hand vs. right-hand hold duration delta (unilateral onset detection).
  - **⏸️ Motor Hesitation**: Frequency of hesitations exceeding 500 ms (micro-freezes).

### 3. Treatment Timeline & Pre/Post Comparison
* **Clinical Intervention Logging**: Optional, privacy-conscious logging of clinician-directed events (`medication_change`, `dosage_adjustment`, `therapy_start`).
* **Objective Window Comparator**: Calculates pre- vs. post-event medians and percentage shifts (e.g., verifying a -10.4% reduction in hold time following Levodopa titration).

### 4. Clinician Longitudinal Summary Report
* Exportable, printable neurology report with monitoring compliance statistics, anchor hardware verification, persistent drift indicators, and non-diagnostic research governance notices.

### 5. Interactive Demo Mode for Evaluation & Viva
* Built-in **"📊 Demo Profile"** toggle on the Layer 2 dashboard allowing evaluators to immediately preview a 12-session, 14-day clinical dataset with active medication timeline comparisons without requiring days of manual data entry.

---

## 🏃 Local Development Quickstart

### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows (or: source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
pytest -q                   # 46 tests pass
uvicorn app.main:app --port 8000 --reload
```
*Health Check*: Navigate to `http://localhost:8000/api/v1/health` to confirm the Random Forest model and Layer 2 engine are loaded (`status: "ok"`).

### 2. Frontend Setup (Next.js)
```bash
# In the repository root:
npm install
cp .env.example .env.local  # Populate with your Supabase URL, Anon Key, and API URL
npm run dev                 # Starts Next.js on http://localhost:3000
```

### 3. Automated Verification Suites
```bash
npm test                    # Vitest unit test suite (15 passed)
npm run typecheck           # TypeScript compilation (0 errors)
npm run lint                # ESLint static analysis (0 errors)
npx playwright test         # End-to-end browser integration suite
```

---

## 🔒 Security, Privacy & Clinical Governance

* **Zero Content Retention**: In accordance with HIPAA & GDPR research guidelines, **typed text content is immediately dropped from memory**. Only anonymized millisecond timestamps and hand coordinates are processed.
* **Row-Level Security (RLS)**: Enforced via Supabase PostgreSQL policies (`auth.uid() = user_id`) across all tables.
* **IDOR Protection**: All FastAPI endpoints verify cryptographic JWT subject claims (`sub == user_id`) to prevent cross-patient data access.
* **TRIPOD+AI & WHO Compliance**: Output surfaces are guarded with transparent AI disclaimers, avoiding binary "Positive/Negative" claims in favor of categorical motor stability intervals.

---

## 👥 Authors & Academic Context

Developed as a Final Year Capstone Project in Biomedical Engineering / Computer Science.

* **Project Version**: `2.1.0-clinical`  
* **Release Branch**: `master` (synchronized with `main`)  
* **Academic Evaluation License**: Shared exclusively for academic evaluation, clinical review, and demonstration.
