"""SHAP explanations for Layer 1 results (Checklist Priority 4, Items #61-#70).

TreeExplainer on the authoritative Random Forest model.
Clinical feature grouping without diagnostic claims.
Absence of shap degrades gracefully to top_contributors=None, never breaking live scoring.
"""

import os
import joblib
import numpy as np
import pandas as pd

_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(_SERVICES_DIR)))
ARTIFACT = os.environ.get(
    "PARKINTRACE_RF_ARTIFACT",
    os.path.join(_REPO_ROOT, "functions", "models", "experiments", "rf", "model_full.joblib"))
HARMONIZED_CSV = os.environ.get(
    "PARKINTRACE_HARMONIZED_CSV",
    os.path.join(_REPO_ROOT, "functions", "data", "harmonized", "harmonized_sessions.csv"))

N_BACKGROUND = 100
TOP_K = 3

FEATURE_METADATA = {
    "ht_mean": {
        "category": "speed_and_hold",
        "human_name": "Hold Time (Average)",
        "high": "Key presses were held longer than typical",
        "low": "Key presses were held shorter than typical",
    },
    "ht_std": {
        "category": "rhythm_and_steadiness",
        "human_name": "Hold Time Variability",
        "high": "Key hold duration was more variable than typical",
        "low": "Key hold duration was steadier than typical",
    },
    "ft_mean": {
        "category": "hesitation_and_transitions",
        "human_name": "Flight Time (Transition Delay)",
        "high": "Transitions between keys were slower than typical",
        "low": "Transitions between keys were quicker than typical",
    },
    "ft_std": {
        "category": "rhythm_and_steadiness",
        "human_name": "Flight Time Variability",
        "high": "Transition timing between keys was more variable than typical",
        "low": "Transition timing between keys was steadier than typical",
    },
    "ikl_mean": {
        "category": "speed_and_hold",
        "human_name": "Inter-Key Latency (Overall Pace)",
        "high": "Overall typing pace was slower than typical",
        "low": "Overall typing pace was faster than typical",
    },
    "ikl_std": {
        "category": "rhythm_and_steadiness",
        "human_name": "Rhythm Variability",
        "high": "Typing rhythm had greater variability than typical",
        "low": "Typing rhythm was more consistent than typical",
    },
    "left_ht_mean": {
        "category": "lateral_asymmetry",
        "human_name": "Left-Hand Hold Duration",
        "high": "Left-hand key presses were held longer than typical",
        "low": "Left-hand key presses were held shorter than typical",
    },
    "right_ht_mean": {
        "category": "lateral_asymmetry",
        "human_name": "Right-Hand Hold Duration",
        "high": "Right-hand key presses were held longer than typical",
        "low": "Right-hand key presses were held shorter than typical",
    },
    "hand_asymmetry": {
        "category": "lateral_asymmetry",
        "human_name": "Left/Right Hand Asymmetry",
        "high": "Greater timing asymmetry between left and right hands than typical",
        "low": "More balanced left/right hand timing than typical",
    },
    "pause_frequency": {
        "category": "hesitation_and_transitions",
        "human_name": "Pause Frequency",
        "high": "Frequency of pauses (>500ms) was higher than typical",
        "low": "Frequency of pauses was lower than typical",
    },
    "typing_speed": {
        "category": "speed_and_hold",
        "human_name": "Typing Speed (Keys/sec)",
        "high": "Typing speed was faster than typical",
        "low": "Typing speed was slower than typical",
    },
    "session_consistency": {
        "category": "rhythm_and_steadiness",
        "human_name": "Rhythmic Consistency Ratio",
        "high": "Typing pace was less regular than typical",
        "low": "Typing pace was more regular than typical",
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

        if os.path.exists(HARMONIZED_CSV):
            frame = pd.read_csv(HARMONIZED_CSV)
            background = frame[features].dropna().sample(
                n=min(N_BACKGROUND, len(frame)), random_state=42)
        else:
            background = pd.DataFrame([[0.0] * len(features)], columns=features)

        try:
            import shap
        except ImportError as exc:
            raise ImportError(f"shap library not available: {exc}") from exc

        tree_model = artifact.get("base_model", artifact["model"])
        explainer = shap.TreeExplainer(tree_model, data=background)
        _bundle = {
            "model": tree_model,
            "features": features,
            "background": background,
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
    except Exception as exc:
        # Non-fatal: degradation mode
        return []

    try:
        row = pd.DataFrame(
            [[float(session_features[name]) for name in bundle["features"]]],
            columns=bundle["features"])
        values = np.asarray(bundle["explainer"].shap_values(row))
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
            actual = float(row[name].iloc[0])
            high_side = actual >= typical
            meta = FEATURE_METADATA.get(name, {
                "category": "general",
                "human_name": name,
                "high": f"{name} was higher than typical",
                "low": f"{name} was lower than typical",
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
