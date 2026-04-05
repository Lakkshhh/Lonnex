"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { CURRENCIES } from "@/lib/currency";

const CURRENCY_SELECT_OPTIONS = (
  Object.entries(CURRENCIES) as [keyof typeof CURRENCIES, string][]
).map(([code, symbol]) => ({
  code,
  label: `${code} (${symbol})`,
}));

type ProfileValues = {
  username: string;
  monthly_income: string;
  extra_budget: string;
  currency: string;
};

type FieldErrors = Partial<Record<keyof ProfileValues | "form", string>>;

const INITIAL_VALUES: ProfileValues = {
  username: "",
  monthly_income: "",
  extra_budget: "",
  currency: "USD",
};

export default function ProfilePage() {
  const router = useRouter();
  const [values, setValues] = useState<ProfileValues>(INITIAL_VALUES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          router.push("/login");
        }
        return;
      }

      const [{ data: profile, error: profileError }, { data: financialProfile, error: financialError }] =
        await Promise.all([
          supabase.from("profiles").select("username").eq("id", user.id).single(),
          supabase
            .from("user_financial_profile")
            .select("monthly_income, extra_budget, currency")
            .eq("id", user.id)
            .maybeSingle(),
        ]);

      if (cancelled) {
        return;
      }

      if (profileError) {
        setErrors({ form: profileError.message });
        setLoading(false);
        return;
      }

      if (financialError) {
        setErrors({ form: financialError.message });
        setLoading(false);
        return;
      }

      setValues({
        username: profile?.username ?? "",
        monthly_income:
          financialProfile?.monthly_income != null
            ? String(financialProfile.monthly_income)
            : "",
        extra_budget:
          financialProfile?.extra_budget != null
            ? String(financialProfile.extra_budget)
            : "",
        currency:
          financialProfile?.currency != null
            ? String(financialProfile.currency)
            : "USD",
      });
      setLoading(false);
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const inputClass =
    "mt-2 w-full rounded-[1.1rem] border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-base text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:bg-white/90";
  const errorClass = "mt-2 text-sm text-[color:#9a4f42]";

  const handleFieldChange =
    (field: keyof ProfileValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const nextValue = event.target.value;
      setValues((current) => ({
        ...current,
        [field]: nextValue,
      }));
      setSuccessMessage("");
      setErrors((current) => ({
        ...current,
        [field]: undefined,
        form: undefined,
      }));
    };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSuccessMessage("");
    setErrors({});

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ username: values.username })
        .eq("id", user.id);

      if (profileError) {
        setErrors({ form: profileError.message });
        return;
      }

      const { error: financialError } = await supabase
        .from("user_financial_profile")
        .update({
          monthly_income: Number(values.monthly_income),
          extra_budget: Number(values.extra_budget),
          currency: values.currency,
        })
        .eq("id", user.id);

      if (financialError) {
        setErrors({ form: financialError.message });
        return;
      }

      setSuccessMessage("Profile saved!");
    } catch {
      setErrors({ form: "Unable to save profile right now." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative min-h-screen">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-12">
        <header className="flex shrink-0 items-center justify-between gap-6 py-2">
          <span className="text-2xl font-[var(--font-brand)] tracking-[-0.04em] text-[color:var(--foreground)] sm:text-3xl">
            Lonnex Profile
          </span>
          <button
            className="rounded-full border border-[color:var(--line)] bg-white/30 px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition duration-300 hover:border-[color:var(--accent)] hover:bg-white/55"
            onClick={() => router.push("/homepage")}
            type="button"
          >
            Back to workspace
          </button>
        </header>

        <form
          className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[2.75rem] border border-white/50 bg-white/44 p-6 shadow-[0_30px_80px_rgba(18,59,45,0.08)] backdrop-blur-sm sm:mt-6 sm:p-8 lg:p-10"
          onSubmit={handleSave}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                className="text-sm font-medium text-[color:var(--foreground)]"
                htmlFor="username"
              >
                Username
              </label>
              <input
                className={inputClass}
                id="username"
                onChange={handleFieldChange("username")}
                type="text"
                value={values.username}
              />
              {errors.username ? <p className={errorClass}>{errors.username}</p> : null}
            </div>

            <div>
              <label
                className="text-sm font-medium text-[color:var(--foreground)]"
                htmlFor="monthly_income"
              >
                Monthly income
              </label>
              <input
                className={inputClass}
                id="monthly_income"
                inputMode="decimal"
                onChange={handleFieldChange("monthly_income")}
                type="number"
                value={values.monthly_income}
              />
              {errors.monthly_income ? (
                <p className={errorClass}>{errors.monthly_income}</p>
              ) : null}
            </div>

            <div>
              <label
                className="text-sm font-medium text-[color:var(--foreground)]"
                htmlFor="extra_budget"
              >
                Extra payment budget
              </label>
              <input
                className={inputClass}
                id="extra_budget"
                inputMode="decimal"
                onChange={handleFieldChange("extra_budget")}
                type="number"
                value={values.extra_budget}
              />
              {errors.extra_budget ? (
                <p className={errorClass}>{errors.extra_budget}</p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label
                className="text-sm font-medium text-[color:var(--foreground)]"
                htmlFor="currency"
              >
                Currency
              </label>
              <select
                className={inputClass}
                id="currency"
                onChange={handleFieldChange("currency")}
                value={values.currency}
              >
                {CURRENCY_SELECT_OPTIONS.map(({ code, label }) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.currency ? <p className={errorClass}>{errors.currency}</p> : null}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-start">
            <button
              className="inline-flex min-w-[9rem] items-center justify-center rounded-full bg-[color:var(--accent-deep)] px-6 py-3 text-sm font-medium text-white shadow-[0_16px_35px_rgba(18,59,45,0.18)] transition duration-300 hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading || saving}
              type="submit"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
            {successMessage ? (
              <p className="mt-3 text-sm text-[color:var(--accent)]">
                {successMessage}
              </p>
            ) : null}
            {errors.form ? <p className={errorClass}>{errors.form}</p> : null}
          </div>
        </form>
      </div>
    </main>
  );
}
