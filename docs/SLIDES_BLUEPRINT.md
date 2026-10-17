# ParkinTrace: Final Presentation Slides Master Blueprint

> **Presentation Type**: Final Year Engineering Capstone Presentation  
> **Project Name**: ParkinTrace — Keystroke-Dynamics Digital Biomarker System for Parkinson's Motor Screening and Longitudinal Tracking  
> **Language Standard**: Simple, clear, professional English.

---

### Slide 1: Title Slide
* **Title**: ParkinTrace: Keystroke-Dynamics Digital Biomarker System for Parkinson's Motor-Pattern Screening and Longitudinal Tracking
* **Subtitle**: A Two-Layer Computational System for Fine-Motor Assessment
* **Key Bullet Points**:
  * Final Year Engineering Capstone Project
  * Objective fine-motor tracking using everyday physical desktop computer keyboards
  * Two distinct analytical engines: Population Reference Screening (Layer 1) & Personal Longitudinal Tracking (Layer 2)
  * Assistive research tool for clinical monitoring — non-diagnostic digital biomarker analysis
* **Visual**: Clean navy blue and white card layout with a subtle keyboard timing waveform graphic.
* **Speaker Notes**: *"Good morning respected faculty members. Today we present ParkinTrace, a computational system that analyzes fine-motor keyboard timing patterns to support early screening and continuous longitudinal tracking of Parkinson's motor changes."*

---

### Slide 2: Clinical Background & Motivation
* **Title**: Background & Clinical Motivation
* **Key Bullet Points**:
  * **The Clinical Gap**: Parkinson's motor symptoms are traditionally checked in clinic only once or twice a year.
  * **Missed Fluctuations**: Infrequent clinic visits cannot capture day-to-day motor changes, fatigue, or medication wear-off.
  * **Late Symptoms**: Patients often lose over 50% of dopamine-producing brain cells before visible resting tremors appear.
  * **Everyday Sensor**: Typing on a standard computer keyboard requires precise millisecond muscle coordination, making it an ideal tool for continuous at-home monitoring.
* **Visual**: Comparison graphic: "Infrequent Annual Clinic Visit" vs. "Continuous Daily At-Home Keystroke Tracking".
* **Speaker Notes**: *"Motor changes develop gradually. Annual hospital checkups miss the day-to-day fluctuations between visits. Because everyday typing requires high-speed brain-to-finger coordination, everyday keyboards give us an objective window into motor health."*

---

### Slide 3: Problem Statement and Project Aim
* **Title**: Problem Statement & Project Aim
* **Problem Statement**:
  * Early fine-motor symptoms—such as finger stiffness (bradykinesia) and uneven rhythm—are subtle and difficult to detect at home.
  * Current clinical evaluations require in-person hospital visits, while wearable smartwatches are expensive and touchscreen phones lack physical key-press depth.
* **Project Aim**:
  * To build an accessible, privacy-first web system that measures physical keyboard timing without storing typed words.
  * To compare a user's typing against verified clinical research norms for early screening (Layer 1).
  * To monitor an individual's personal motor consistency over weeks and months using statistical quality control (Layer 2).
* **Visual**: Two side-by-side callout boxes: Left = "The Problem", Right = "The Aim".
* **Speaker Notes**: *"Our problem is that early motor symptoms are hard to measure at home without specialized medical equipment. Our aim is to create a web application that evaluates keystroke timing against research data and tracks the patient's own progress over time."*

---

### Slide 4: Comparison: Existing Methods vs. ParkinTrace
* **Title**: Comparison: Existing Methods vs. ParkinTrace
* **Key Bullet Points**:
  * **Wearable Devices (Smartwatches)**: Require charging and daily compliance; hard to separate deliberate arm movements from resting tremor.
  * **Smartphone Touchscreens**: Flat glass with zero key travel; measures tap surface area rather than mechanical finger-release speed.
  * **Traditional Keyloggers**: Record typed characters, posing severe privacy and security risks.
  * **The ParkinTrace Approach**:
    * Works on standard physical keyboards with mechanical switch travel.
    * Strips away character identities client-side (zero raw text stored).
    * Separates one-time population screening from long-term personal tracking.
* **Visual**: 4-row comparison table comparing Wearables, Touchscreens, Keyloggers, and ParkinTrace across Sensor Type, Privacy, Hardware Cost, and Ease of Use.
* **Speaker Notes**: *"Unlike touchscreens where fingers slide across flat glass, physical keyboards require pressing down against a spring and releasing. That mechanical release requires active finger muscle control, which is directly affected by Parkinson's."*

---

### Slide 5: System Architecture & Technology Selection Rationale
* **Title**: System Architecture & Technology Selection Rationale
* **Key Bullet Points & Theoretical Rationale**:
  * **Next.js 16 (React 19) — Frontend Framework**:
    * *Theory*: Fast client-server rendering with an ultra-responsive UI.
    * *Why Chosen*: Runs a high-precision monotonic clock (`performance.now()`) to record keystroke timing in sub-milliseconds while immediately dropping typed text.
  * **FastAPI (Python) — Analytics Engine**:
    * *Theory*: Asynchronous API architecture with automatic schema validation (Pydantic v2).
    * *Why Chosen*: Minimal overhead and seamless connection to scientific Python machine learning libraries.
  * **PostgreSQL via Supabase — Relational Database & Security**:
    * *Theory*: Secure relational database with Row-Level Security (RLS) enforcement.
    * *Why Chosen*: Guarantees complete patient data privacy (`auth.uid() = user_id`) so no user can access another patient's motor metrics.
  * **Scikit-Learn & TreeSHAP — Analytics & Explainability**:
    * *Theory*: Decision tree ensembles and game-theoretic feature attribution.
    * *Why Chosen*: Robust performance on tabular timing data without the overfitting risks of deep neural networks.
* **Visual**: Clean three-tier architecture diagram: Browser Client $\rightarrow$ FastAPI Analytics Engine $\rightarrow$ Supabase Database.
* **Speaker Notes**: *"We chose each technology for a specific technical reason: Next.js gives us high-resolution browser event capture, FastAPI connects directly to Python's ML libraries, and Supabase guarantees strict medical-grade row-level security."*

---

### Slide 6: Biomechanical Feature Engineering
* **Title**: Extracting 12 Canonical Biomechanical Motor Features
* **Key Bullet Points**:
  * **Hold Time (HT)**: How long a key is held down. Measures finger slowness during key release (bradykinesia).
  * **Flight Time (FT)**: Transition time between releasing one key and pressing the next. Measures movement coordination.
  * **Inter-Key Latency (IKL)**: Total time elapsed between successive keypresses ($\text{HT} + \text{FT}$). Reflects overall motor tempo.
  * **Bilateral Hand Asymmetry**: Compares left-hand hold times against right-hand hold times. Detects early one-sided motor onset.
  * **Pause Frequency**: Counts pauses longer than 500 ms per minute. Captures motor hesitation and micro-freezes.
  * **Rhythm Consistency**: Ratio of timing variation to average speed ($\text{Std} / \text{Mean}$). Measures typing cadence regularity.
  * **1.5x IQR Outlier Filter**: Automatically filters out pauses caused by phone calls, distractions, or accidental keypresses.
* **Visual**: Diagram showing keypress timing: Key Down $\rightarrow$ Hold Time $\rightarrow$ Key Up $\rightarrow$ Flight Time $\rightarrow$ Next Key Down.
* **Speaker Notes**: *"Instead of reading sentences, our system extracts 12 biomechanical timing features. For instance, hold time measures how quickly a user releases a key, which directly reflects finger bradykinesia."*

---

### Slide 7: Dataset Analysis: Tappy vs. NeuroQWERTY Audit
* **Title**: Dataset Investigation: Why Tappy Failed and NeuroQWERTY Succeeded
* **Card 1 (First - Left): Tappy Keystroke Dataset (Passive Monthly Logs)**:
  * 212 participants, 552 monthly aggregated records from home computers.
  * **Audit Finding**: Audit uncovered 8 corrupted records with negative timing values due to software buffer wraps.
  * **The Monthly Flaw**: Averaging millions of keystrokes across an entire month washes out fine tremors and hesitations.
  * **Performance**: Chance-level accuracy (ROC-AUC = 0.5048), underperforming a basic dummy baseline (67.8% vs. 76.5%). **Result: Quarantined & Excluded.**
* **Card 2 (Second - Right): MIT NeuroQWERTY Dataset (Controlled Transcription)**:
  * 85 participants, 116 controlled typing sessions on standard desktop keyboards.
  * **Protocol**: Real-time continuous typing transcriptions with verified ground truth (51.7% PD prevalence).
  * **Performance**: High discriminative signal (**0.8213 ROC-AUC**, **75.0% Accuracy vs. 51.7% dummy baseline**). **Result: Selected as Primary Reference Cohort.**
* **Visual**: Two side-by-side cards: Left card (Tappy with red warning outline) $\rightarrow$ Right card (NeuroQWERTY with green verified outline).
* **Speaker Notes**: *"We investigated both major public datasets. Our forensic audit showed that Tappy's monthly averages wiped out transient motor signals. NeuroQWERTY, which collected controlled active typing sessions, provided strong, reliable discriminative signal and was chosen as our reference model."*

---

### Slide 8: Layer 1: Population Screening & Explainable AI
* **Title**: Layer 1: Population Screening with Clear Explanations
* **Key Bullet Points**:
  * **The Screening Question**: *"Does this user's typing pattern look similar to the Parkinson's research group or the healthy control group?"*
  * **The Machine Learning Model**: A 200-tree Random Forest classifier trained on the laboratory-verified NeuroQWERTY cohort.
  * **TreeSHAP Explainability in Plain English**:
    * Instead of showing a mysterious black-box risk score, the system calculates which specific typing habits influenced the outcome.
    * Highlights the top 3 contributing factors in simple words:
      1. *Speed & Hold*: Average key-press duration.
      2. *Rhythm Steadiness*: Consistency of the typing tempo.
      3. *Hand Balance*: Left-hand versus right-hand hold duration.
  * **Safe, Responsible Language**: Categorizes results into three non-alarmist bands (*Normal*, *Watch*, *Attention*) with disclaimers that fatigue or arthritis can cause similar changes.
* **Visual**: Clean mock card showing the status badge ("Within Reference"), a balance meter, and 3 plain-English contributor cards.
* **Speaker Notes**: *"Layer 1 compares a single typing test to our reference cohort. Crucially, we use TreeSHAP to explain the result in simple English—for example, showing whether it was hold time or hand balance that influenced the score, rather than giving an unexplained number."*

---

### Slide 9: Layer 2: Personal Longitudinal Monitoring & Statistical Models
* **Title**: Layer 2: Personal Motor Tracking using CUSUM and EWMA
* **Key Bullet Points**:
  * **The Monitoring Question**: *"Has this specific individual's typing changed compared to their own personal baseline?"*
  * **Frozen Personal Baseline**:
    * Builds an individual reference profile after 10 valid sessions across 5 or more days.
    * Calculates the person's own median and variation, creating an individual reference standard that is never corrupted by future decline.
  * **Statistical Process Control Models Explained**:
    * **CUSUM (Cumulative Sum)**:
      * *How it works*: Accumulates small deviations in timing across consecutive sessions.
      * *Why it helps*: Ignores a single bad day (e.g., poor sleep), but triggers an alert if timing slowness persists over 3 or more sessions.
    * **EWMA (Exponentially Weighted Moving Average)**:
      * *How it works*: Gives recent sessions higher weight ($\alpha=0.3$) while factoring in historical trend.
      * *Why it helps*: Smooths out temporary day-to-day noise to show the true direction of motor change (improving, steady, or slowing).
  * **Hardware Guard**: Checks the computer's keyboard ID so switching devices doesn't trigger false alerts.
* **Visual**: Timeline graph showing real user sessions, the personal baseline band, smoothed EWMA trend line, and CUSUM upper control threshold.
* **Speaker Notes**: *"Layer 2 tracks an individual over time. Everyone types at a different natural speed. We use two classical statistical quality control tools: CUSUM adds up sustained changes over multiple days to ignore one-off fatigue, while EWMA smooths the curve to show the genuine long-term trend."*

---

### Slide 10: System Interface & Workflow Walkthrough
* **Title**: System Interface & Assessment Walkthrough
* **Key Bullet Points**:
  * **Step 1: Patient Assessment Screen (`/test`)**:
    * User types a standardized prompt sentence naturally.
    * Live indicators display elapsed time and a valid keystroke counter (minimum 30 seconds and 50 keystrokes).
  * **Step 2: Real-Time Results Screen (`/layer1`)**:
    * Immediately presents the categorical status badge and plain-English movement observations.
  * **Step 3: Longitudinal Tracking Screen (`/layer2`)**:
    * Interactive trend chart displaying Hold Time, Flight Time, and Hand Balance across weeks.
    * Includes an evaluation profile showing a 14-day history with medication tracking.
  * **Step 4: Clinician Summary Report (`Modal`)**:
    * One-click summary sheet displaying testing compliance, anchor hardware verification, and non-diagnostic research notices for doctor visits.
* **Visual**: Clean 4-panel workflow collage showing real application screenshots.
* **Speaker Notes**: *"Here is the user interface. A patient takes a 30-second typing test, receives transparent feedback on their movement patterns, and can view their multi-week trend chart or print a clean summary for their next doctor visit."*

---

### Slide 11: System Verification, Testing & Limitations
* **Title**: Automated Verification & Technical Limitations
* **Key Testing Evidence**:
  * **Backend Test Suite (Pytest)**: **46 of 46 tests passing (100%)** verifying feature extraction math, Random Forest inference, TreeSHAP explainer, and CUSUM drift detection.
  * **Frontend Test Suite (Vitest)**: **15 of 15 tests passing (100%)** verifying client-side timing calculations, 1.5x IQR outlier rejection, and session duration gates.
  * **End-to-End Browser Tests (Playwright)**: 13 automated browser tests validating complete user registration, typing capture, and dashboard rendering.
  * **Health-Check API (`/api/v1/health`)**: Fail-closed backend monitoring verifying that model weights and scalers are loaded correctly before serving requests.
* **Honest Technical Limitations**:
  * **Physical Keyboards Only**: Validated on physical switches; not suitable for smartphones or touchscreen keyboards.
  * **Reference Cohort Size**: The reference dataset has 85 participants; larger multi-center cohorts are needed before clinical hospital use.
  * **Motor Confounders**: Arthritis, wrist injuries, fatigue, or cold fingers can alter typing speed and must be considered by clinicians.
* **Visual**: Split slide: Left side showing the green automated test pass summaries; Right side showing honest limitation callout boxes.
* **Speaker Notes**: *"We verified every component through automated testing—all 46 backend tests and 15 frontend tests pass cleanly. We are also upfront about limitations: the system works only on physical keyboards and is an assistive research tool, not a diagnostic replacement for a doctor."*

---

### Slide 12: Conclusion
* **Title**: Conclusion
* **Key Bullet Points**:
  * Successfully built and validated **ParkinTrace**, an objective, privacy-first software system for motor-pattern screening and longitudinal monitoring.
  * **Key Scientific Contribution**: Showed that physical desktop typing provides strong discriminative signal (**0.8213 ROC-AUC**, **75% accuracy**), whereas monthly passive logs (Tappy) destroy the signal through over-averaging.
  * **Key Engineering Contribution**: Decoupled one-time population screening (Layer 1 + TreeSHAP) from long-term personal tracking (Layer 2 + CUSUM/EWMA) to prevent one-off fatigue from triggering false alerts.
  * **Privacy Guarantee**: Proved that high-precision motor biomarker analysis can be achieved with zero raw typed text stored or transmitted.
* **Visual**: Summary graphic connecting: High-Precision Keystroke Capture $\rightarrow$ Two-Layer Analysis $\rightarrow$ Objective Clinical Support.
* **Speaker Notes**: *"In conclusion, ParkinTrace proves that everyday computer keyboards can act as passive, objective digital biomarker sensors. By combining machine learning screening with statistical process control, we provide doctors and patients with valuable motor data between clinical visits."*

---

### Slide 13: Future Scope
* **Title**: Future Scope & Extensions
* **Key Bullet Points**:
  * **Multimodal Biomarker Fusion (Voice + Typing)**: Integrate vocal acoustic analysis (pitch jitter and shimmer) alongside keystroke dynamics for combined motor assessment.
  * **Automated Keyboard Switch Calibration**: Develop calibration profiles for mechanical, membrane, and low-travel chiclet laptop keyboards.
  * **Touchscreen Tapping Tasks for Mobile Devices**: Build alternating two-finger tapping tests specifically optimized for smartphones without relying on text entry.
  * **Clinical Outpatient Pilot Trials**: Deploy in hospital neurology clinics to observe real-world treatment response and medication wear-off cycles.
  * **Production Integration of Advanced Timing Metrics (`ht_cv`)**: Upgrade the production model schema with hold-time coefficient of variation (+2.02 pp accuracy boost).
* **Visual**: Roadmap diagram with 5 milestone cards spanning Multimodal Fusion, Hardware Calibration, Mobile Tapping, Outpatient Trials, and Metric Upgrades.
* **Speaker Notes**: *"Looking forward, our next steps include combining typing with voice analysis, calibrating different keyboard switch types, and piloting the system in hospital outpatient clinics for long-term patient monitoring."*

---

### Slide 14: Thank You & Viva Defense
* **Title**: Thank You
* **Subtitle**: Questions & Discussion
* **Key Information**:
  * **Project**: ParkinTrace — Keystroke-Dynamics Digital Biomarker System
  * **Authors**: Final Year Project Team
  * **Repository**: Open for Academic Evaluation & Clinical Demonstration
  * **Special Thanks**: Project Guide, Department Faculty, and Clinical Reviewers
* **Visual**: Clean closing card with contact info, GitHub repository reference, and open invitation for committee questions.
* **Speaker Notes**: *"Thank you very much for your time and guidance. We are now ready to answer any questions from the panel."*
