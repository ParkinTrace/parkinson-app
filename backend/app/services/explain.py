"""SHAP explanations for Layer 1 results (Checklist Priority 4, Items #61-#70).

TreeExplainer on the authoritative Random Forest model.
Clinical feature grouping without diagnostic claims.
Absence of shap degrades gracefully to top_contributors=None, never breaking live scoring.
"""

import json
import os
import joblib
import numpy as np
import pandas as pd

_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
_APP_DIR = os.path.dirname(_SERVICES_DIR)
_REPO_ROOT = os.path.dirname(os.path.dirname(_SERVICES_DIR))

LOCAL_ARTIFACT = os.path.join(_APP_DIR, "artifacts", "model_full.joblib")
LOCAL_SCALER = os.path.join(_APP_DIR, "artifacts", "live_scaler.json")
LOCAL_CSV = os.path.join(_APP_DIR, "artifacts", "harmonized_sessions_cleaned.csv")

LEGACY_ARTIFACT = os.path.join(
    _REPO_ROOT, "functions", "models", "experiments", "rf", "model_full.joblib")
LEGACY_SCALER = os.path.join(
    _REPO_ROOT, "functions", "models", "experiments", "rf", "live_scaler.json")
LEGACY_CSV = os.path.join(
    _REPO_ROOT, "functions", "data", "harmonized", "harmonized_sessions_cleaned.csv" if os.path.exists(
        os.path.join(_REPO_ROOT, "functions", "data", "harmonized", "harmonized_sessions_cleaned.csv")
    ) else os.path.join(_REPO_ROOT, "functions", "data", "harmonized", "harmonized_sessions.csv")
)

DEFAULT_ARTIFACT = LOCAL_ARTIFACT if os.path.exists(LOCAL_ARTIFACT) else LEGACY_ARTIFACT
DEFAULT_SCALER = LOCAL_SCALER if os.path.exists(LOCAL_SCALER) else LEGACY_SCALER
DEFAULT_CSV = LOCAL_CSV if os.path.exists(LOCAL_CSV) else LEGACY_CSV

ARTIFACT = os.environ.get("PARKINTRACE_RF_ARTIFACT", DEFAULT_ARTIFACT)
LIVE_SCALER = os.environ.get("PARKINTRACE_RF_SCALER", DEFAULT_SCALER)
HARMONIZED_CSV = os.environ.get("PARKINTRACE_HARMONIZED_CSV", DEFAULT_CSV)

N_BACKGROUND = 100
TOP_K = 3

FEATURE_METADATA = {
    "ht_mean": {
        "category": "speed_and_hold",
        "human_name": "Hold Time (Average)",
        "high": "Key presses were held longer than reference median",
        "low": "Key presses were held shorter than reference median",
    },
    "ht_std": {
        "category": "rhythm_and_steadiness",
        "human_name": "Hold Time Variability",
        "high": "Key hold duration had higher variability than reference median",
        "low": "Key hold duration had lower variability than reference median",
    },
    "ft_mean": {
        "category": "hesitation_and_transitions",
        "human_name": "Flight Time (Transition Delay)",
        "high": "Transitions between keys were longer than reference median",
        "low": "Transitions between keys were shorter than reference median",
    },
    "ft_std": {
        "category": "rhythm_and_steadiness",
        "human_name": "Flight Time Variability",
        "high": "Transition timing had higher variability than reference median",
        "low": "Transition timing had lower variability than reference median",
    },
    "ikl_mean": {
        "category": "speed_and_hold",
        "human_name": "Inter-Key Latency (Overall Pace)",
        "high": "Inter-key latency was longer than reference median",
        "low": "Inter-key latency was shorter than reference median",
    },
    "ikl_std": {
        "category": "rhythm_and_steadiness",
        "human_name": "Rhythm Variability",
        "high": "Typing rhythm had higher variability than reference median",
        "low": "Typing rhythm had lower variability than reference median",
    },
    "left_ht_mean": {
        "category": "lateral_asymmetry",
        "human_name": "Left-Hand Hold Duration",
        "high": "Left-hand key presses were held longer than reference median",
        "low": "Left-hand key presses were held shorter than reference median",
    },
    "right_ht_mean": {
        "category": "lateral_asymmetry",
        "human_name": "Right-Hand Hold Duration",
        "high": "Right-hand key presses were held longer than reference median",
        "low": "Right-hand key presses were held shorter than reference median",
    },
    "hand_asymmetry": {
        "category": "lateral_asymmetry",
        "human_name": "Left/Right Hand Asymmetry",
        "high": "Hand hold asymmetry was greater than reference median",
        "low": "Hand hold asymmetry was lower than reference median",
    },
    "pause_frequency": {
        "category": "hesitation_and_transitions",
        "human_name": "Pause Frequency",
        "high": "Pause frequency (>500ms) was higher than reference median",
        "low": "Pause frequency (>500ms) was lower than reference median",
    },
    "typing_speed": {
        "category": "speed_and_hold",
        "human_name": "Typing Speed (Keys/sec)",
        "high": "Typing speed was faster than reference median",
        "low": "Typing speed was slower than reference median",
    },
    "session_consistency": {
        "category": "rhythm_and_steadiness",
        "human_name": "Rhythmic Variation Ratio",
        "high": "Rhythm variation ratio was higher than reference median",
        "low": "Rhythm variation ratio was lower than reference median",
    },
}

_bundle = None

def _load():
    global _bundle
    if _bundle is None:
        if not os.path.exists(ARTIFACT):
            raise FileNotFoundError(f"Model artifact not found for explainability: {ARTIFACT}")

        artifact = joblib.load(ARTIFACT)
        features = artifact["features"]

        if os.path.exists(LIVE_SCALER):
            with open(LIVE_SCALER, "r", encoding="utf-8") as fh:
                scaler_info = json.load(fh)
            mean = np.array(scaler_info["mean_"], dtype=float)
            scale = np.array(scaler_info["scale_"], dtype=float)
        else:
            mean = np.zeros(len(features), dtype=float)
            scale = np.ones(len(features), dtype=float)

        if os.path.exists(HARMONIZED_CSV):
            frame = pd.read_csv(HARMONIZED_CSV)
            if "dataset_source" in frame.columns:
                ref_frame = frame[frame["dataset_source"] == "neuroqwerty"]
                if len(ref_frame) > 0:
                    frame = ref_frame
            background = frame[features].dropna().sample(
                n=min(N_BACKGROUND, len(frame)), random_state=42)
        else:
            # No reference cohort available. A zero background would make
            # every "reference median" 0 and label every feature as "higher
            # than reference median" — misleading text. Degrade to no
            # explanations instead; Layer 1 scoring is unaffected.
            raise FileNotFoundError(
                "Reference cohort CSV not found for SHAP background: "
                f"{HARMONIZED_CSV}")

        try:
            import shap
        except ImportError as exc:
            raise ImportError(f"shap library not available: {exc}") from exc

        tree_model = artifact.get("base_model", artifact["model"])
        bg_scaled = pd.DataFrame(
            (background.values - mean) / scale,
            columns=features
        )
        explainer = shap.TreeExplainer(tree_model, data=bg_scaled)
        _bundle = {
            "model": tree_model,
            "features": features,
            "background": background,
            "mean": mean,
            "scale": scale,
            "explainer": explainer
        }
    return _bundle

def explain_session(session_features: dict, top_k: int = TOP_K) -> list:
    """Computes top contributing features using SHAP TreeExplainer.
    
    Returns structured, clinically categorized feature contributions with neutral language.
    Degrades gracefully if SHAP or input data is incomplete.
    """
    try:
        bundle = _load()
    except Exception:
        # Non-fatal: degradation mode
        return []

    try:
        row_raw = pd.DataFrame(
            [[float(session_features[name]) for name in bundle["features"]]],
            columns=bundle["features"])
        if not np.all(np.isfinite(row_raw.values)):
            return []
        row_scaled = pd.DataFrame(
            (row_raw.values - bundle["mean"]) / bundle["scale"],
            columns=bundle["features"])
        values = np.asarray(bundle["explainer"].shap_values(row_scaled))
        if values.ndim == 3:
            # Multi-class or binary shape (samples, features, classes) -> take positive class (PD=1)
            values = values[0, :, 1]
        elif values.ndim == 2 and values.shape[1] == 2:
            values = values[:, 1]
        else:
            values = values.reshape(-1)

        contributions = dict(zip(bundle["features"], values))
        ranked = sorted(contributions.items(), key=lambda kv: abs(kv[1]), reverse=True)[:top_k]

        background = bundle["background"]
        out = []
        for name, contribution in ranked:
            typical = float(background[name].median())
            actual = float(row_raw[name].iloc[0])
            high_side = actual >= typical
            meta = FEATURE_METADATA.get(name, {
                "category": "general",
                "human_name": name,
                "high": f"{name} was higher than reference median",
                "low": f"{name} was lower than reference median",
            })

            text_desc = meta["high"] if high_side else meta["low"]
            out.append({
                "feature": name,
                "humanName": meta["human_name"],
                "category": meta["category"],
                "contribution": float(round(contribution, 4)),
                "impact": "increased_risk_score" if contribution > 0 else "decreased_risk_score",
                "direction": "above_typical" if high_side else "below_typical",
                "text": text_desc,
            })
        return out
    except Exception:
        return []
