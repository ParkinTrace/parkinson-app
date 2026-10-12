"""Pydantic schemas for treatment events and longitudinal comparisons."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class TreatmentEventCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    event_date: datetime = Field(..., alias="eventDate")
    event_type: str = Field(..., alias="eventType")
    description: str
    notes: str | None = None


class TreatmentEventResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    user_id: str = Field(..., alias="userId")
    event_date: datetime = Field(..., alias="eventDate")
    event_type: str = Field(..., alias="eventType")
    description: str
    notes: str | None = None
    created_at: datetime = Field(..., alias="createdAt")


class FeatureComparison(BaseModel):
    feature: str
    human_name: str
    pre_median: float | None = None
    post_median: float | None = None
    difference: float | None = None
    percent_change: float | None = None


class TreatmentComparisonResponse(BaseModel):
    event_id: str
    event_date: str
    event_type: str
    description: str
    pre_session_count: int
    post_session_count: int
    pre_date_range: tuple[str, str] | None = None
    post_date_range: tuple[str, str] | None = None
    feature_comparisons: list[FeatureComparison]
    disclaimer: str = (
        "Observed changes represent empirical keystroke timing differences before and "
        "after the recorded event date. This comparison does NOT establish clinical efficacy, "
        "causality, or treatment response, and must be reviewed alongside clinical examinations."
    )
