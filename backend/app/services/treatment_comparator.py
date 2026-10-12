"""Treatment event comparison and clinician longitudinal report compiler.

Adheres strictly to clinical AI governance:
- Empirical timing comparisons only.
- Explicit non-causality disclaimer (never claims treatment efficacy or failure).
- Robust median-based statistics resistant to single-session outliers.
"""

from datetime import datetime, timezone
import numpy as np


def _normalize_dt(val) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        dt = val
    else:
        try:
            dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        except Exception:
            return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


HUMAN_FEATURE_NAMES = {
    "ht_mean": "Hold Time (Average)",
    "ht_std": "Hold Time Variability",
    "ft_mean": "Flight Time (Transition Delay)",
    "ft_std": "Flight Time Variability",
    "ikl_mean": "Inter-Key Latency (Overall Pace)",
    "ikl_std": "Rhythm Variability",
    "typing_speed": "Typing Speed (Keys/sec)",
    "pause_frequency": "Pause Frequency (>500ms)",
    "session_consistency": "Rhythm Consistency Ratio",
    "hand_asymmetry": "Hand Hold Asymmetry",
    "left_ht_mean": "Left-Hand Hold Duration",
    "right_ht_mean": "Right-Hand Hold Duration",
}

CORE_LONGITUDINAL_FEATURES = [
    "ht_mean", "ft_mean", "ikl_mean", "typing_speed",
    "pause_frequency", "session_consistency", "hand_asymmetry"
]


def compare_pre_post_event(
    event: dict,
    sessions_with_metrics: list[dict]
) -> dict:
    """Compare eligible sessions before and after a treatment event date.

    Never infers medication efficacy. Outputs empirical differences with disclaimers.
    """
    event_date_str = str(event.get("event_date", event.get("eventDate", "")))
    event_dt = _normalize_dt(event_date_str) or datetime.now(timezone.utc).replace(tzinfo=None)

    pre_sessions = []
    post_sessions = []

    for item in sessions_with_metrics:
        session = item.get("session", item)
        metrics = item.get("metrics", item.get("features", {}))
        feats = metrics.get("features", metrics) if isinstance(metrics, dict) else {}
        if not feats:
            continue

        raw_ts = session.get("started_at", session.get("startedAt", session.get("created_at")))
        s_dt = _normalize_dt(raw_ts)
        if s_dt is None:
            continue

        if s_dt < event_dt:
            pre_sessions.append((s_dt, feats))
        else:
            post_sessions.append((s_dt, feats))

    pre_sessions.sort(key=lambda x: x[0])
    post_sessions.sort(key=lambda x: x[0])

    feature_comparisons = []
    for feat in CORE_LONGITUDINAL_FEATURES:
        pre_vals = [s[1][feat] for s in pre_sessions if feat in s[1] and s[1][feat] is not None]
        post_vals = [s[1][feat] for s in post_sessions if feat in s[1] and s[1][feat] is not None]

        pre_med = float(np.median(pre_vals)) if pre_vals else None
        post_med = float(np.median(post_vals)) if post_vals else None

        diff = None
        pct_change = None
        if pre_med is not None and post_med is not None:
            diff = round(post_med - pre_med, 3)
            if abs(pre_med) > 1e-6:
                pct_change = round(((post_med - pre_med) / pre_med) * 100, 1)

        feature_comparisons.append({
            "feature": feat,
            "human_name": HUMAN_FEATURE_NAMES.get(feat, feat),
            "pre_median": pre_med,
            "post_median": post_med,
            "difference": diff,
            "percent_change": pct_change,
        })

    pre_range = (pre_sessions[0][0].isoformat(), pre_sessions[-1][0].isoformat()) if pre_sessions else None
    post_range = (post_sessions[0][0].isoformat(), post_sessions[-1][0].isoformat()) if post_sessions else None

    return {
        "event_id": str(event.get("id", "")),
        "event_date": event_date_str,
        "event_type": event.get("event_type", event.get("eventType", "medication_change")),
        "description": event.get("description", ""),
        "pre_session_count": len(pre_sessions),
        "post_session_count": len(post_sessions),
        "pre_date_range": pre_range,
        "post_date_range": post_range,
        "feature_comparisons": feature_comparisons,
        "disclaimer": (
            "Observed changes represent empirical keystroke timing differences before and "
            "after the recorded event date. This comparison does NOT establish clinical efficacy, "
            "causality, or treatment response, and must be reviewed alongside clinical examinations."
        ),
    }


def compile_clinician_longitudinal_report(
    user_id: str,
    baseline: dict | None,
    sessions_history: list[dict],
    metrics_history: list[dict],
    treatment_events: list[dict] | None = None,
) -> dict:
    """Compile a structured, clinician-oriented longitudinal monitoring report.

    Provides transparent compliance stats, baseline reference intervals,
    detected drift patterns, and treatment event history for clinical discussion.
    """
    total_sessions = len(sessions_history)
    valid_sessions = [s for s in sessions_history if s.get("valid", True)]
    invalid_sessions = [s for s in sessions_history if not s.get("valid", True)]

    dates = []
    for s in sessions_history:
        ts = s.get("started_at", s.get("created_at"))
        dt_val = _normalize_dt(ts)
        if dt_val:
            dates.append(dt_val)
    dates.sort()

    date_span_days = (dates[-1] - dates[0]).days if len(dates) >= 2 else 0
    distinct_days = len({d.date() for d in dates})

    # Baseline status
    baseline_stats = {}
    baseline_established = False
    anchor_device = None
    if baseline:
        baseline_stats = baseline.get("features", baseline.get("baseline_statistics", {}))
        baseline_established = baseline.get("status") == "established" or "built_date" in baseline
        anchor_device = baseline.get("anchor_device_id")

    # Drift and persistent change summary from recent metrics
    drifting_summary = {}
    recent_metrics = metrics_history[-10:] if metrics_history else []
    for m in recent_metrics:
        l2 = m.get("layer2_result") or m.get("layer2") or {}
        drift_res = l2.get("drift_result") or l2.get("drift") or {}
        signals = drift_res.get("drift_signals") or {}
        for feat, sig in signals.items():
            if sig.get("drift_detected"):
                drifting_summary[feat] = drifting_summary.get(feat, 0) + 1

    persistent_changes = []
    for feat, count in drifting_summary.items():
        if count >= 2:  # Reoccurring in 2+ recent sessions
            persistent_changes.append({
                "feature": feat,
                "human_name": HUMAN_FEATURE_NAMES.get(feat, feat),
                "recurrent_sessions": count,
                "status": "persistent_deviation",
                "clinical_note": (
                    f"Recurrent timing deviation observed in {count} of recent monitoring sessions. "
                    "Suggests sustained motor-pattern shift rather than isolated acute fatigue."
                )
            })

    # Treatment events
    treatment_summaries = []
    if treatment_events:
        m_map = {m.get("session_id"): m for m in metrics_history if isinstance(m, dict) and m.get("session_id")}
        combined = []
        for s in sessions_history:
            if not isinstance(s, dict):
                continue
            s_id = s.get("id") or s.get("session_id")
            m = m_map.get(s_id, {})
            combined.append({"session": s, "metrics": m})
        if not any(c.get("metrics") for c in combined) and len(sessions_history) == len(metrics_history):
            combined = [{"session": s, "metrics": m} for s, m in zip(sessions_history, metrics_history)]

        for ev in treatment_events:
            treatment_summaries.append(compare_pre_post_event(ev, combined))

    now_utc = datetime.now(timezone.utc)
    return {
        "report_id": f"REP-{user_id[:8]}-{now_utc.strftime('%Y%m%d%H%M')}",
        "generated_at": now_utc.isoformat(),
        "user_id": user_id,
        "compliance": {
            "total_sessions": total_sessions,
            "valid_sessions": len(valid_sessions),
            "invalid_sessions": len(invalid_sessions),
            "distinct_days": distinct_days,
            "monitoring_span_days": date_span_days,
            "earliest_session": dates[0].isoformat() if dates else None,
            "latest_session": dates[-1].isoformat() if dates else None,
        },
        "baseline": {
            "status": "established" if baseline_established else "building",
            "anchor_device_id": anchor_device,
            "reference_intervals": {
                feat: {
                    "median": data.get("median"),
                    "mad": data.get("mad"),
                    "p25": data.get("p25"),
                    "p75": data.get("p75"),
                }
                for feat, data in baseline_stats.items()
                if isinstance(data, dict) and feat in CORE_LONGITUDINAL_FEATURES
            }
        },
        "persistent_motor_pattern_changes": persistent_changes,
        "treatment_timeline": treatment_summaries,
        "clinical_governance_disclaimer": (
            "ParkTrace is a research-grade objective digital biomarker monitoring prototype. "
            "Typing dynamics alone do NOT establish a diagnosis of Parkinson's disease, "
            "do not directly measure physical tremor or UPDRS motor scores, and do not evaluate "
            "medication efficacy. These observations must be interpreted by a licensed clinician "
            "in conjunction with standard neurological examinations."
        )
    }
