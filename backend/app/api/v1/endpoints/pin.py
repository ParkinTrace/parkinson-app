"""PIN security endpoints for daily typing sessions."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.auth import verify_user_authorization
from app.services.pin_service import (
    get_pin_status,
    is_session_token_valid,
    is_valid_pin_format,
    set_user_pin,
    verify_user_pin,
)

router = APIRouter(prefix="/auth/pin")


class PinSetupRequest(BaseModel):
    pin: str = Field(..., description="4-digit numeric PIN", examples=["1234"])
    confirm_pin: str = Field(..., description="Confirmation of 4-digit PIN", examples=["1234"])
    current_pin: str | None = Field(default=None, description="Existing PIN if updating")
    user_id: str | None = Field(default=None, description="Optional explicit user_id for dev mode")


class PinVerifyRequest(BaseModel):
    pin: str = Field(..., description="4-digit numeric PIN to verify", examples=["1234"])
    user_id: str | None = Field(default=None, description="Optional explicit user_id for dev mode")


class PinStatusResponse(BaseModel):
    pin_set: bool
    user_id: str


class PinVerifyResponse(BaseModel):
    verified: bool
    token: str | None = None
    message: str


@router.get("/status", response_model=PinStatusResponse)
def check_pin_status(
    authorization: str | None = Header(default=None),
    user_id: str | None = Query(default=None),
) -> PinStatusResponse:
    """Check if the caller has configured a 4-digit session access PIN."""
    effective_user_id = verify_user_authorization(user_id, authorization, required=False)
    is_set = get_pin_status(effective_user_id)
    return PinStatusResponse(pin_set=is_set, user_id=effective_user_id)


@router.post("/setup")
def setup_pin(
    payload: PinSetupRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    """Set up or update a 4-digit session PIN."""
    effective_user_id = verify_user_authorization(payload.user_id, authorization, required=False)

    if not is_valid_pin_format(payload.pin):
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 numeric digits")

    if payload.pin != payload.confirm_pin:
        raise HTTPException(status_code=400, detail="PIN and confirmation do not match")

    # If PIN is already configured, verify current_pin if provided
    if get_pin_status(effective_user_id) and payload.current_pin is not None:
        valid, _ = verify_user_pin(effective_user_id, payload.current_pin)
        if not valid:
            raise HTTPException(status_code=401, detail="Current PIN is incorrect")

    set_user_pin(effective_user_id, payload.pin)
    return {
        "status": "ok",
        "message": "Session PIN set successfully",
        "user_id": effective_user_id,
    }


@router.post("/verify", response_model=PinVerifyResponse)
def verify_pin(
    payload: PinVerifyRequest,
    authorization: str | None = Header(default=None),
) -> PinVerifyResponse:
    """Verify 4-digit PIN before allowing a daily typing session to start."""
    effective_user_id = verify_user_authorization(payload.user_id, authorization, required=False)

    if not is_valid_pin_format(payload.pin):
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 numeric digits")

    # Check if a PIN is actually set
    if not get_pin_status(effective_user_id):
        raise HTTPException(
            status_code=404,
            detail="Session PIN has not been set yet. Please configure your PIN first.",
        )

    verified, token = verify_user_pin(effective_user_id, payload.pin)
    if not verified:
        raise HTTPException(
            status_code=401,
            detail="Incorrect 4-digit PIN. Please try again.",
        )

    return PinVerifyResponse(
        verified=True,
        token=token,
        message="Session unlocked successfully",
    )


@router.get("/validate-token")
def validate_token(
    token: str = Query(...),
    authorization: str | None = Header(default=None),
    user_id: str | None = Query(default=None),
) -> dict:
    """Check if an active session verification token is still valid."""
    effective_user_id = verify_user_authorization(user_id, authorization, required=False)
    valid = is_session_token_valid(token, effective_user_id)
    return {"valid": valid, "user_id": effective_user_id}
