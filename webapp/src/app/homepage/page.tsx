"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { formatAmount } from "@/lib/currency";

type Loan = {
  id: string;
  loan_name: string;
  balance: number;
  min_payment: number;
};

export default function Homepage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [username, setUsername] = useState("Member");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [userCurrency, setUserCurrency] = useState("USD");
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (!menuRef.current || !(event.target instanceof Node)) {
        return;
      }

      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [menuOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadHomepageData = async (session: Session) => {
      const user = session.user;
      console.log("homepage:profiles query user id", user.id);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      console.log("homepage:profiles query result", {
        data: profile,
        error: profileError,
      });

      const { data: financialProfile, error: financialProfileError } =
        await supabase
          .from("user_financial_profile")
          .select("currency")
          .eq("id", user.id)
          .maybeSingle();

      const { data: loanRows, error: loansError } = await supabase
        .from("loans")
        .select("id, loan_name, balance, min_payment")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      console.log("homepage:extracted username", profile?.username);
      console.log("homepage:loans query result", {
        data: loanRows,
        error: loansError,
      });

      if (!isMounted) {
        return;
      }

      setUsername(profile?.username?.trim() || "Member");
      const currencyRaw =
        !financialProfileError && financialProfile?.currency != null
          ? String(financialProfile.currency).trim()
          : "";
      setUserCurrency(currencyRaw || "USD");
      setLoans(
        (loanRows ?? []).map((row) => ({
          id: row.id,
          loan_name: row.loan_name,
          balance: Number(row.balance),
          min_payment: Number(row.min_payment),
        })) as Loan[],
      );
      console.log("homepage:final loans before render", loanRows ?? []);
      setAuthResolved(true);
    };

    const handleSession = async (session: Session | null) => {
      if (!isMounted) {
        return;
      }

      if (!session) {
        setAuthResolved(true);
        router.push("/login");
        return;
      }

      await loadHomepageData(session);
    };

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        console.log("homepage:getSession result", {
          data,
          error,
        });
        return handleSession(data.session);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleLoanClick = (loanId: string) => {
    router.push(`/update-loan?loanId=${loanId}`);
  };

  return (
    authResolved ? (
      <main className="relative flex h-screen overflow-hidden">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between gap-6 py-2">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-3xl">
                Welcome to Lonnex, {username}
              </h1>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/30 text-[color:var(--foreground)] transition duration-300 hover:border-[color:var(--accent)] hover:bg-white/55"
                onClick={() => setMenuOpen((current) => !current)}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M4.75 19.25c1.7-3.18 4.26-4.75 7.25-4.75s5.55 1.57 7.25 4.75"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
              </button>

              {menuOpen ? (
                <div className="absolute right-[calc(100%+0.7rem)] top-1/2 flex whitespace-nowrap -translate-y-1/2 items-center gap-2 rounded-[1.35rem] border border-[color:var(--line)] bg-white/86 p-2 shadow-[0_20px_60px_rgba(18,59,45,0.12)] backdrop-blur-md">
                  <button
                    className="flex items-center rounded-[1rem] px-4 py-3 text-left text-sm font-medium text-[color:#9a4f42] transition hover:bg-[rgba(154,79,66,0.08)]"
                    onClick={handleSignOut}
                    type="button"
                  >
                    Sign out
                  </button>
                  <button
                    className="flex items-center rounded-[1rem] px-4 py-3 text-left text-sm font-medium text-[color:var(--foreground)] transition hover:bg-[color:var(--accent-soft)]/50"
                    onClick={() => router.push("/profile")}
                    type="button"
                  >
                    Profile
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          <section className="flex min-h-0 flex-1 flex-col pt-4">
            <div className="dashboard-scroll min-h-0 flex-1 overflow-y-auto rounded-[2.75rem] border border-white/50 bg-white/44 p-6 shadow-[0_30px_80px_rgba(18,59,45,0.08)] backdrop-blur-sm sm:p-8 lg:p-10">
              <div className="-mx-2 -mt-2 mb-6 flex justify-center gap-3 px-2 pt-2">
                <button
                  className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent-deep)] px-6 py-3 text-sm font-medium text-white shadow-[0_16px_35px_rgba(18,59,45,0.18)] transition duration-300 hover:bg-[color:var(--accent)]"
                  onClick={() => router.push("/add-loan")}
                  type="button"
                >
                  Add Loan
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent-deep)] px-6 py-3 text-sm font-medium text-white shadow-[0_16px_35px_rgba(18,59,45,0.18)] transition duration-300 hover:bg-[color:var(--accent)]"
                  onClick={() => router.push("/dashboard")}
                  type="button"
                >
                  Dashboard
                </button>
              </div>

              {loans.length === 0 ? (
                <div className="flex min-h-[calc(100%-5rem)] flex-col items-center justify-center px-6 py-12 text-center">
                  <p className="font-display text-4xl leading-tight tracking-tight text-[color:var(--foreground)] sm:text-5xl">
                    You haven&apos;t added any loans yet.
                  </p>
                  <p className="mt-5 max-w-xl text-lg leading-8 text-[color:var(--muted)]">
                    Once you add your first loan, Lonnex will start shaping your
                    payoff plan and show you where to focus first.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...loans].reverse().map((loan) => (
                    <article
                      className="rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-[0_18px_60px_rgba(18,59,45,0.05)] transition duration-300 hover:border-[color:var(--accent)]/40 hover:bg-white/82 sm:p-6"
                      key={loan.id}
                      onClick={() => handleLoanClick(loan.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleLoanClick(loan.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div>
                        <div>
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                            Loan
                          </p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--foreground)]">
                            {loan.loan_name}
                          </h3>
                          <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                            Balance{" "}
                            {formatAmount(loan.balance, userCurrency)}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                            Min. payment{" "}
                            {formatAmount(loan.min_payment, userCurrency)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
        <style jsx global>{`
          .dashboard-scroll {
            scrollbar-color: rgba(91, 109, 99, 0.42) transparent;
            scrollbar-width: thin;
          }

          .dashboard-scroll::-webkit-scrollbar {
            width: 10px;
          }

          .dashboard-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .dashboard-scroll::-webkit-scrollbar-thumb {
            background: rgba(91, 109, 99, 0.42);
            border-radius: 9999px;
            border: 2px solid transparent;
            background-clip: padding-box;
          }
        `}</style>
      </main>
    ) : null
  );
}
