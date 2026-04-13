from __future__ import annotations

import time
from threading import Lock
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request
from supabase import ClientOptions, create_client

from agents.orchestrator import run_pipeline
from agents.scenario_simulator import ScenarioSimulatorAgent
from config import SUPABASE_ANON_KEY, SUPABASE_URL


router = APIRouter()
simulate_router = APIRouter()

_SIMULATION_THROTTLE_SECONDS = 0.3
_simulation_cache_lock = Lock()
_simulation_cache: dict[tuple[str, str], tuple[float, dict[str, Any]]] = {}
_simulation_generation_lock = Lock()
_simulation_generations: dict[str, int] = {}


def _get_bearer_token(request: Request) -> str:
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

    return token


def _get_authenticated_supabase(request: Request):
    token = _get_bearer_token(request)
    user_supabase = create_client(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        options=ClientOptions(headers={"Authorization": f"Bearer {token}"}),
    )
    user_response = user_supabase.auth.get_user(token)
    user = getattr(user_response, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Unable to resolve authenticated user")
    return user_supabase, token, str(user.id)


def _parse_currency_number(payload: dict[str, Any], field: str) -> float:
    try:
        value = float(payload.get(field, 0) or 0)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"{field} must be a valid number") from exc

    if value < 0:
        raise HTTPException(status_code=422, detail=f"{field} must be 0 or greater")
    return value


def _parse_rate(payload: dict[str, Any], field: str) -> float | None:
    if field not in payload or payload.get(field) is None:
        return None

    try:
        value = float(payload.get(field))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"{field} must be a valid number") from exc

    if value < 0:
        raise HTTPException(status_code=422, detail=f"{field} must be 0 or greater")
    return value


def _read_cached_simulation(user_id: str, signature: str) -> dict[str, Any] | None:
    with _simulation_cache_lock:
        cached = _simulation_cache.get((user_id, signature))
        if not cached:
            return None

        cached_at, payload = cached
        if time.monotonic() - cached_at > _SIMULATION_THROTTLE_SECONDS:
            _simulation_cache.pop((user_id, signature), None)
            return None

        return payload


def _write_cached_simulation(
    user_id: str,
    signature: str,
    payload: dict[str, Any],
) -> None:
    with _simulation_cache_lock:
        _simulation_cache[(user_id, signature)] = (time.monotonic(), payload)


def _register_simulation(user_id: str) -> int:
    with _simulation_generation_lock:
        next_generation = _simulation_generations.get(user_id, 0) + 1
        _simulation_generations[user_id] = next_generation
        return next_generation


def _is_latest_simulation(user_id: str, generation: int) -> bool:
    with _simulation_generation_lock:
        return _simulation_generations.get(user_id) == generation


@router.post("/run")
def run_pipeline_route(request: Request, payload: dict[str, Any] = Body(...)):
    user_id = str(payload.get("user_id", "") or "").strip()
    if not user_id:
        raise HTTPException(status_code=422, detail="user_id must not be empty")

    raw_loan_ids = payload.get("loan_ids")
    if not isinstance(raw_loan_ids, list) or not raw_loan_ids:
        raise HTTPException(
            status_code=422,
            detail="loan_ids must be a non-empty list",
        )

    loan_ids = [str(loan_id).strip() for loan_id in raw_loan_ids if str(loan_id).strip()]
    if not loan_ids:
        raise HTTPException(
            status_code=422,
            detail="loan_ids must be a non-empty list",
        )

    user_supabase, _token, _authenticated_user_id = _get_authenticated_supabase(request)

    try:
        profile_response = (
            user_supabase.table("user_financial_profile")
            .select("monthly_income, extra_budget")
            .eq("id", user_id)
            .single()
            .execute()
        )
        loans_response = (
            user_supabase.table("loans")
            .select(
                "id, loan_name, balance, interest_rate, min_payment, loan_type, servicer"
            )
            .eq("user_id", user_id)
            .in_("id", loan_ids)
            .execute()
        )
    except Exception as exc:  # pragma: no cover - pass-through API error
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    profile = profile_response.data
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="No financial profile found for this user.",
        )

    loans = loans_response.data or []
    if not loans:
        raise HTTPException(
            status_code=404,
            detail="No loans found for the supplied loan_ids.",
        )

    try:
        strategy_result = run_pipeline(
            raw_loans=loans,
            monthly_income=float(profile["monthly_income"]),
            extra_budget=float(profile["extra_budget"]),
        )
        stored_result = {
            **strategy_result,
            "loan_snapshot": loans,
            "financial_profile_snapshot": {
                "monthly_income": float(profile["monthly_income"]),
                "extra_budget": float(profile["extra_budget"]),
            },
        }
        user_supabase.table("pipeline_results").insert(
            {
                "user_id": user_id,
                "result": stored_result,
            }
        ).execute()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - pass-through API error
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return strategy_result


@simulate_router.post("/simulate")
def run_simulation_route(request: Request, payload: dict[str, Any] = Body(...)):
    user_supabase, _token, user_id = _get_authenticated_supabase(request)
    generation = _register_simulation(user_id)

    extra_monthly = _parse_currency_number(payload, "extra_monthly")
    lump_sum = _parse_currency_number(payload, "lump_sum")
    refi_rate = _parse_rate(payload, "refi_rate")

    refi_signature = "null" if refi_rate is None else f"{refi_rate:.2f}"
    signature = f"{extra_monthly:.2f}|{lump_sum:.2f}|{refi_signature}"
    cached_payload = _read_cached_simulation(user_id, signature)
    if cached_payload is not None:
        return cached_payload

    try:
        latest_result_response = (
            user_supabase.table("pipeline_results")
            .select("result")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as exc:  # pragma: no cover - pass-through API error
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    cached_rows = latest_result_response.data or []
    cached_result = cached_rows[0]["result"] if cached_rows else None
    if not cached_result:
        raise HTTPException(
            status_code=404,
            detail="No cached dashboard analysis found. Open the dashboard first.",
        )

    loan_snapshot = cached_result.get("loan_snapshot")
    financial_profile_snapshot = cached_result.get("financial_profile_snapshot")
    if not isinstance(loan_snapshot, list) or not loan_snapshot:
        raise HTTPException(
            status_code=409,
            detail="Your cached dashboard snapshot is missing. Re-run the dashboard before simulating.",
        )
    if not isinstance(financial_profile_snapshot, dict):
        raise HTTPException(
            status_code=409,
            detail="Your cached dashboard snapshot is missing. Re-run the dashboard before simulating.",
        )

    winner = str(cached_result.get("winner", "") or "").strip()
    winning_result = cached_result.get(winner)
    if winner not in {"avalanche", "snowball", "standard", "minimum_only"}:
        raise HTTPException(
            status_code=422,
            detail="Cached winning strategy is missing or invalid.",
        )
    if not isinstance(winning_result, dict):
        raise HTTPException(
            status_code=422,
            detail="Cached winning strategy result is missing or invalid.",
        )

    try:
        scenario_result = ScenarioSimulatorAgent().run(
            loans=loan_snapshot,
            extra_budget=float(financial_profile_snapshot["extra_budget"]),
            winning_strategy=winner,
            winning_result=winning_result,
            extra_monthly=extra_monthly,
            lump_sum=lump_sum,
            refi_rate=refi_rate,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - pass-through API error
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not _is_latest_simulation(user_id, generation):
        raise HTTPException(
            status_code=409,
            detail="Simulation superseded by a newer request.",
        )

    _write_cached_simulation(user_id, signature, scenario_result)
    return scenario_result
