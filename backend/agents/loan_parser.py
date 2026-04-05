from __future__ import annotations


class LoanParserAgent:
    ALLOWED_LOAN_TYPES = {
        "education_student_loan",
        "personal_loan",
        "auto_loan",
        "home_mortgage",
        "home_equity_loan",
        "credit_card",
        "medical_debt",
        "business_loan",
        "debt_consolidation_loan",
        "other",
        "federal_subsidized",
        "federal_unsubsidized",
        "parent_plus",
        "private",
    }

    def run(self, raw: dict) -> dict:
        loan_name = str(raw.get("loan_name", "") or "").strip()
        if not loan_name:
            raise ValueError("loan_name must not be empty")

        balance = self._parse_number(raw.get("balance"), "balance")
        if balance <= 0:
            raise ValueError("balance must be greater than 0")

        interest_rate = self._parse_number(raw.get("interest_rate"), "interest_rate")
        if interest_rate < 1:
            interest_rate *= 100
        if interest_rate < 0 or interest_rate > 30:
            raise ValueError("interest_rate must be between 0 and 30")

        min_payment = self._parse_number(raw.get("min_payment"), "min_payment")
        if min_payment <= 0:
            raise ValueError("min_payment must be greater than 0")

        monthly_interest = balance * (interest_rate / 100 / 12)
        if min_payment < monthly_interest:
            short_amount = monthly_interest - min_payment
            raise ValueError(
                "Minimum payment of "
                f"${min_payment:,.2f} is ${short_amount:,.2f} short of the "
                f"${monthly_interest:,.2f} monthly interest — this loan would never pay off."
            )

        loan_type = str(raw.get("loan_type", "") or "").strip().lower()
        if loan_type not in self.ALLOWED_LOAN_TYPES:
            raise ValueError(
                "loan_type must be one of education_student_loan, personal_loan, "
                "auto_loan, home_mortgage, home_equity_loan, credit_card, "
                "medical_debt, business_loan, debt_consolidation_loan, other, "
                "federal_subsidized, federal_unsubsidized, parent_plus, private"
            )

        servicer = str(raw.get("servicer", "") or "").strip()

        monthly_income = self._parse_number(
            raw.get("monthly_income"), "monthly_income"
        )
        if monthly_income <= 0:
            raise ValueError("monthly_income must be greater than 0")

        extra_budget = self._parse_number(raw.get("extra_budget"), "extra_budget")
        if extra_budget < 0:
            raise ValueError("extra_budget must be 0 or greater")
        if extra_budget > monthly_income:
            raise ValueError("extra_budget cannot exceed monthly_income")

        return {
            "loan_name": loan_name,
            "balance": round(balance, 2),
            "interest_rate": round(interest_rate, 4),
            "min_payment": round(min_payment, 2),
            "loan_type": loan_type,
            "servicer": servicer,
            "monthly_income": round(monthly_income, 2),
            "extra_budget": round(extra_budget, 2),
        }

    @staticmethod
    def _parse_number(value: object, field_name: str) -> float:
        try:
            return float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{field_name} must be a valid number") from exc
