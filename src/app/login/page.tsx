"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Tab = "login" | "signup";

type LoginValues = {
  identifier: string;
  password: string;
};

type SignUpValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type FieldErrors = {
  username?: string;
  identifier?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

const validateRequired = (value: string, label: string) =>
  value.trim() ? undefined : `${label} is required.`;

const validateEmail = (email: string) =>
  email.includes("@") ? undefined : "Email must contain @.";

const validatePassword = (password: string) =>
  password.length >= 10
    ? undefined
    : "Password must be at least 10 characters.";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [loginValues, setLoginValues] = useState<LoginValues>({
    identifier: "",
    password: "",
  });
  const [signUpValues, setSignUpValues] = useState<SignUpValues>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loginErrors, setLoginErrors] = useState<FieldErrors>({});
  const [signUpErrors, setSignUpErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<{
    title: string;
    detail: string;
  } | null>(null);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const switchTab = (nextTab: Tab) => {
    setTab(nextTab);
    setLoginErrors({});
    setSignUpErrors({});
    setSuccessMessage(null);
    setShowResetForm(false);
    setResetEmail("");
    setResetError(null);
    setResetSuccess(null);
  };

  const handleLogin = async () => {
    const nextErrors: FieldErrors = {
      identifier: validateRequired(
        loginValues.identifier,
        "Username or email"
      ),
      password:
        validateRequired(loginValues.password, "Password") ??
        validatePassword(loginValues.password),
    };

    if (nextErrors.identifier || nextErrors.password) {
      setLoginErrors(nextErrors);
      setSuccessMessage(null);
      return;
    }

    const response = await fetch("/api/auth/login", {
      body: JSON.stringify({
        identifier: loginValues.identifier,
        password: loginValues.password,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const result = (await response.json()) as {
      error?: string;
      session?: {
        access_token: string;
        refresh_token: string;
      } | null;
    };

    if (!response.ok) {
      setLoginErrors({
        form: result.error ?? "Incorrect email or password.",
      });
      setSuccessMessage(null);
      return;
    }

    setLoginErrors({});
    setSuccessMessage({
      title: "You’re in.",
      detail: "Nice work. Your loan plan is ready for the next step.",
    });
    if (result.session) {
      await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });
    }
    window.setTimeout(() => {
      router.push("/homepage");
    }, 2000);
  };

  const handleResetPassword = async () => {
    const emailError =
      validateRequired(resetEmail, "Email") ?? validateEmail(resetEmail);

    if (emailError) {
      setResetError(emailError);
      setResetSuccess(null);
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      body: JSON.stringify({ email: resetEmail }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const result = (await response.json()) as { error?: string; message?: string };

    if (!response.ok) {
      setResetError(
        result.error ?? "Something went wrong while sending the reset link."
      );
      setResetSuccess(null);
      return;
    }

    setResetError(null);
    setResetSuccess(result.message ?? "Check your email for a reset link.");
  };

  const handleSignUp = async () => {
    const nextErrors: FieldErrors = {
      username: validateRequired(signUpValues.username, "Username"),
      email:
        validateRequired(signUpValues.email, "Email") ??
        validateEmail(signUpValues.email),
      password:
        validateRequired(signUpValues.password, "Password") ??
        validatePassword(signUpValues.password),
      confirmPassword:
        validateRequired(signUpValues.confirmPassword, "Retype password") ??
        (signUpValues.confirmPassword === signUpValues.password
          ? undefined
          : "Retyped password must match password."),
    };

    if (
      nextErrors.username ||
      nextErrors.email ||
      nextErrors.password ||
      nextErrors.confirmPassword
    ) {
      setSignUpErrors(nextErrors);
      setSuccessMessage(null);
      return;
    }

    const response = await fetch("/api/auth/signup", {
      body: JSON.stringify({
        email: signUpValues.email,
        password: signUpValues.password,
        username: signUpValues.username,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const result = (await response.json()) as {
      error?: string;
      session?: {
        access_token: string;
        refresh_token: string;
      } | null;
    };

    if (!response.ok) {
      setSignUpErrors({
        form: result.error ?? "An account with this email already exists.",
      });
      setSuccessMessage(null);
      return;
    }

    setSignUpErrors({});
    setSuccessMessage({
      title: "Account created.",
      detail: "Congratulations. You’re all set to start planning with Lonnex.",
    });
    if (result.session) {
      await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });
    }
    window.setTimeout(() => {
      router.push("/homepage");
    }, 2000);
  };

  const errorClass = "mt-2 text-sm text-[color:#9a4f42]";
  const inputClass =
    "mt-2 w-full rounded-[1.1rem] border border-[color:var(--line)] bg-white/75 px-4 py-3 text-base text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:bg-white";

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
              href="/"
            >
              Back Home
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto min-h-screen max-w-7xl px-6 pb-10 pt-28 sm:px-8 sm:pb-12 lg:grid lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:gap-14 lg:px-12 lg:pb-16 lg:pt-36">
        <div className="relative hidden max-w-xl self-center lg:block">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
            Access your plan
          </p>
          <h1 className="mt-5 font-display text-5xl leading-[1.04] tracking-tight text-[color:var(--foreground)] sm:text-6xl">
            Some days loan planning feels like pushing a boulder uphill.
          </h1>
          <p className="mt-7 text-lg leading-8 text-[color:var(--muted)] sm:text-xl">
            Lonnex is the part where the numbers finally start making sense.
            Log in to compare strategies, test what-if scenarios, and get
            agent-backed guidance that makes the climb feel a lot less chaotic.
          </p>

        </div>

        <div className="relative mx-auto max-w-xl self-center lg:mx-0">
          <div className="absolute inset-0 rounded-[2.75rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.85),transparent_32%),linear-gradient(160deg,rgba(255,255,255,0.52),rgba(217,236,222,0.5)_42%,rgba(18,59,45,0.14)_100%)]" />
          <div className="relative rounded-[2.75rem] border border-white/50 bg-white/72 p-5 shadow-[0_30px_80px_rgba(18,59,45,0.1)] backdrop-blur-md sm:p-7">
            <div className="relative inline-flex rounded-full border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-1">
              <span
                aria-hidden="true"
                className={`absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-[color:var(--accent-deep)] transition-transform duration-300 ease-out ${
                  tab === "signup" ? "translate-x-full" : "translate-x-0"
                }`}
                style={{ left: "0.25rem" }}
              />
              <button
                className={`relative z-10 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                  tab === "login"
                    ? "text-white"
                    : "text-[color:var(--muted)]"
                }`}
                onClick={() => switchTab("login")}
                type="button"
              >
                Login
              </button>
              <button
                className={`relative z-10 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                  tab === "signup"
                    ? "text-white"
                    : "text-[color:var(--muted)]"
                }`}
                onClick={() => switchTab("signup")}
                type="button"
              >
                Sign Up
              </button>
            </div>

            <div className="mt-8 rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-6">
              {tab === "login" ? (
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                    Welcome back
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">
                    Log in to your workspace.
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
                  ) : showResetForm ? (
                    resetSuccess ? (
                      <div className="mt-8 rounded-[1.5rem] border border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/60 p-5">
                        <p className="text-lg font-semibold text-[color:var(--accent-deep)]">
                          Check your email for a reset link.
                        </p>
                        <p className="mt-2 text-base leading-7 text-[color:var(--accent-deep)]">
                          We sent a password reset link to the email address you
                          entered.
                        </p>
                      </div>
                    ) : (
                      <form
                        className="mt-8"
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleResetPassword();
                        }}
                      >
                        <label className="block text-sm font-medium text-[color:var(--foreground)]">
                          Email
                          <input
                            className={inputClass}
                            onChange={(event) => {
                              setResetEmail(event.target.value);
                              setResetError(null);
                            }}
                            required
                            type="email"
                            value={resetEmail}
                          />
                          {resetError ? (
                            <p className={errorClass}>{resetError}</p>
                          ) : null}
                        </label>

                        <button
                          className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[color:var(--accent-deep)] px-6 py-3.5 text-base font-semibold text-white transition duration-300 hover:bg-[color:var(--accent)]"
                          type="submit"
                        >
                          Send reset link
                        </button>
                      </form>
                    )
                  ) : (
                    <form
                      className="mt-8"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleLogin();
                      }}
                    >
                      <label className="block text-sm font-medium text-[color:var(--foreground)]">
                        Username / Email
                        <input
                          className={inputClass}
                          onChange={(event) =>
                            setLoginValues((current) => ({
                              ...current,
                              identifier: event.target.value,
                            }))
                          }
                          required
                          type="text"
                          value={loginValues.identifier}
                        />
                        {loginErrors.identifier ? (
                          <p className={errorClass}>{loginErrors.identifier}</p>
                        ) : null}
                      </label>

                      <label className="mt-5 block text-sm font-medium text-[color:var(--foreground)]">
                        Password
                        <input
                          className={inputClass}
                          onChange={(event) =>
                            setLoginValues((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                          required
                          type="password"
                          value={loginValues.password}
                        />
                        {loginErrors.password ? (
                          <p className={errorClass}>{loginErrors.password}</p>
                        ) : null}
                      </label>

                      <button
                        className="mt-3 text-sm font-medium text-[color:var(--accent)] transition hover:text-[color:var(--accent-deep)]"
                        onClick={() => {
                          setShowResetForm(true);
                          setResetError(null);
                          setResetSuccess(null);
                        }}
                        type="button"
                      >
                        Forgot password?
                      </button>

                      {loginErrors.form ? (
                        <p className={errorClass}>{loginErrors.form}</p>
                      ) : null}

                      <button
                        className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[color:var(--accent-deep)] px-6 py-3.5 text-base font-semibold text-white transition duration-300 hover:bg-[color:var(--accent)]"
                        type="submit"
                      >
                        Log In
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                    Create your account
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">
                    Start your plan with Lonnex.
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
                        handleSignUp();
                      }}
                    >
                      <label className="block text-sm font-medium text-[color:var(--foreground)]">
                        Username
                        <input
                          className={inputClass}
                          onChange={(event) =>
                            setSignUpValues((current) => ({
                              ...current,
                              username: event.target.value,
                            }))
                          }
                          required
                          type="text"
                          value={signUpValues.username}
                        />
                        {signUpErrors.username ? (
                          <p className={errorClass}>{signUpErrors.username}</p>
                        ) : null}
                      </label>

                      <label className="mt-5 block text-sm font-medium text-[color:var(--foreground)]">
                        Email
                        <input
                          className={inputClass}
                          onChange={(event) =>
                            setSignUpValues((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          required
                          type="email"
                          value={signUpValues.email}
                        />
                        {signUpErrors.email ? (
                          <p className={errorClass}>{signUpErrors.email}</p>
                        ) : null}
                      </label>

                      <label className="block text-sm font-medium text-[color:var(--foreground)]">
                        Password
                        <input
                          className={inputClass}
                          onChange={(event) =>
                            setSignUpValues((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                          required
                          type="password"
                          value={signUpValues.password}
                        />
                        {signUpErrors.password ? (
                          <p className={errorClass}>{signUpErrors.password}</p>
                        ) : null}
                      </label>

                      <label className="mt-5 block text-sm font-medium text-[color:var(--foreground)]">
                        Confirm Password
                        <input
                          className={inputClass}
                          onChange={(event) =>
                            setSignUpValues((current) => ({
                              ...current,
                              confirmPassword: event.target.value,
                            }))
                          }
                          required
                          type="password"
                          value={signUpValues.confirmPassword}
                        />
                        {signUpErrors.confirmPassword ? (
                          <p className={errorClass}>
                            {signUpErrors.confirmPassword}
                          </p>
                        ) : null}
                      </label>

                      {signUpErrors.form ? (
                        <p className={errorClass}>{signUpErrors.form}</p>
                      ) : null}

                      <button
                        className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[color:var(--accent-deep)] px-6 py-3.5 text-base font-semibold text-white transition duration-300 hover:bg-[color:var(--accent)]"
                        type="submit"
                      >
                        Create Account
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
