"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type FieldErrors = {
  password?: string;
  confirmPassword?: string;
  form?: string;
};

const validateRequired = (value: string, label: string) =>
  value.trim() ? undefined : `${label} is required.`;

const validatePassword = (password: string) =>
  password.length >= 10
    ? undefined
    : "Password must be at least 10 characters.";

const getRecoveryTokens = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<{
    title: string;
    detail: string;
  } | null>(null);

  const errorClass = "mt-2 text-sm text-[color:#9a4f42]";
  const inputClass =
    "mt-2 w-full rounded-[1.1rem] border border-[color:var(--line)] bg-white/75 px-4 py-3 text-base text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:bg-white";

  const handleSubmit = async () => {
    const nextErrors: FieldErrors = {
      password:
        validateRequired(password, "New password") ??
        validatePassword(password),
      confirmPassword:
        validateRequired(confirmPassword, "Confirm password") ??
        (confirmPassword === password
          ? undefined
          : "Retyped password must match password."),
    };

    if (nextErrors.password || nextErrors.confirmPassword) {
      setErrors(nextErrors);
      setSuccessMessage(null);
      return;
    }

    const tokens = getRecoveryTokens();

    if (!tokens) {
      setErrors({
        form: "This reset link is invalid or has expired. Please request a new one.",
      });
      setSuccessMessage(null);
      return;
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    if (sessionError) {
      setErrors({
        form: sessionError.message,
      });
      setSuccessMessage(null);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setErrors({
        form: updateError.message,
      });
      setSuccessMessage(null);
      return;
    }

    setErrors({});
    setSuccessMessage({
      title: "Password updated.",
      detail: "You’re all set. Redirecting you back to login now.",
    });

    window.setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(255,255,255,0.9),transparent_24%),radial-gradient(circle_at_84%_8%,rgba(31,107,79,0.14),transparent_20%)]" />

      <header className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between rounded-full border border-white/45 bg-[rgba(242,239,231,0.72)] px-4 py-3 shadow-[0_10px_40px_rgba(18,59,45,0.06)] backdrop-blur-md sm:px-6">
            <Link
              className="text-3xl leading-none font-[var(--font-brand)] tracking-[-0.05em] text-[color:var(--foreground)] sm:text-4xl"
              href="/"
            >
              Lonnex
            </Link>
            <Link
              className="rounded-full border border-[color:var(--line)] bg-white/70 px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition duration-300 hover:border-[color:var(--accent)] hover:bg-white"
              href="/login"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto min-h-screen max-w-7xl px-6 pb-10 pt-28 sm:px-8 sm:pb-12 lg:grid lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:gap-14 lg:px-12 lg:pb-16 lg:pt-36">
        <div className="relative hidden max-w-xl self-center lg:block">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
            Reset your password
          </p>
          <h1 className="mt-5 font-display text-5xl leading-[1.04] tracking-tight text-[color:var(--foreground)] sm:text-6xl">
            Set a fresh password and get back to your plan.
          </h1>
          <p className="mt-7 text-lg leading-8 text-[color:var(--muted)] sm:text-xl">
            Choose a new password, confirm it, and jump right back into
            comparing strategies, simulating scenarios, and planning with
            Lonnex.
          </p>
        </div>

        <div className="relative mx-auto max-w-xl self-center lg:mx-0">
          <div className="absolute inset-0 rounded-[2.75rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.85),transparent_32%),linear-gradient(160deg,rgba(255,255,255,0.52),rgba(217,236,222,0.5)_42%,rgba(18,59,45,0.14)_100%)]" />
          <div className="relative rounded-[2.75rem] border border-white/50 bg-white/72 p-5 shadow-[0_30px_80px_rgba(18,59,45,0.1)] backdrop-blur-md sm:p-7">
            <div className="mt-2 rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-6">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                Secure your account
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">
                Create your new password.
              </h2>

              {successMessage ? (
                <div className="mt-8 rounded-[1.5rem] border border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/60 p-5">
                  <p className="text-lg font-semibold text-[color:var(--accent-deep)]">
                    {successMessage.title}
                  </p>
                  <p className="mt-2 text-base leading-7 text-[color:var(--accent-deep)]">
                    {successMessage.detail}
                  </p>
                </div>
              ) : (
                <form
                  className="mt-8"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSubmit();
                  }}
                >
                  <label className="block text-sm font-medium text-[color:var(--foreground)]">
                    New password
                    <input
                      className={inputClass}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setErrors((current) => ({
                          ...current,
                          password: undefined,
                          form: undefined,
                        }));
                      }}
                      required
                      type="password"
                      value={password}
                    />
                    {errors.password ? (
                      <p className={errorClass}>{errors.password}</p>
                    ) : null}
                  </label>

                  <label className="mt-5 block text-sm font-medium text-[color:var(--foreground)]">
                    Confirm password
                    <input
                      className={inputClass}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setErrors((current) => ({
                          ...current,
                          confirmPassword: undefined,
                          form: undefined,
                        }));
                      }}
                      required
                      type="password"
                      value={confirmPassword}
                    />
                    {errors.confirmPassword ? (
                      <p className={errorClass}>{errors.confirmPassword}</p>
                    ) : null}
                  </label>

                  {errors.form ? (
                    <p className={errorClass}>{errors.form}</p>
                  ) : null}

                  <button
                    className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[color:var(--accent-deep)] px-6 py-3.5 text-base font-semibold text-white transition duration-300 hover:bg-[color:var(--accent)]"
                    type="submit"
                  >
                    Update password
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
