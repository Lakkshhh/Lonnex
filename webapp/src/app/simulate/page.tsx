"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
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

type ScenarioResult = {
  modified_schedule: SchedulePoint[];
  additional_savings: number;
  months_saved: number;
  new_payoff_date: string;
  opening_balance: number;
};

type ChartRow = {
  label: string;
  point: number;
  baseline: number;
  scenario: number;
};

type SimulateTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{
    dataKey?: string;
    value?: number;
  }>;
  currency: string;
};

type InfoTooltipProps = {
  label: string;
};

const WINNER_LABELS: Record<StrategyKey, string> = {
  avalanche: "Avalanche",
  snowball: "Snowball",
  standard: "Standard",
  minimum_only: "Minimum only",
};

const DEFAULT_CONTROLS = {
  extraMonthly: 100,
  lumpSum: 0,
  refiRate: 4.5,
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

function buildScenarioChartData(
  baseline: StrategySummary,
  modifiedSchedule: SchedulePoint[],
  baselineOpeningBalance: number,
  scenarioOpeningBalance: number,
): ChartRow[] {
  const baselineFinalMonth = baseline.schedule[baseline.schedule.length - 1]?.month ?? 0;
  const scenarioFinalMonth =
    modifiedSchedule[modifiedSchedule.length - 1]?.month ?? 0;
  const maxMonths = Math.max(baselineFinalMonth, scenarioFinalMonth);
  const useYears = maxMonths > 24;

  if (useYears) {
    const sampledMonths = new Set<number>(
      Array.from(
        { length: Math.floor(maxMonths / 12) + 1 },
        (_, index) => index * 12,
      ),
    );
    sampledMonths.add(baselineFinalMonth);
    sampledMonths.add(scenarioFinalMonth);

    return Array.from(sampledMonths)
      .sort((left, right) => left - right)
      .map((month) => ({
        label:
          month === 0
            ? "Today"
            : month % 12 === 0
              ? `Year ${month / 12}`
              : `Month ${month}`,
        point: month,
        baseline: getScheduleBalance(
          baseline.schedule,
          month,
          baselineOpeningBalance,
        ),
        scenario: getScheduleBalance(
          modifiedSchedule,
          month,
          scenarioOpeningBalance,
        ),
      }));
  }

  return Array.from({ length: maxMonths + 1 }, (_, month) => ({
    label: month === 0 ? "Today" : `Month ${month}`,
    point: month,
    baseline: getScheduleBalance(
      baseline.schedule,
      month,
      baselineOpeningBalance,
    ),
    scenario: getScheduleBalance(
      modifiedSchedule,
      month,
      scenarioOpeningBalance,
    ),
  }));
}

function formatChartPointLabel(point: number, maxPoint: number): string {
  if (point === 0) {
    return "Today";
  }

  if (maxPoint > 24) {
    return point % 12 === 0 ? `Year ${point / 12}` : `M${point}`;
  }

  return `Month ${point}`;
}

function formatAxisValue(value: number, currency: string): string {
  const symbol = CURRENCIES[currency] ?? CURRENCIES.USD;
  if (value >= 1000) {
    return `${symbol}${Math.round(value / 1000)}k`;
  }
  return formatAmount(value, currency);
}

function formatSignedAmount(value: number, currency: string): string {
  if (value < 0) {
    return `-${formatAmount(Math.abs(value), currency)}`;
  }
  return formatAmount(value, currency);
}

function ScenarioTooltip({
  active,
  label,
  payload,
  currency,
}: SimulateTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const baselineValue = Number(
    payload.find((item) => item.dataKey === "baseline")?.value ?? 0,
  );
  const scenarioValue = Number(
    payload.find((item) => item.dataKey === "scenario")?.value ?? 0,
  );

  return (
    <div
      className="rounded-[1.2rem] border bg-[color:var(--surface-strong)] px-4 py-3 shadow-sm"
      style={{ borderColor: "var(--line)" }}
    >
      <p className="text-sm font-semibold text-[color:var(--foreground)]">
        {label}
      </p>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-5">
          <span className="font-medium text-[color:var(--accent-deep)]">
            Baseline
          </span>
          <span className="font-medium text-[color:var(--foreground)]">
            {formatAmount(baselineValue, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="font-medium text-[color:var(--accent)]">
            Your scenario
          </span>
          <span className="font-medium text-[color:var(--foreground)]">
            {formatAmount(scenarioValue, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

function InfoTooltip({ label }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current || !(event.target instanceof Node)) {
        return;
      }

      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  return (
    <span className="relative inline-flex" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-label={label}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--line)] text-[0.72rem] font-normal leading-none text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--foreground)]"
        onBlur={(event) => {
          if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
        onClick={() => setOpen((current) => !current)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        type="button"
      >
        i
      </button>
      {open ? (
        <span
          className="absolute bottom-full right-0 z-30 mb-2 w-64 rounded-[1rem] border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm leading-6 text-[color:var(--muted)]"
          role="tooltip"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

export default function SimulatePage() {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [baselineResult, setBaselineResult] = useState<StrategyResult | null>(null);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [controls, setControls] = useState(DEFAULT_CONTROLS);
  const [applyRefiRate, setApplyRefiRate] = useState(false);

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

        const [profileResponse, pipelineResponse] = await Promise.all([
          supabase
            .from("user_financial_profile")
            .select("currency")
            .eq("id", session.user.id)
            .maybeSingle(),
          supabase
            .from("pipeline_results")
            .select("result")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (cancelled) {
          return;
        }

        const pipelineResult = pipelineResponse.data?.result as
          | StrategyResult
          | undefined;

        if (!pipelineResult?.winner || !pipelineResult[pipelineResult.winner]) {
          setError("Open the dashboard first so Lonnex can cache your baseline strategy.");
          setLoading(false);
          return;
        }

        const nextCurrency = String(profileResponse.data?.currency || "USD")
          .trim()
          .toUpperCase();

        setAccessToken(session.access_token);
        setCurrency(nextCurrency || "USD");
        setBaselineResult(pipelineResult);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Unable to load the simulator right now.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!baselineResult || !accessToken) {
      return;
    }

    let cancelled = false;
    let controller: AbortController | null = null;
    const timeoutId = window.setTimeout(async () => {
      try {
        if (cancelled) {
          return;
        }
        setSimulating(true);
        setError("");
        abortControllerRef.current?.abort();
        controller = new AbortController();
        abortControllerRef.current = controller;

        const response = await fetch("http://localhost:8000/api/simulate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            extra_monthly: controls.extraMonthly,
            lump_sum: controls.lumpSum,
            refi_rate: applyRefiRate ? controls.refiRate : null,
          }),
        });

        const result = (await response.json()) as
          | ScenarioResult
          | { detail?: string; error?: string };

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          const detail =
            "detail" in result ? result.detail || result.error || "" : "";
          if (detail === "Simulation superseded by a newer request.") {
            return;
          }
          setError(
            "detail" in result
              ? detail || "Unable to simulate this scenario right now."
              : "Unable to simulate this scenario right now.",
          );
          return;
        }

        setScenarioResult(result as ScenarioResult);
      } catch (simulationError) {
        if (
          simulationError instanceof DOMException &&
          simulationError.name === "AbortError"
        ) {
          return;
        }
        if (!cancelled) {
          setError("Unable to simulate this scenario right now.");
        }
      } finally {
        if (!cancelled) {
          setSimulating(false);
        }
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller?.abort();
    };
  }, [accessToken, applyRefiRate, baselineResult, controls]);

  const winnerKey = baselineResult?.winner ?? "avalanche";
  const winnerLabel = WINNER_LABELS[winnerKey];
  const baselineWinner = baselineResult?.[winnerKey] ?? null;

  const chartData = useMemo(() => {
    if (!baselineResult || !baselineWinner || !scenarioResult) {
      return [];
    }

    return buildScenarioChartData(
      baselineWinner,
      scenarioResult.modified_schedule,
      baselineResult.total_debt,
      scenarioResult.opening_balance,
    );
  }, [baselineResult, baselineWinner, scenarioResult]);

  const chartMaxPoint = chartData[chartData.length - 1]?.point ?? 0;

  const chartAxisFormatter = (value: number) => formatAxisValue(value, currency);

  const topNavButtonClass =
    "rounded-full border border-[color:var(--line)] bg-white/30 px-5 py-3 text-sm font-medium text-[color:var(--muted)] transition duration-300 hover:border-[color:var(--accent)] hover:bg-white/55";
  const activeNavButtonClass =
    "rounded-full bg-[color:var(--foreground)] px-6 py-3 text-sm font-medium text-white shadow-[0_10px_30px_rgba(18,59,45,0.08)]";
  const backButtonClass =
    "rounded-full border border-[color:var(--line)] bg-white/30 px-5 py-3 text-sm font-medium text-[color:var(--foreground)] transition duration-300 hover:border-[color:var(--accent)] hover:bg-white/55";

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
                className={topNavButtonClass}
                onClick={() => router.push("/dashboard")}
                type="button"
              >
                Dashboard
              </button>
              <button className={activeNavButtonClass} type="button">
                Simulate
              </button>
              {["Action plan", "AI brief"].map((label) => (
                <button className={topNavButtonClass} key={label} type="button">
                  {label}
                </button>
              ))}
              <button
                className={backButtonClass}
                onClick={() => router.push("/homepage")}
                type="button"
              >
                Back to workspace
              </button>
            </div>
          </header>

          <section className="flex flex-1 items-center justify-center py-8">
            <div className="w-full max-w-3xl rounded-[2.75rem] border border-white/50 bg-white/44 p-8 text-center shadow-[0_30px_80px_rgba(18,59,45,0.08)] backdrop-blur-sm">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
                Scenario simulator
              </p>
              <p className="mt-4 font-display text-4xl leading-tight tracking-tight text-[color:var(--foreground)] sm:text-5xl">
                Loading your baseline strategy now.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (error && !baselineResult) {
    return (
      <main className="relative flex h-screen overflow-hidden">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between gap-6 py-2">
            <span className="text-2xl font-[var(--font-brand)] tracking-[-0.04em] text-[color:var(--foreground)] sm:text-3xl">
              Lonnex
            </span>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                className={topNavButtonClass}
                onClick={() => router.push("/dashboard")}
                type="button"
              >
                Dashboard
              </button>
              <button className={activeNavButtonClass} type="button">
                Simulate
              </button>
              {["Action plan", "AI brief"].map((label) => (
                <button className={topNavButtonClass} key={label} type="button">
                  {label}
                </button>
              ))}
              <button
                className={backButtonClass}
                onClick={() => router.push("/homepage")}
                type="button"
              >
                Back to workspace
              </button>
            </div>
          </header>

          <section className="flex flex-1 items-center justify-center py-8">
            <div className="w-full max-w-3xl rounded-[2.75rem] border border-white/50 bg-white/44 p-8 text-center shadow-[0_30px_80px_rgba(18,59,45,0.08)] backdrop-blur-sm">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
                Simulator unavailable
              </p>
              <p className="mt-4 text-lg leading-8 text-[color:var(--muted)]">
                {error}
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex h-screen overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-6 py-2">
          <span className="text-2xl font-[var(--font-brand)] tracking-[-0.04em] text-[color:var(--foreground)] sm:text-3xl">
            Lonnex
          </span>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              className={topNavButtonClass}
              onClick={() => router.push("/dashboard")}
              type="button"
            >
              Dashboard
            </button>
            <button className={activeNavButtonClass} type="button">
              Simulate
            </button>
            {["Action plan", "AI brief"].map((label) => (
              <button className={topNavButtonClass} key={label} type="button">
                {label}
              </button>
            ))}
            <button
              className={backButtonClass}
              onClick={() => router.push("/homepage")}
              type="button"
            >
              Back to workspace
            </button>
          </div>
        </header>

        <section className="dashboard-scroll min-h-0 flex-1 overflow-y-auto pb-6 pt-4">
          <div className="space-y-12">
            <section>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
                Scenario simulator
              </p>
              <h1 className="mt-4 max-w-5xl font-display text-4xl leading-[1.05] tracking-tight text-[color:var(--foreground)] sm:text-5xl lg:text-6xl">
                How much does{" "}
                <span className="italic text-[color:var(--accent)]">
                  {formatAmount(controls.extraMonthly, currency)}
                </span>{" "}
                extra really save?
              </h1>

              <div className="mt-8 rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(18,59,45,0.06)] backdrop-blur-sm sm:p-8">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-[color:var(--muted)]">
                  Adjust parameters
                </p>

                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                  <div>
                    <label className="text-lg font-medium text-[color:var(--foreground)]">
                      Extra monthly payment
                    </label>
                    <input
                      className="mt-4 w-full"
                      max={500}
                      min={0}
                      onChange={(event) =>
                        setControls((current) => ({
                          ...current,
                          extraMonthly: Number(event.target.value),
                        }))
                      }
                      step={5}
                      style={{ accentColor: "var(--accent)" }}
                      type="range"
                      value={controls.extraMonthly}
                    />
                    <p className="mt-3 font-mono text-2xl text-[color:var(--accent)]">
                      +{formatAmount(controls.extraMonthly, currency)}/mo
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <label className="text-lg font-medium text-[color:var(--foreground)]">
                        One-time lump sum
                      </label>
                      <InfoTooltip label="A one-time extra payment applied immediately to reduce your principal" />
                    </div>
                    <input
                      className="mt-4 w-full"
                      max={10000}
                      min={0}
                      onChange={(event) =>
                        setControls((current) => ({
                          ...current,
                          lumpSum: Number(event.target.value),
                        }))
                      }
                      step={100}
                      style={{ accentColor: "var(--accent)" }}
                      type="range"
                      value={controls.lumpSum}
                    />
                    <p className="mt-3 font-mono text-2xl text-[color:var(--accent)]">
                      {formatAmount(controls.lumpSum, currency)}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <label className="text-lg font-medium text-[color:var(--foreground)]">
                        Hypothetical refi rate
                      </label>
                      <InfoTooltip label="A hypothetical interest rate to see how refinancing would affect your payoff" />
                      <label className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)]">
                        <input
                          checked={applyRefiRate}
                          className="h-4 w-4 rounded border-[color:var(--line)] accent-[color:var(--accent)]"
                          onChange={(event) =>
                            setApplyRefiRate(event.target.checked)
                          }
                          type="checkbox"
                        />
                        <span>Apply refi rate</span>
                      </label>
                    </div>
                    <div className={applyRefiRate ? "" : "opacity-50"}>
                      <input
                        className="mt-4 w-full disabled:cursor-not-allowed"
                        disabled={!applyRefiRate}
                        max={20}
                        min={0}
                        onChange={(event) =>
                          setControls((current) => ({
                            ...current,
                            refiRate: Number(event.target.value),
                          }))
                        }
                        step={0.1}
                        style={{ accentColor: "var(--accent)" }}
                        type="range"
                        value={controls.refiRate}
                      />
                      <p className="mt-3 font-mono text-2xl text-[color:var(--accent)]">
                        {controls.refiRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-[1.5rem] border border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/60 p-5">
                  <div className="grid gap-5 md:grid-cols-3">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.18em] text-[color:var(--accent)]">
                        Additional savings
                      </p>
                      <p className="mt-3 font-mono text-4xl text-[color:var(--accent-deep)]">
                        {scenarioResult
                          ? formatSignedAmount(
                              scenarioResult.additional_savings,
                              currency,
                            )
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.18em] text-[color:var(--accent)]">
                        Months saved
                      </p>
                      <p className="mt-3 font-mono text-4xl text-[color:var(--accent-deep)]">
                        {scenarioResult ? `${scenarioResult.months_saved}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.18em] text-[color:var(--accent)]">
                        New payoff date
                      </p>
                      <p className="mt-3 font-mono text-4xl text-[color:var(--accent-deep)]">
                        {scenarioResult
                          ? formatPayoffDate(scenarioResult.new_payoff_date)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {simulating ? (
                  <p className="mt-4 text-sm text-[color:var(--muted)]">
                    Updating your scenario…
                  </p>
                ) : null}
                {error ? (
                  <p className="mt-4 text-sm text-[color:#9a4f42]">{error}</p>
                ) : null}
              </div>
            </section>

            <section>
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                    {winnerLabel} baseline vs. your scenario
                  </p>
                  <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-[color:var(--foreground)] sm:text-5xl">
                    {winnerLabel} baseline vs. your scenario
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
                    <span
                      className="h-3 w-3 rounded-full bg-[color:var(--accent-deep)]"
                      aria-hidden="true"
                    />
                    <span>Baseline</span>
                  </div>
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]">
                    <span
                      className="h-3 w-3 rounded-full bg-[color:var(--accent)]"
                      aria-hidden="true"
                    />
                    <span>Your scenario</span>
                  </div>
                </div>
              </div>

              <div className="h-[340px]">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 12, right: 8, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid
                      stroke="rgba(16,36,27,0.14)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      axisLine={false}
                      dataKey="point"
                      domain={[0, chartMaxPoint]}
                      scale="linear"
                      tickFormatter={(value) =>
                        formatChartPointLabel(Number(value), chartMaxPoint)
                      }
                      ticks={chartData.map((row) => row.point)}
                      type="number"
                      dy={8}
                      tick={{ fill: "rgba(16,36,27,0.72)", fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={false}
                      tick={{ fill: "rgba(16,36,27,0.72)", fontSize: 12 }}
                      tickFormatter={chartAxisFormatter}
                      tickLine={false}
                      width={72}
                    />
                    <Tooltip
                      content={<ScenarioTooltip currency={currency} />}
                    />
                    <Line
                      animationDuration={300}
                      animationEasing="ease-out"
                      dataKey="baseline"
                      dot={false}
                      isAnimationActive
                      name="Baseline"
                      stroke="var(--accent-deep)"
                      strokeDasharray="5 6"
                      strokeLinecap="round"
                      strokeWidth={3}
                      type="monotone"
                    />
                    <Line
                      animationDuration={300}
                      animationEasing="ease-out"
                      dataKey="scenario"
                      dot={false}
                      isAnimationActive
                      name="Your scenario"
                      stroke="var(--accent)"
                      strokeLinecap="round"
                      strokeWidth={3}
                      type="monotone"
                    />
                  </LineChart>
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
