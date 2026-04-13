from __future__ import annotations

from copy import deepcopy
from decimal import Decimal
from typing import Literal

from agents.strategy_modeller import (
    ZERO,
    StrategyModellerAgent,
    _round_money,
    _to_decimal,
)


StrategyName = Literal["avalanche", "snowball", "standard", "minimum_only"]


class ScenarioSimulatorAgent:
    def run(
        self,
        loans: list[dict],
        winning_strategy: StrategyName,
        winning_result: dict,
        extra_budget: float,
        extra_monthly: float,
        lump_sum: float,
        refi_rate: float | None = None,
    ) -> dict:
        if winning_strategy not in {
            "avalanche",
            "snowball",
            "standard",
            "minimum_only",
        }:
            raise ValueError("winning_strategy must be a valid strategy key.")

        baseline_schedule = winning_result.get("schedule")
        if not isinstance(baseline_schedule, list) or not baseline_schedule:
            raise ValueError("Cached winning schedule is missing or invalid.")

        modeller = StrategyModellerAgent()
        normalized_loans = [modeller._normalize_loan(loan) for loan in loans]
        if not normalized_loans:
            raise ValueError("At least one loan is required to simulate a scenario.")

        working_loans = deepcopy(normalized_loans)
        opening_balance = _round_money(sum(loan["balance"] for loan in normalized_loans))
        baseline_total_interest = _round_money(
            _to_decimal(winning_result.get("total_interest", 0))
        )
        baseline_payoff_months = int(winning_result.get("payoff_months", 0))
        monthly_extra_budget = _round_money(
            max(_to_decimal(extra_budget), ZERO) + max(_to_decimal(extra_monthly), ZERO)
        )

        normalized_refi_rate = self._normalize_refi_rate(refi_rate)
        if normalized_refi_rate is not None:
            for loan in working_loans:
                loan["interest_rate"] = normalized_refi_rate

        lump_sum_amount = _round_money(max(_to_decimal(lump_sum), ZERO))
        if lump_sum_amount > ZERO:
            self._apply_lump_sum(
                modeller=modeller,
                loans=working_loans,
                winning_strategy=winning_strategy,
                lump_sum=lump_sum_amount,
            )

        remaining_balance_after_lump_sum = _round_money(
            sum(loan["balance"] for loan in working_loans)
        )
        if remaining_balance_after_lump_sum <= ZERO:
            return {
                "modified_schedule": [
                    {
                        "month": 0,
                        "total_balance": 0.0,
                        "interest": 0.0,
                        "principal": float(opening_balance),
                    }
                ],
                "additional_savings": float(baseline_total_interest),
                "months_saved": baseline_payoff_months,
                "new_payoff_date": modeller._format_payoff_date(0),
                "opening_balance": float(opening_balance),
            }

        modified_result = modeller._simulate(
            winning_strategy,
            working_loans,
            monthly_extra_budget,
        )

        additional_savings = _round_money(
            baseline_total_interest - _to_decimal(modified_result["total_interest"])
        )
        months_saved = baseline_payoff_months - int(modified_result["payoff_months"])

        return {
            "modified_schedule": modified_result["schedule"],
            "additional_savings": float(additional_savings),
            "months_saved": months_saved,
            "new_payoff_date": modified_result["payoff_date"],
            "opening_balance": float(opening_balance),
        }

    @staticmethod
    def _normalize_refi_rate(refi_rate: float | None) -> Decimal | None:
        if refi_rate is None:
            return None

        normalized = _to_decimal(refi_rate)
        if normalized < ZERO:
            raise ValueError("refi_rate must be 0 or greater")
        if ZERO < normalized < Decimal("1"):
            normalized *= Decimal("100")
        return _round_money(normalized)

    @staticmethod
    def _apply_lump_sum(
        modeller: StrategyModellerAgent,
        loans: list[dict],
        winning_strategy: StrategyName,
        lump_sum: Decimal,
    ) -> None:
        if winning_strategy == "standard":
            modeller._apply_standard_extra(loans, lump_sum)
            return

        ranked_strategy: Literal["avalanche", "snowball"]
        ranked_strategy = (
            "snowball" if winning_strategy == "snowball" else "avalanche"
        )
        modeller._apply_ranked_extra(loans, lump_sum, ranked_strategy)
