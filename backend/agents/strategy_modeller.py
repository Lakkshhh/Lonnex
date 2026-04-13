from __future__ import annotations

from copy import deepcopy
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal


CENT = Decimal("0.01")
ZERO = Decimal("0.00")

StrategyName = Literal["avalanche", "snowball", "standard", "minimum_only"]


def _to_decimal(value: object) -> Decimal:
    return Decimal(str(value))


def _round_money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _to_float(value: Decimal) -> float:
    return float(_round_money(value))


class StrategyModellerAgent:
    MAX_MONTHS = 6000
    _EPSILON = Decimal("0.0000001")

    def run(
        self,
        loans: list[dict],
        monthly_income: float,
        extra_budget: float,
    ) -> dict:
        normalized_loans = [self._normalize_loan(loan) for loan in loans]
        if not normalized_loans:
            raise ValueError("At least one loan is required to model strategies.")

        base_extra_budget = _round_money(_to_decimal(extra_budget))
        total_debt = _round_money(sum(loan["balance"] for loan in normalized_loans))
        monthly_payment = _round_money(
            sum(loan["min_payment"] for loan in normalized_loans) + base_extra_budget
        )

        results = {
            "avalanche": self._simulate("avalanche", normalized_loans, base_extra_budget),
            "snowball": self._simulate("snowball", normalized_loans, base_extra_budget),
            "standard": self._simulate("standard", normalized_loans, base_extra_budget),
            "minimum_only": self._simulate(
                "minimum_only",
                normalized_loans,
                base_extra_budget,
            ),
        }

        winner = min(results, key=lambda name: results[name]["total_interest"])
        winner_saves = _round_money(
            _to_decimal(results["standard"]["total_interest"])
            - _to_decimal(results[winner]["total_interest"])
        )

        return {
            **results,
            "winner": winner,
            "winner_saves": _to_float(winner_saves),
            "total_debt": _to_float(total_debt),
            "monthly_payment": _to_float(monthly_payment),
        }

    def _simulate(
        self,
        strategy: StrategyName,
        loans: list[dict],
        extra_budget: Decimal,
    ) -> dict:
        working_loans = deepcopy(loans)
        schedule_rows: list[dict[str, Decimal | int]] = []
        rollover_extra = ZERO
        opening_total_debt = _round_money(sum(loan["balance"] for loan in working_loans))

        if opening_total_debt <= ZERO:
            return {
                "schedule": [
                    {
                        "month": 0,
                        "total_balance": 0.0,
                        "interest": 0.0,
                        "principal": 0.0,
                    }
                ],
                "total_interest": 0.0,
                "payoff_months": 0,
                "payoff_date": self._format_payoff_date(0),
            }

        for month in range(1, self.MAX_MONTHS + 1):
            active_loans = [
                loan for loan in working_loans if loan["balance"] > self._EPSILON
            ]
            if not active_loans:
                break

            closed_this_month: set[int] = set()
            interest_this_month = ZERO
            principal_this_month = ZERO

            for loan in active_loans:
                current_balance = _round_money(loan["balance"])
                if current_balance <= ZERO:
                    loan["balance"] = ZERO
                    continue

                monthly_interest = _round_money(
                    current_balance * (loan["interest_rate"] / Decimal("100") / Decimal("12"))
                )
                interest_this_month += monthly_interest

                scheduled_payment = _round_money(loan["min_payment"])
                scheduled_principal = _round_money(
                    max(scheduled_payment - monthly_interest, ZERO)
                )
                scheduled_principal = _round_money(
                    min(scheduled_principal, current_balance)
                )

                new_balance = _round_money(current_balance - scheduled_principal)
                loan["balance"] = ZERO if new_balance <= ZERO else new_balance
                principal_this_month += scheduled_principal

                if loan["balance"] <= ZERO:
                    loan["balance"] = ZERO
                    closed_this_month.add(id(loan))

            if strategy == "minimum_only":
                extra_pool = ZERO
            elif strategy == "standard":
                extra_pool = extra_budget
            else:
                extra_pool = _round_money(extra_budget + rollover_extra)

            if extra_pool > ZERO:
                if strategy == "standard":
                    extra_principal = self._apply_standard_extra(working_loans, extra_pool)
                    principal_this_month += extra_principal
                elif strategy in {"avalanche", "snowball"}:
                    extra_principal, extra_closed = self._apply_ranked_extra(
                        working_loans,
                        extra_pool,
                        strategy,
                    )
                    principal_this_month += extra_principal
                    closed_this_month.update(extra_closed)

            if strategy in {"avalanche", "snowball"} and closed_this_month:
                rollover_extra = _round_money(
                    rollover_extra
                    + sum(
                        loan["min_payment"]
                        for loan in working_loans
                        if id(loan) in closed_this_month
                    )
                )

            total_balance = _round_money(
                sum(max(loan["balance"], ZERO) for loan in working_loans)
            )

            schedule_rows.append(
                {
                    "month": month,
                    "total_balance": total_balance,
                    "interest": _round_money(interest_this_month),
                    "principal": _round_money(principal_this_month),
                }
            )

            if total_balance <= ZERO:
                payoff_months = month
                break
        else:
            payoff_months = len(schedule_rows)

        sum_schedule_interest = _round_money(
            sum(row["interest"] for row in schedule_rows)
        )
        sum_schedule_principal = _round_money(
            sum(row["principal"] for row in schedule_rows)
        )
        total_paid = _round_money(sum_schedule_interest + sum_schedule_principal)

        reported_total_interest = sum_schedule_interest
        reported_total_principal = sum_schedule_principal

        if abs(sum_schedule_interest - reported_total_interest) > CENT:
            raise ValueError(
                "Schedule interest does not reconcile with reported total interest."
            )
        if abs(sum_schedule_principal - opening_total_debt) > CENT:
            raise ValueError(
                "Schedule principal does not reconcile with opening total debt."
            )

        converted_schedule = [
            {
                "month": int(row["month"]),
                "total_balance": _to_float(row["total_balance"]),
                "interest": _to_float(row["interest"]),
                "principal": _to_float(row["principal"]),
            }
            for row in schedule_rows
        ]

        _ = total_paid
        _ = reported_total_principal

        return {
            "schedule": converted_schedule,
            "total_interest": _to_float(reported_total_interest),
            "payoff_months": payoff_months,
            "payoff_date": self._format_payoff_date(payoff_months),
        }

    def _apply_ranked_extra(
        self,
        loans: list[dict],
        extra_pool: Decimal,
        strategy: Literal["avalanche", "snowball"],
    ) -> tuple[Decimal, set[int]]:
        active_loans = [loan for loan in loans if loan["balance"] > self._EPSILON]
        if strategy == "avalanche":
            ranked = sorted(
                active_loans,
                key=lambda loan: (
                    -loan["interest_rate"],
                    loan["balance"],
                    loan["loan_name"],
                ),
            )
        else:
            ranked = sorted(
                active_loans,
                key=lambda loan: (
                    loan["balance"],
                    -loan["interest_rate"],
                    loan["loan_name"],
                ),
            )

        principal_paid = ZERO
        closed_this_month: set[int] = set()
        remaining_extra = _round_money(extra_pool)

        for loan in ranked:
            if remaining_extra <= ZERO:
                break

            current_balance = _round_money(loan["balance"])
            extra_payment = _round_money(min(remaining_extra, current_balance))
            if extra_payment <= ZERO:
                continue

            new_balance = _round_money(current_balance - extra_payment)
            loan["balance"] = ZERO if new_balance <= ZERO else new_balance
            principal_paid += extra_payment
            remaining_extra = _round_money(remaining_extra - extra_payment)

            if loan["balance"] <= ZERO:
                loan["balance"] = ZERO
                closed_this_month.add(id(loan))

        return _round_money(principal_paid), closed_this_month

    def _apply_standard_extra(self, loans: list[dict], extra_pool: Decimal) -> Decimal:
        active_loans = [loan for loan in loans if loan["balance"] > self._EPSILON]
        remaining_extra = _round_money(extra_pool)
        total_principal = ZERO

        while remaining_extra > ZERO and active_loans:
            share = _round_money(remaining_extra / Decimal(len(active_loans)))
            distributed_this_pass = ZERO
            next_active_loans: list[dict] = []

            for index, loan in enumerate(active_loans):
                current_balance = _round_money(loan["balance"])
                target_share = (
                    _round_money(remaining_extra - distributed_this_pass)
                    if index == len(active_loans) - 1
                    else share
                )
                extra_payment = _round_money(min(current_balance, target_share))

                if extra_payment > ZERO:
                    new_balance = _round_money(current_balance - extra_payment)
                    loan["balance"] = ZERO if new_balance <= ZERO else new_balance
                    total_principal += extra_payment
                    distributed_this_pass = _round_money(
                        distributed_this_pass + extra_payment
                    )

                if loan["balance"] > ZERO:
                    next_active_loans.append(loan)
                else:
                    loan["balance"] = ZERO

            if distributed_this_pass <= ZERO:
                break

            remaining_extra = _round_money(remaining_extra - distributed_this_pass)
            active_loans = next_active_loans

        return _round_money(total_principal)

    @staticmethod
    def _normalize_loan(loan: dict) -> dict:
        return {
            "loan_name": str(loan["loan_name"]),
            "balance": _round_money(_to_decimal(loan["balance"])),
            "interest_rate": _to_decimal(loan["interest_rate"]),
            "min_payment": _round_money(_to_decimal(loan["min_payment"])),
        }

    @staticmethod
    def _format_payoff_date(payoff_months: int) -> str:
        base_year = date.today().year
        base_month = date.today().month
        total_month_index = (base_year * 12 + (base_month - 1)) + payoff_months
        payoff_year, payoff_month_zero_index = divmod(total_month_index, 12)
        return f"{payoff_year:04d}-{payoff_month_zero_index + 1:02d}"
