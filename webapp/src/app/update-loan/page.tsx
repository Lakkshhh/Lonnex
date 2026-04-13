"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import { CURRENCIES } from "@/lib/currency";
import { supabase } from "@/lib/supabase";

const CURRENCY_SELECT_OPTIONS = (
  Object.entries(CURRENCIES) as [keyof typeof CURRENCIES, string][]
).map(([code, symbol]) => ({
  code,
  label: `${code} (${symbol})`,
}));

type LoanType =
  | "education_student_loan"
  | "personal_loan"
  | "auto_loan"
  | "home_mortgage"
  | "home_equity_loan"
  | "credit_card"
  | "medical_debt"
  | "business_loan"
  | "debt_consolidation_loan"
  | "other";

type LoanValues = {
  loan_name: string;
  loan_type: LoanType;
  servicer: string;
  balance: string;
  interest_rate: string;
  min_payment: string;
  monthly_income: string;
  extra_budget: string;
};

type FieldName = keyof LoanValues;

type FieldErrors = Partial<Record<FieldName | "form", string>>;

const INITIAL_VALUES: LoanValues = {
  loan_name: "",
  loan_type: "education_student_loan",
  servicer: "",
  balance: "",
  interest_rate: "",
  min_payment: "",
  monthly_income: "",
  extra_budget: "",
};

const FIELD_ORDER: FieldName[] = [
  "loan_name",
  "loan_type",
  "servicer",
  "balance",
  "interest_rate",
  "min_payment",
  "monthly_income",
  "extra_budget",
];

const FIELD_LABELS: Record<FieldName, string> = {
  loan_name: "Loan name",
  loan_type: "Loan type",
  servicer: "Servicer",
  balance: "Balance ($)",
  interest_rate: "Interest rate (%)",
  min_payment: "Minimum monthly payment ($)",
  monthly_income: "Monthly take-home income ($)",
  extra_budget: "Extra payment budget ($/mo)",
};

const LOAN_TYPE_OPTIONS: Array<{ label: string; value: LoanType }> = [
  { label: "Education (Student Loan)", value: "education_student_loan" },
  { label: "Personal Loan", value: "personal_loan" },
  { label: "Auto Loan", value: "auto_loan" },
  { label: "Home Mortgage", value: "home_mortgage" },
  { label: "Home Equity Loan", value: "home_equity_loan" },
  { label: "Credit Card", value: "credit_card" },
  { label: "Medical Debt", value: "medical_debt" },
  { label: "Business Loan", value: "business_loan" },
  { label: "Debt Consolidation Loan", value: "debt_consolidation_loan" },
  { label: "Other", value: "other" },
];

function parseNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeInterestRate(value: number): number {
  return value < 1 ? value * 100 : value;
}

type ValidateOptions = {
  omitIncomeBudget?: boolean;
};

function validateValues(
  values: LoanValues,
  options?: ValidateOptions,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.loan_name.trim()) {
    errors.loan_name = "loan_name must not be empty";
  }

  const balance = parseNumber(values.balance);
  if (balance === null) {
    errors.balance = "balance must be a valid number";
  } else if (balance <= 0) {
    errors.balance = "balance must be greater than 0";
  }

  const interestRateRaw = parseNumber(values.interest_rate);
  let interestRate: number | null = null;
  if (interestRateRaw === null) {
    errors.interest_rate = "interest_rate must be a valid number";
  } else {
    interestRate = normalizeInterestRate(interestRateRaw);
    if (interestRate < 0 || interestRate > 30) {
      errors.interest_rate = "interest_rate must be between 0 and 30";
    }
  }

  const minPayment = parseNumber(values.min_payment);
  if (minPayment === null) {
    errors.min_payment = "min_payment must be a valid number";
  } else if (minPayment <= 0) {
    errors.min_payment = "min_payment must be greater than 0";
  }

  let monthlyIncome: number | null = null;
  let extraBudget: number | null = null;

  if (!options?.omitIncomeBudget) {
    monthlyIncome = parseNumber(values.monthly_income);
    if (monthlyIncome === null) {
      errors.monthly_income = "monthly_income must be a valid number";
    } else if (monthlyIncome <= 0) {
      errors.monthly_income = "monthly_income must be greater than 0";
    }

    extraBudget = parseNumber(values.extra_budget);
    if (extraBudget === null) {
      errors.extra_budget = "extra_budget must be a valid number";
    } else if (extraBudget < 0) {
      errors.extra_budget = "extra_budget must be 0 or greater";
    } else if (monthlyIncome !== null && extraBudget > monthlyIncome) {
      errors.extra_budget = "extra_budget cannot exceed monthly_income";
    }
  }

  if (
    balance !== null &&
    balance > 0 &&
    interestRate !== null &&
    interestRate >= 0 &&
    interestRate <= 30 &&
    minPayment !== null &&
    minPayment > 0
  ) {
    const monthlyInterest = balance * (interestRate / 100 / 12);
    if (minPayment < monthlyInterest) {
      const shortAmount = monthlyInterest - minPayment;
      errors.min_payment =
        `Minimum payment of $${formatMoney(minPayment)} is ` +
        `$${formatMoney(shortAmount)} short of the ` +
        `$${formatMoney(monthlyInterest)} monthly interest — this loan would never pay off.`;
    }
  }

  if (!LOAN_TYPE_OPTIONS.some((option) => option.value === values.loan_type)) {
    errors.loan_type =
      "loan_type must be one of education_student_loan, personal_loan, auto_loan, home_mortgage, home_equity_loan, credit_card, medical_debt, business_loan, debt_consolidation_loan, other";
  }

  return errors;
}

type CachedFinancialProfile = {
  monthly_income: number;
  extra_budget: number;
  currency: string;
};

function UpdateLoanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loanId = searchParams.get("loanId");

  const [values, setValues] = useState<LoanValues>(INITIAL_VALUES);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiErrors, setApiErrors] = useState<FieldErrors>({});
  const [financialProfileLoading, setFinancialProfileLoading] = useState(true);
  const [cachedFinancialProfile, setCachedFinancialProfile] =
    useState<CachedFinancialProfile | null>(null);
  const [currencyCode, setCurrencyCode] = useState<string>("USD");
  const [successMessage, setSuccessMessage] = useState("");
  const currencySymbol = CURRENCIES[currencyCode] ?? CURRENCIES.USD;

  const omitIncomeBudget = cachedFinancialProfile !== null;
  const showCurrencySelect =
    !financialProfileLoading && cachedFinancialProfile === null;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setFinancialProfileLoading(false);
          router.push("/login");
        }
        return;
      }

      if (!loanId) {
        if (!cancelled) {
          setApiErrors({
            form: "Could not load this loan.",
          });
          setFinancialProfileLoading(false);
        }
        return;
      }

      const [profileResponse, loanResponse] = await Promise.all([
        supabase
          .from("user_financial_profile")
          .select("monthly_income, extra_budget, currency")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("loans")
          .select(
            "loan_name, loan_type, servicer, balance, interest_rate, min_payment"
          )
          .eq("id", loanId)
          .eq("user_id", user.id)
          .single(),
      ]);

      if (cancelled) {
        return;
      }

      if (!profileResponse.error && profileResponse.data) {
        setCachedFinancialProfile({
          monthly_income: Number(profileResponse.data.monthly_income),
          extra_budget: Number(profileResponse.data.extra_budget),
          currency: String(profileResponse.data.currency || "USD"),
        });
        setCurrencyCode(String(profileResponse.data.currency || "USD"));
      } else {
        setCachedFinancialProfile(null);
      }

      if (loanResponse.error || !loanResponse.data) {
        setApiErrors({
          form: "Could not load this loan.",
        });
        setFinancialProfileLoading(false);
        return;
      }

      setValues({
        loan_name: String(loanResponse.data.loan_name || ""),
        loan_type: loanResponse.data.loan_type as LoanType,
        servicer: String(loanResponse.data.servicer || ""),
        balance: String(loanResponse.data.balance ?? ""),
        interest_rate: String(loanResponse.data.interest_rate ?? ""),
        min_payment: String(loanResponse.data.min_payment ?? ""),
        monthly_income:
          profileResponse.data?.monthly_income != null
            ? String(profileResponse.data.monthly_income)
            : "",
        extra_budget:
          profileResponse.data?.extra_budget != null
            ? String(profileResponse.data.extra_budget)
            : "",
      });
      setFinancialProfileLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loanId, router]);

  const inlineErrors = useMemo(
    () => validateValues(values, { omitIncomeBudget }),
    [values, omitIncomeBudget],
  );

  const visibleErrors = useMemo(() => {
    const merged: FieldErrors = { ...apiErrors };

    FIELD_ORDER.forEach((field) => {
      if (
        omitIncomeBudget &&
        (field === "monthly_income" || field === "extra_budget")
      ) {
        return;
      }
      if ((submitAttempted || touched[field]) && inlineErrors[field]) {
        merged[field] = inlineErrors[field];
      }
    });

    return merged;
  }, [apiErrors, inlineErrors, omitIncomeBudget, submitAttempted, touched]);

  const inputClass =
    "mt-2 w-full rounded-[1.1rem] border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-base text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:bg-white/90";
  const errorClass = "mt-2 text-sm text-[color:#9a4f42]";

  const handleFieldChange =
    (field: FieldName) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const nextValue = event.target.value;

      setValues((current) => ({
        ...current,
        [field]: nextValue,
      }));
      setTouched((current) => ({
        ...current,
        [field]: true,
      }));
      setSuccessMessage("");
      setApiErrors((current) => ({
        ...current,
        [field]: undefined,
        form: undefined,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setApiErrors({});

    const nextErrors = validateValues(values, {
      omitIncomeBudget: cachedFinancialProfile !== null,
    });
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!loanId) {
      setApiErrors({
        form: "Could not load this loan.",
      });
      return;
    }

    setSubmitting(true);
    setSuccessMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const nextMonthlyIncome =
        cachedFinancialProfile !== null
          ? cachedFinancialProfile.monthly_income
          : Number(values.monthly_income);
      const nextExtraBudget =
        cachedFinancialProfile !== null
          ? cachedFinancialProfile.extra_budget
          : Number(values.extra_budget);

      const [profileUpdate, loanUpdate] = await Promise.all([
        supabase.from("user_financial_profile").upsert({
          id: user.id,
          monthly_income: nextMonthlyIncome,
          extra_budget: nextExtraBudget,
          currency: currencyCode,
        }),
        supabase
          .from("loans")
          .update({
            loan_name: values.loan_name.trim(),
            loan_type: values.loan_type,
            servicer: values.servicer.trim(),
            balance: Number(values.balance),
            interest_rate: normalizeInterestRate(Number(values.interest_rate)),
            min_payment: Number(values.min_payment),
          })
          .eq("id", loanId)
          .eq("user_id", user.id),
      ]);

      if (profileUpdate.error || loanUpdate.error) {
        setApiErrors({
          form: "Unable to update this loan right now.",
        });
        return;
      }

      setCachedFinancialProfile({
        monthly_income: nextMonthlyIncome,
        extra_budget: nextExtraBudget,
        currency: currencyCode,
      });
      setSuccessMessage("Loan information updated!");
    } catch {
      setApiErrors({
        form: "Unable to update this loan right now.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-12">
        <header className="flex shrink-0 items-center justify-between gap-6 py-2">
          <span
            className="text-2xl font-[var(--font-brand)] tracking-[-0.04em] text-[color:var(--foreground)] sm:text-3xl"
          >
            Lonnex
          </span>
          <Link
            className="rounded-full border border-[color:var(--line)] bg-white/30 px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition duration-300 hover:border-[color:var(--accent)] hover:bg-white/55"
            href="/homepage"
          >
            Back to workspace
          </Link>
        </header>

        <section className="w-full flex-1 pt-4 pb-12 sm:pt-6">
          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-[2.75rem] border border-white/50 bg-white/44 p-6 shadow-[0_30px_80px_rgba(18,59,45,0.08)] backdrop-blur-sm sm:p-8 lg:p-10">
              {financialProfileLoading ? (
                <p className="text-sm text-[color:var(--muted)]">
                  Loading your profile…
                </p>
              ) : null}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                {showCurrencySelect ? (
                  <div className="sm:col-span-1">
                    <label
                      className="text-sm font-medium text-[color:var(--foreground)]"
                      htmlFor="currency"
                    >
                      Your currency
                    </label>
                    <select
                      className={inputClass}
                      id="currency"
                      onChange={(event) => {
                        setCurrencyCode(event.target.value);
                        setSuccessMessage("");
                      }}
                      value={currencyCode}
                    >
                      {CURRENCY_SELECT_OPTIONS.map(({ code, label }) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div
                  className={
                    showCurrencySelect ? "sm:col-span-3" : "sm:col-span-4"
                  }
                >
                  <label
                    className="text-sm font-medium text-[color:var(--foreground)]"
                    htmlFor="loan_name"
                  >
                    {FIELD_LABELS.loan_name}
                  </label>
                  <input
                    className={inputClass}
                    id="loan_name"
                    onChange={handleFieldChange("loan_name")}
                    placeholder="Example: Discover Student Loan"
                    type="text"
                    value={values.loan_name}
                  />
                  {visibleErrors.loan_name ? (
                    <p className={errorClass}>{visibleErrors.loan_name}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm font-medium text-[color:var(--foreground)]"
                    htmlFor="loan_type"
                  >
                    {FIELD_LABELS.loan_type}
                  </label>
                  <select
                    className={inputClass}
                    id="loan_type"
                    onChange={handleFieldChange("loan_type")}
                    value={values.loan_type}
                  >
                    {LOAN_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {visibleErrors.loan_type ? (
                    <p className={errorClass}>{visibleErrors.loan_type}</p>
                  ) : null}
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[color:var(--foreground)]"
                    htmlFor="servicer"
                  >
                    {FIELD_LABELS.servicer}
                  </label>
                  <input
                    className={inputClass}
                    id="servicer"
                    onChange={handleFieldChange("servicer")}
                    placeholder="Optional"
                    type="text"
                    value={values.servicer}
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[color:var(--foreground)]"
                    htmlFor="balance"
                  >
                    {`Balance (${currencySymbol})`}
                  </label>
                  <input
                    className={inputClass}
                    id="balance"
                    inputMode="decimal"
                    onChange={handleFieldChange("balance")}
                    placeholder={`${currencySymbol}12500`}
                    type="text"
                    value={values.balance}
                  />
                  {visibleErrors.balance ? (
                    <p className={errorClass}>{visibleErrors.balance}</p>
                  ) : null}
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[color:var(--foreground)]"
                    htmlFor="interest_rate"
                  >
                    {FIELD_LABELS.interest_rate}
                  </label>
                  <input
                    className={inputClass}
                    id="interest_rate"
                    inputMode="decimal"
                    onChange={handleFieldChange("interest_rate")}
                    placeholder="6.5"
                    type="text"
                    value={values.interest_rate}
                  />
                  {visibleErrors.interest_rate ? (
                    <p className={errorClass}>{visibleErrors.interest_rate}</p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label
                    className="text-sm font-medium text-[color:var(--foreground)]"
                    htmlFor="min_payment"
                  >
                    {`Minimum monthly payment (${currencySymbol})`}
                  </label>
                  <input
                    className={inputClass}
                    id="min_payment"
                    inputMode="decimal"
                    onChange={handleFieldChange("min_payment")}
                    placeholder={`${currencySymbol}150`}
                    type="text"
                    value={values.min_payment}
                  />
                  {visibleErrors.min_payment ? (
                    <p className={errorClass}>{visibleErrors.min_payment}</p>
                  ) : null}
                </div>

                {!omitIncomeBudget ? (
                  <>
                    <div>
                      <label
                        className="text-sm font-medium text-[color:var(--foreground)]"
                        htmlFor="monthly_income"
                      >
                        {`Monthly take-home income (${currencySymbol})`}
                      </label>
                      <input
                        className={inputClass}
                        id="monthly_income"
                        inputMode="decimal"
                        onChange={handleFieldChange("monthly_income")}
                        placeholder={`${currencySymbol}4200`}
                        type="text"
                        value={values.monthly_income}
                      />
                      {visibleErrors.monthly_income ? (
                        <p className={errorClass}>
                          {visibleErrors.monthly_income}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        className="text-sm font-medium text-[color:var(--foreground)]"
                        htmlFor="extra_budget"
                      >
                        {`Extra payment budget (${currencySymbol}/mo)`}
                      </label>
                      <input
                        className={inputClass}
                        id="extra_budget"
                        inputMode="decimal"
                        onChange={handleFieldChange("extra_budget")}
                        placeholder={`${currencySymbol}100`}
                        type="text"
                        value={values.extra_budget}
                      />
                      {visibleErrors.extra_budget ? (
                        <p className={errorClass}>
                          {visibleErrors.extra_budget}
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>

              {visibleErrors.form ? (
                <p className={errorClass}>{visibleErrors.form}</p>
              ) : null}

              <div className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-[color:var(--muted)]">
                  Lonnex will use this to validate the loan and start building
                  your repayment plan.
                </p>
                <div className="flex min-w-[9rem] shrink-0 flex-col items-end self-end sm:self-auto">
                  <button
                    className="inline-flex min-w-[9rem] items-center justify-center rounded-full bg-[color:var(--accent-deep)] px-6 py-3 text-sm font-medium text-white shadow-[0_16px_35px_rgba(18,59,45,0.18)] transition duration-300 hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={financialProfileLoading || submitting}
                    type="submit"
                  >
                    {submitting ? "Saving..." : "Save Loan"}
                  </button>
                  {successMessage ? (
                    <p className="mt-3 text-sm text-[color:var(--accent)]">
                      {successMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function UpdateLoanPage() {
  return (
    <Suspense fallback={null}>
      <UpdateLoanPageContent />
    </Suspense>
  );
}
