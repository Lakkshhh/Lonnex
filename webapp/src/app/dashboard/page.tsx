"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CURRENCIES, formatAmount } from "@/lib/currency";
import { supabase } from "@/lib/supabase";

type StrategyKey = "avalanche" | "snowball" | "standard" | "minimum_only";

type SchedulePoint = {
  month: number;
  total_balance: number;
  interest: number;
  principal: number;
};

type StrategySummary = {
  schedule: SchedulePoint[];
  total_interest: number;
  payoff_months: number;
  payoff_date: string;
};

type StrategyResult = Record<StrategyKey, StrategySummary> & {
  winner: StrategyKey;
  winner_saves: number;
  total_debt: number;
  monthly_payment: number;
};

type ChartRow = {
  label: string;
  month: number;
  avalanche: number;
  snowball: number;
  standard: number;
  minimumOnly: number;
  avalancheSnowballGap: number;
};

type CustomTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{
    color?: string;
    dataKey?: string;
    value?: number;
  }>;
};

const STRATEGY_ORDER: StrategyKey[] = [
  "avalanche",
  "snowball",
  "standard",
  "minimum_only",
];

const STRATEGY_LABELS: Record<StrategyKey, string> = {
  avalanche: "Avalanche",
  snowball: "Snowball",
  standard: "Standard",
  minimum_only: "Minimum only",
};

const STRATEGY_COLORS: Record<StrategyKey, string> = {
  avalanche: "var(--chart-smart)",
  snowball: "var(--chart-extra)",
  standard: "var(--accent)",
  minimum_only: "var(--chart-minimum)",
};

function formatPayoffDate(value: string): string {
  const [year, month] = value.split("-");
  const parsedYear = Number(year);
  const parsedMonth = Number(month);

  if (!parsedYear || !parsedMonth) {
    return value;
  }

  return new Date(parsedYear, parsedMonth - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function getScheduleBalance(
  schedule: SchedulePoint[],
  month: number,
  initialBalance: number,
): number {
  if (month === 0) {
    return initialBalance;
  }

  const exactMatch = schedule.find((point) => point.month === month);
  if (exactMatch) {
    return exactMatch.total_balance;
  }

  const lastPoint = schedule[schedule.length - 1];
  if (!lastPoint || month > lastPoint.month) {
    return 0;
  }

  const nearestPoint = schedule.find((point) => point.month >= month);
  return nearestPoint?.total_balance ?? 0;
}

function buildChartData(result: StrategyResult): ChartRow[] {
  const maxMonths = Math.max(
    12,
    ...STRATEGY_ORDER.map((strategy) => result[strategy].payoff_months),
  );
  const maxYear = Math.ceil(maxMonths / 12);

  return Array.from({ length: maxYear + 1 }, (_, index) => {
    const month = index * 12;
    return {
      label: index === 0 ? "Today" : `Year ${index}`,
      month,
      avalanche: getScheduleBalance(
        result.avalanche.schedule,
        month,
        result.total_debt,
      ),
      snowball: getScheduleBalance(
        result.snowball.schedule,
        month,
        result.total_debt,
      ),
      standard: getScheduleBalance(
        result.standard.schedule,
        month,
        result.total_debt,
      ),
      minimumOnly: getScheduleBalance(
        result.minimum_only.schedule,
        month,
        result.total_debt,
      ),
      avalancheSnowballGap: Math.abs(
        getScheduleBalance(result.avalanche.schedule, month, result.total_debt) -
          getScheduleBalance(result.snowball.schedule, month, result.total_debt),
      ),
    };
  });
}

function getDivergencePoint(chartData: ChartRow[]) {
  return chartData.reduce<ChartRow | null>((best, current) => {
    if (current.month === 0) {
      return best;
    }

    if (!best || current.avalancheSnowballGap > best.avalancheSnowballGap) {
      return current;
    }

    return best;
  }, null);
}

function getBadgeContent(
  strategy: StrategyKey,
  result: StrategyResult,
  currency: string,
): string {
  if (strategy === result.winner) {
    return "Best for you";
  }

  if (strategy === "standard") {
    return "baseline";
  }

  if (strategy === "minimum_only") {
    return `${formatAmount(
      result.minimum_only.total_interest - result.standard.total_interest,
      currency,
    )} more than standard`;
  }

  return `saves ${formatAmount(
    result.standard.total_interest - result[strategy].total_interest,
    currency,
  )} vs. standard`;
}

function getValueColorClass(
  strategy: StrategyKey,
  winner: StrategyKey,
): string {
  if (strategy === winner) {
    return "text-[color:var(--accent)]";
  }

  if (strategy === "minimum_only") {
    return "text-[color:#9a4f42]";
  }

  return "text-[color:var(--foreground)]";
}

function getBadgeClass(strategy: StrategyKey, winner: StrategyKey): string {
  if (strategy === winner) {
    return "bg-[color:var(--accent-soft)] text-[color:var(--accent-deep)]";
  }

  if (strategy === "standard") {
    return "bg-white/80 text-[color:var(--muted)]";
  }

  if (strategy === "minimum_only") {
    return "bg-white/80 text-[color:#9a4f42]";
  }

  return "bg-[color:var(--accent-soft)]/60 text-[color:var(--accent-deep)]";
}

function DashboardTooltip({
  active,
  label,
  payload,
  currency,
}: CustomTooltipProps & { currency: string }) {
  if (!active || !payload?.length) {
    return null;
  }

  const items = [
    {
      label: "Avalanche",
      value: Number(
        payload.find((item) => item.dataKey === "avalanche")?.value ?? 0,
      ),
      color: STRATEGY_COLORS.avalanche,
    },
    {
      label: "Snowball",
      value: Number(
        payload.find((item) => item.dataKey === "snowball")?.value ?? 0,
      ),
      color: STRATEGY_COLORS.snowball,
    },
    {
      label: "Standard",
      value: Number(
        payload.find((item) => item.dataKey === "standard")?.value ?? 0,
      ),
      color: STRATEGY_COLORS.standard,
    },
    {
      label: "Minimum only",
      value: Number(
        payload.find((item) => item.dataKey === "minimumOnly")?.value ?? 0,
      ),
      color: STRATEGY_COLORS.minimum_only,
    },
  ];

  return (
    <div
      className="rounded-[1.2rem] border bg-[color:var(--surface-strong)] px-4 py-3 shadow-sm"
      style={{ borderColor: "var(--line)" }}
    >
      <p className="text-sm font-semibold text-[color:var(--foreground)]">
        {label}
      </p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div className="flex items-start justify-between gap-4 text-sm" key={item.label}>
            <div>
              <span className="font-medium" style={{ color: item.color }}>
                {item.label}
              </span>
            </div>
            <span className="font-medium text-[color:var(--foreground)]">
              {formatAmount(Number(item.value ?? 0), currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<StrategyResult | null>(null);
  const [userCurrency, setUserCurrency] = useState("USD");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLoanCount, setSelectedLoanCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token || !session.user) {
          router.push("/login");
          return;
        }

        const userId = session.user.id;

        const [currencyResponse, loansResponse] = await Promise.all([
          supabase
            .from("user_financial_profile")
            .select("currency")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("loans")
            .select("id")
            .eq("user_id", userId),
        ]);

        if (cancelled) {
          return;
        }

        const loanIds = (loansResponse.data ?? []).map((loan) => loan.id);
        if (loanIds.length === 0) {
          setError("Add at least one loan to see your dashboard.");
          setLoading(false);
          return;
        }

        setSelectedLoanCount(loanIds.length);

        const pipelineResponse = await fetch("http://localhost:8000/pipeline/run", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            loan_ids: loanIds,
          }),
        });

        if (cancelled) {
          return;
        }

        const currencyValue = String(currencyResponse.data?.currency || "USD")
          .trim()
          .toUpperCase();
        setUserCurrency(currencyValue || "USD");

        const pipelineResult = (await pipelineResponse.json()) as
          | StrategyResult
          | { detail?: string; error?: string };

        if (!pipelineResponse.ok) {
          setError(
            "detail" in pipelineResult
              ? pipelineResult.detail ||
                  pipelineResult.error ||
                  "Unable to build your dashboard right now."
              : "Unable to build your dashboard right now.",
          );
          setLoading(false);
          return;
        }

        setDashboardData(pipelineResult as StrategyResult);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Unable to build your dashboard right now.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const chartData = useMemo(
    () => (dashboardData ? buildChartData(dashboardData) : []),
    [dashboardData],
  );
  const divergencePoint = useMemo(
    () => getDivergencePoint(chartData),
    [chartData],
  );

  const currencySymbol = CURRENCIES[userCurrency] ?? CURRENCIES.USD;

  const axisFormatter = (value: number) => `${currencySymbol}${Math.round(value / 1000)}k`;

  if (loading) {
    return (
      <main className="relative flex h-screen overflow-hidden">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between gap-6 py-2">
            <span className="text-2xl font-[var(--font-brand)] tracking-[-0.04em] text-[color:var(--foreground)] sm:text-3xl">
              Lonnex
            </span>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                className="rounded-full bg-[color:var(--foreground)] px-6 py-3 text-sm font-medium text-white"
                type="button"
              >
                Dashboard
              </button>
              {["Simulate", "Action plan", "AI brief"].map((label) => (
                <button
                  className="rounded-full border border-[color:var(--line)] bg-white/30 px-5 py-3 text-sm font-medium text-[color:var(--muted)]"
                  key={label}
                  onClick={
                    label === "Simulate"
                      ? () => router.push("/simulate")
                      : undefined
                  }
                  type="button"
                >
                  {label}
                </button>
              ))}
              <button
                className="rounded-full border border-[color:var(--line)] bg-white/30 px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition duration-300 hover:border-[color:var(--accent)] hover:bg-white/55"
                onClick={() => router.push("/homepage")}
                type="button"
              >
                Back to workspace
              </button>
            </div>
          </header>

          <section className="flex min-h-0 flex-1 items-center justify-center py-8">
            <div className="w-full max-w-3xl rounded-[2.75rem] border border-white/50 bg-white/44 p-8 text-center shadow-[0_30px_80px_rgba(18,59,45,0.08)] backdrop-blur-sm">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
                Building dashboard
              </p>
              <p className="mt-4 font-display text-4xl leading-tight tracking-tight text-[color:var(--foreground)] sm:text-5xl">
                Running your payoff analysis now.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (error || !dashboardData) {
    return (
      <main className="relative flex h-screen overflow-hidden">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between gap-6 py-2">
            <span className="text-2xl font-[var(--font-brand)] tracking-[-0.04em] text-[color:var(--foreground)] sm:text-3xl">
              Lonnex
            </span>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                className="rounded-full bg-[color:var(--foreground)] px-6 py-3 text-sm font-medium text-white"
                type="button"
              >
                Dashboard
              </button>
              {["Simulate", "Action plan", "AI brief"].map((label) => (
                <button
                  className="rounded-full border border-[color:var(--line)] bg-white/30 px-5 py-3 text-sm font-medium text-[color:var(--muted)]"
                  key={label}
                  onClick={
                    label === "Simulate"
                      ? () => router.push("/simulate")
                      : undefined
                  }
                  type="button"
                >
                  {label}
                </button>
              ))}
              <button
                className="rounded-full border border-[color:var(--line)] bg-white/30 px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition duration-300 hover:border-[color:var(--accent)] hover:bg-white/55"
                onClick={() => router.push("/homepage")}
                type="button"
              >
                Back to workspace
              </button>
            </div>
          </header>

          <section className="flex min-h-0 flex-1 items-center justify-center py-8">
            <div className="w-full max-w-3xl rounded-[2.75rem] border border-white/50 bg-white/44 p-8 text-center shadow-[0_30px_80px_rgba(18,59,45,0.08)] backdrop-blur-sm">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
                Dashboard unavailable
              </p>
              <p className="mt-4 text-lg leading-8 text-[color:var(--muted)]">
                {error || "Unable to build your dashboard right now."}
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const winnerLabel = STRATEGY_LABELS[dashboardData.winner];
  const winnerResult = dashboardData[dashboardData.winner];

  return (
    <main className="relative flex h-screen overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-6 py-2">
          <span className="text-2xl font-[var(--font-brand)] tracking-[-0.04em] text-[color:var(--foreground)] sm:text-3xl">
            Lonnex
          </span>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              className="rounded-full bg-[color:var(--foreground)] px-6 py-3 text-sm font-medium text-white shadow-[0_10px_30px_rgba(18,59,45,0.08)]"
              type="button"
            >
              Dashboard
            </button>
            {["Simulate", "Action plan", "AI brief"].map((label) => (
              <button
                className="rounded-full border border-[color:var(--line)] bg-white/30 px-5 py-3 text-sm font-medium text-[color:var(--muted)] transition duration-300 hover:border-[color:var(--accent)] hover:bg-white/55"
                key={label}
                onClick={
                  label === "Simulate"
                    ? () => router.push("/simulate")
                    : undefined
                }
                type="button"
              >
                {label}
              </button>
            ))}
            <button
              className="rounded-full border border-[color:var(--line)] bg-white/30 px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition duration-300 hover:border-[color:var(--accent)] hover:bg-white/55"
              onClick={() => router.push("/homepage")}
              type="button"
            >
              Back to workspace
            </button>
          </div>
        </header>

        <section className="dashboard-scroll min-h-0 flex-1 overflow-y-auto pb-6 pt-4">
          <div className="space-y-14">
            <section>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
                Your payoff analysis
              </p>
              <h1 className="mt-4 max-w-5xl font-display text-4xl leading-[1.05] tracking-tight text-[color:var(--foreground)] sm:text-5xl lg:text-6xl">
                {winnerLabel} saves you{" "}
                <span className="italic text-[color:var(--accent)]">
                  {formatAmount(dashboardData.winner_saves, userCurrency)}
                </span>{" "}
                vs. standard
              </h1>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Total debt",
                    value: formatAmount(dashboardData.total_debt, userCurrency),
                    subtitle: `across ${selectedLoanCount} ${
                      selectedLoanCount === 1 ? "loan" : "loans"
                    }`,
                    valueClass: "text-[color:var(--foreground)]",
                  },
                  {
                    label: "Best payoff date",
                    value: formatPayoffDate(winnerResult.payoff_date),
                    subtitle: `${winnerLabel.toLowerCase()} strategy`,
                    valueClass: "text-[color:var(--accent)]",
                  },
                  {
                    label: "Interest saved",
                    value: formatAmount(dashboardData.winner_saves, userCurrency),
                    subtitle: "vs. standard plan",
                    valueClass: "text-[color:var(--accent)]",
                  },
                  {
                    label: "Monthly payment",
                    value: formatAmount(dashboardData.monthly_payment, userCurrency),
                    subtitle: "recommended",
                    valueClass: "text-[color:var(--foreground)]",
                  },
                ].map((card) => (
                  <div
                    className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(18,59,45,0.06)] backdrop-blur-sm"
                    key={card.label}
                  >
                    <p className="text-sm font-medium text-[color:var(--muted)]">
                      {card.label}
                    </p>
                    <p
                      className={`mt-4 font-mono text-4xl tracking-tight ${card.valueClass}`}
                    >
                      {card.value}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                      {card.subtitle}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
                Strategy comparison
              </p>
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {STRATEGY_ORDER.map((strategy) => {
                  const summary = dashboardData[strategy];
                  const isWinner = strategy === dashboardData.winner;
                  const valueClass = getValueColorClass(strategy, dashboardData.winner);

                  return (
                    <article
                      className={`relative rounded-[2rem] border bg-[color:var(--surface)] p-6 shadow-[0_18px_60px_rgba(18,59,45,0.05)] ${
                        isWinner
                          ? "border-[color:var(--accent)]"
                          : "border-[color:var(--line)]"
                      }`}
                      key={strategy}
                    >
                      {isWinner ? (
                        <span
                          className={`absolute left-6 top-0 -translate-y-1/2 rounded-full px-4 py-1.5 text-sm font-semibold ${getBadgeClass(
                            strategy,
                            dashboardData.winner,
                          )}`}
                        >
                          {getBadgeContent(strategy, dashboardData, userCurrency)}
                        </span>
                      ) : null}

                      <h2 className="text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">
                        {STRATEGY_LABELS[strategy]}
                      </h2>

                      <div className="mt-6 space-y-6">
                        <div>
                          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                            Total interest
                          </p>
                          <p className={`mt-2 font-mono text-4xl ${valueClass}`}>
                            {formatAmount(summary.total_interest, userCurrency)}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                            Payoff date
                          </p>
                          <p className={`mt-2 font-mono text-3xl ${valueClass}`}>
                            {formatPayoffDate(summary.payoff_date)}
                          </p>
                        </div>
                      </div>

                      {!isWinner ? (
                        <span
                          className={`mt-8 inline-flex rounded-[0.85rem] px-4 py-2 text-sm font-semibold ${getBadgeClass(
                            strategy,
                            dashboardData.winner,
                          )}`}
                        >
                          {getBadgeContent(strategy, dashboardData, userCurrency)}
                        </span>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/74 p-4 shadow-[0_30px_80px_rgba(18,59,45,0.08)] backdrop-blur-sm sm:p-6">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                    Named strategies
                  </p>
                  <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-[color:var(--foreground)] sm:text-5xl">
                    Avalanche vs. Snowball vs. Standard vs. Minimum only
                  </h2>
                </div>
                <div className="flex max-w-[16rem] flex-col gap-3 lg:items-end">
                  <p className="text-sm leading-6 text-[color:var(--muted)] lg:text-right">
                    Tap or hover the chart to compare balances year by year.
                  </p>
                </div>
              </div>

              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  {[
                  { key: "avalanche", label: "Avalanche", dashed: false, dotted: false },
                  { key: "snowball", label: "Snowball", dashed: false, dotted: true },
                  { key: "standard", label: "Standard", dashed: true },
                  { key: "minimum_only", label: "Minimum only", dashed: false, dotted: false },
                  ].map((item) => (
                    <div
                      className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]"
                      key={item.key}
                    >
                      <span
                        aria-hidden="true"
                        className="block h-[5px] w-12 shrink-0 rounded-full"
                        style={
                          item.dashed
                            ? {
                                backgroundImage: `repeating-linear-gradient(to right, ${STRATEGY_COLORS.standard} 0 12px, transparent 12px 18px)`,
                              }
                            : item.dotted
                              ? {
                                  backgroundImage: `repeating-linear-gradient(to right, ${STRATEGY_COLORS.snowball} 0 7px, transparent 7px 11px)`,
                                }
                            : {
                                backgroundColor:
                                  STRATEGY_COLORS[item.key as StrategyKey],
                              }
                        }
                      />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
                {divergencePoint ? (
                  <div className="inline-flex items-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface-strong)]/92 px-4 py-2 text-sm text-[color:var(--muted)] lg:ml-4 lg:shrink-0">
                    <span className="font-semibold uppercase tracking-[0.14em] text-[color:var(--accent)]">
                      Clearest split
                    </span>
                    <span className="mx-2 text-[color:var(--line)]">|</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {divergencePoint.label}
                    </span>
                    <span className="mx-2 text-[color:var(--line)]">|</span>
                    <span>
                      {formatAmount(
                        divergencePoint.avalancheSnowballGap,
                        userCurrency,
                      )}{" "}
                      gap
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="relative h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 12, right: 16, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid
                      stroke="rgba(16,36,27,0.18)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      axisLine={false}
                      dataKey="label"
                      dy={8}
                      tick={{ fill: "rgba(16,36,27,0.72)", fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={false}
                      tick={{ fill: "rgba(16,36,27,0.72)", fontSize: 12 }}
                      tickFormatter={axisFormatter}
                      tickLine={false}
                      width={64}
                    />
                    <Tooltip
                      content={
                        <DashboardTooltip currency={userCurrency} />
                      }
                    />
                    {divergencePoint ? (
                      <ReferenceDot
                        fill="var(--accent-deep)"
                        ifOverflow="extendDomain"
                        r={5}
                        stroke="white"
                        strokeWidth={2}
                        x={divergencePoint.label}
                        y={divergencePoint.avalanche}
                      />
                    ) : null}
                    <Line
                      activeDot={{ fill: "var(--chart-smart)", r: 5 }}
                      dataKey="avalanche"
                      dot={false}
                      name="Avalanche"
                      stroke="var(--chart-smart)"
                      strokeLinecap="round"
                      strokeWidth={4}
                      type="monotone"
                    />
                    <Line
                      activeDot={{ fill: "var(--chart-extra)", r: 5 }}
                      dataKey="snowball"
                      dot={false}
                      name="Snowball"
                      stroke="var(--chart-extra)"
                      strokeDasharray="3 6"
                      strokeLinecap="round"
                      strokeWidth={2.5}
                      type="monotone"
                    />
                    <Line
                      activeDot={{ fill: "var(--accent)", r: 5 }}
                      dataKey="standard"
                      dot={false}
                      name="Standard"
                      stroke="var(--accent)"
                      strokeDasharray="4 8"
                      strokeLinecap="round"
                      strokeWidth={4}
                      type="monotone"
                    />
                    <Line
                      activeDot={{ fill: "var(--chart-minimum)", r: 5 }}
                      dataKey="minimumOnly"
                      dot={false}
                      name="Minimum only"
                      stroke="var(--chart-minimum)"
                      strokeLinecap="round"
                      strokeWidth={4}
                      type="monotone"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>
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
  );
}
