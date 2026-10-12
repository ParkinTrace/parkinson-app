"""Treatment event timeline and clinician longitudinal report endpoints."""

from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Header, HTTPException, Query

from app.core.auth import verify_user_authorization
from app.schemas.treatment import (
    TreatmentComparisonResponse,
    TreatmentEventCreate,
    TreatmentEventResponse,
)
from app.services.supabase_store import (
    get_service_client,
    history_for_user,
)
from app.services.treatment_comparator import (
    compare_pre_post_event,
    compile_clinician_longitudinal_report,
)

router = APIRouter()

# In-memory fallback for local dev / testing without live Supabase database
_local_treatment_events: dict[str, list[dict]] = {}


def _get_client(authorization: str | None):
    if authorization:
        import os
        url = os.environ.get("SUPABASE_URL", "")
        if url:
            try:
                from supabase import create_client
                return create_client(url, authorization.replace("Bearer ", ""))
            except Exception:
                pass
    return get_service_client()


@router.post("/treatment-events", response_model=TreatmentEventResponse)
def record_treatment_event(
    body: TreatmentEventCreate,
    user_id: str = Query(...),
    authorization: str | None = Header(default=None)
) -> dict:
    """Record an optional clinician-directed treatment event (e.g. medication adjustment)."""
    verified_uid = verify_user_authorization(user_id, authorization)
    client = _get_client(authorization)
    event_id = str(uuid4())
    now_str = datetime.now(timezone.utc).isoformat()
    row = {
        "id": event_id,
        "user_id": verified_uid,
        "event_date": body.event_date.isoformat(),
        "event_type": body.event_type,
        "description": body.description,
        "notes": body.notes,
        "created_at": now_str,
    }

    if client is not None:
        try:
            client.table("treatment_events").insert(row).execute()
        except Exception:
            # Fallback to local memory if table does not exist yet
            if verified_uid not in _local_treatment_events:
                _local_treatment_events[verified_uid] = []
            _local_treatment_events[verified_uid].append(row)
    else:
        if verified_uid not in _local_treatment_events:
            _local_treatment_events[verified_uid] = []
        _local_treatment_events[verified_uid].append(row)

    return row


@router.get("/treatment-events", response_model=list[TreatmentEventResponse])
def list_treatment_events(
    user_id: str = Query(...),
    authorization: str | None = Header(default=None)
) -> list:
    """List treatment events recorded for an authenticated user."""
    verified_uid = verify_user_authorization(user_id, authorization)
    client = _get_client(authorization)
    if client is not None:
        try:
            res = (client.table("treatment_events").select("*")
                   .eq("user_id", verified_uid)
                   .order("event_date", desc=True).execute())
            return res.data or []
        except Exception:
            pass
    return _local_treatment_events.get(verified_uid, [])


@router.get("/treatment-events/{event_id}/comparison", response_model=TreatmentComparisonResponse)
def get_treatment_comparison(
    event_id: str,
    user_id: str = Query(...),
    authorization: str | None = Header(default=None)
) -> dict:
    """Compare keystroke timing indicators before and after a treatment event."""
    verified_uid = verify_user_authorization(user_id, authorization)
    client = _get_client(authorization)
    events = list_treatment_events(user_id=verified_uid, authorization=authorization)
    matching = [e for e in events if str(e.get("id")) == event_id]
    if not matching:
        raise HTTPException(status_code=404, detail="Treatment event not found")
    target_event = matching[0]

    sessions_with_metrics = []
    if client is not None:
        try:
            s_rows = (client.table("sessions").select("*")
                      .eq("user_id", verified_uid)
                      .order("started_at").execute()).data or []
            m_rows = (client.table("session_metrics").select("*")
                      .eq("user_id", verified_uid)
                      .order("created_at").execute()).data or []
            m_map = {m["session_id"]: m for m in m_rows}
            for s in s_rows:
                sessions_with_metrics.append({
                    "session": s,
                    "metrics": m_map.get(s["id"], {})
                })
        except Exception:
            pass

    return compare_pre_post_event(target_event, sessions_with_metrics)


@router.get("/reports/clinician-summary")
def get_clinician_longitudinal_summary(
    user_id: str = Query(...),
    authorization: str | None = Header(default=None)
) -> dict:
    """Generate a comprehensive, clinician-oriented longitudinal summary report."""
    verified_uid = verify_user_authorization(user_id, authorization)
    client = _get_client(authorization)
    sessions = []
    metrics = []
    baseline = None

    if client is not None:
        try:
            sessions = (client.table("sessions").select("*")
                        .eq("user_id", verified_uid)
                        .order("started_at").execute()).data or []
            metrics = (client.table("session_metrics").select("*")
                       .eq("user_id", verified_uid)
                       .order("created_at").execute()).data or []
            b_res = (client.table("baselines").select("*")
                     .eq("user_id", verified_uid)
                     .order("created_at", desc=True).limit(1).execute()).data or []
            if b_res:
                baseline = b_res[0]
        except Exception:
            pass

    events = list_treatment_events(user_id=verified_uid, authorization=authorization)
    return compile_clinician_longitudinal_report(
        user_id=verified_uid,
        baseline=baseline,
        sessions_history=sessions,
        metrics_history=metrics,
        treatment_events=events,
    )
