from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request, status
from fastapi.responses import JSONResponse
from supabase import create_client, ClientOptions

from agents import LoanParserAgent
from config import SUPABASE_ANON_KEY, SUPABASE_URL


router = APIRouter()

_ALLOWED_CURRENCIES = frozenset(
    {"USD", "GBP", "EUR", "INR", "CAD", "AUD", "SGD", "JPY"}
)


@router.post("/add")
def add_loan(request: Request, payload: dict[str, Any] = Body(...)):
    user_id = str(payload.get("user_id", "") or "").strip()
    if not user_id:
        raise HTTPException(status_code=422, detail="user_id must not be empty")

    authorization = request.headers.get("Authorization", "").strip()
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header",
        )

    user_supabase = create_client(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        options=ClientOptions(headers={"Authorization": f"Bearer {token}"}),
    )

    existing_profile = (
        user_supabase.table("user_financial_profile")
        .select("id")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    profile_row_exists = bool(existing_profile.data)

    try:
        validated = LoanParserAgent().run(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    username = str(payload.get("username", "") or "").strip()
    profile_payload = {
        "id": user_id,
        "username": username,
        "monthly_income": validated["monthly_income"],
        "extra_budget": validated["extra_budget"],
    }
    if not profile_row_exists:
        currency = str(payload.get("currency", "USD") or "USD").strip().upper()
        if currency not in _ALLOWED_CURRENCIES:
            currency = "USD"
        profile_payload["currency"] = currency
    loan_payload = {
        "user_id": user_id,
        "loan_name": validated["loan_name"],
        "loan_type": validated["loan_type"],
        "servicer": validated["servicer"],
        "balance": validated["balance"],
        "interest_rate": validated["interest_rate"],
        "min_payment": validated["min_payment"],
    }

    try:
        if not profile_row_exists:
            user_supabase.table("user_financial_profile").insert(
                profile_payload
            ).execute()
        loan_response = user_supabase.table("loans").insert(loan_payload).execute()
    except Exception as exc:  # pragma: no cover - pass-through API error
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    inserted_loan = loan_response.data[0] if loan_response.data else loan_payload
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=inserted_loan,
    )
