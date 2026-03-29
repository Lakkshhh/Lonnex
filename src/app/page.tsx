"use client";

import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const steps = [
  {
    number: "01",
    title: "See your options side by side",
    description:
      "Bring all your balances, rates, and monthly payments into one place so you can compare a few realistic payoff paths without translating finance jargon first.",
  },
  {
    number: "02",
    title: "Test small changes",
    description:
      'Try questions like "what if I added $100 a month?" or "what if I paid this loan first?" and see how the timeline, interest, and monthly pressure actually change.',
  },
  {
    number: "03",
    title: "Leave with agent-backed guidance",
    description:
      "Get a clearer next-step plan shaped by AI agents that turn the numbers into useful guidance, highlight tradeoffs, and help you decide what to do next.",
  },
] as const;

const stepAnimationDelays = ["delay-2", "delay-3", "delay-4"] as const;

const features = [
  {
    eyebrow: "Private by design",
    title: "Think of it like a personal finance advisor running on your own server",
    description:
      "You enter your loans once, keep the analysis under your control, and get a payoff plan built around your exact balances, rates, and monthly budget.",
  },
  {
    eyebrow: "For real decisions",
    title: "Perfect for anyone asking where that extra $300 should actually go",
    description:
      "If you are juggling multiple loans and wondering whether to attack the biggest balance or the smallest one first, Lonnex does the math for you.",
  },
  {
    eyebrow: "Math before guesswork",
    title: "See how much each strategy saves before you commit to a plan",
    description:
      "It compares the real cost, payoff date, and tradeoffs across multiple repayment approaches so you can choose with confidence instead of instinct.",
  },
  {
    eyebrow: "Agent support",
    title: "Get a monthly game plan instead of a pile of numbers",
    description:
      "Lonnex's AI agents turn the results into a practical brief that tells you what to do this month, what to pay first, and why that order wins.",
  },
] as const;

const strategies = [
  {
    name: "Avalanche",
    detail:
      "Targets the highest interest rate first and is usually the lowest-cost winner over the life of your loans.",
  },
  {
    name: "Snowball",
    detail:
      "Pays off the smallest balance first so you get faster psychological wins, even if it usually costs a bit more overall.",
  },
  {
    name: "Standard",
    detail:
      "Spreads extra budget across loans proportionally so you have a realistic baseline without aggressive prioritization.",
  },
  {
    name: "Minimum only",
    detail:
      "Shows the true cost of doing nothing extra, which is often the most expensive path by years and thousands of dollars.",
  },
] as const;

const pipeline = [
  {
    agent: "LoanParser",
    summary:
      "Cleans and validates balances, rates, and minimum payments before any modeling starts.",
  },
  {
    agent: "StrategyModeller",
    summary:
      "Runs all four repayment strategies in parallel against the same portfolio and budget.",
  },
  {
    agent: "ScenarioSimulator",
    summary:
      "Tests what-if changes like extra monthly payments, lump sums, or refinance assumptions.",
  },
  {
    agent: "ResultAggregator",
    summary:
      "Ranks the outcomes, flags the winner, and prepares the final guidance the app shows you.",
  },
] as const;

const payoffData = [
  { year: "Today", avalanche: 39800, snowball: 39800, standard: 39800, minimumOnly: 39800 },
  { year: "Year 1", avalanche: 32300, snowball: 33200, standard: 34100, minimumOnly: 35600 },
  { year: "Year 2", avalanche: 24300, snowball: 25600, standard: 28300, minimumOnly: 31200 },
  { year: "Year 3", avalanche: 14800, snowball: 16900, standard: 22200, minimumOnly: 26600 },
  { year: "Year 4", avalanche: 5200, snowball: 8800, standard: 15200, minimumOnly: 21800 },
  { year: "Year 5", avalanche: 0, snowball: 2100, standard: 8100, minimumOnly: 16900 },
  { year: "Year 6", avalanche: 0, snowball: 0, standard: 2100, minimumOnly: 11800 },
  { year: "Year 7", avalanche: 0, snowball: 0, standard: 0, minimumOnly: 6500 },
  { year: "Year 8", avalanche: 0, snowball: 0, standard: 0, minimumOnly: 0 },
] as const;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const axisFormatter = (value: number) => `$${Math.round(value / 1000)}k`;

const strategyLegend = [
  { name: "Avalanche", color: "var(--chart-smart)", dashed: false },
  { name: "Snowball", color: "var(--chart-extra)", dashed: false },
  { name: "Standard", color: "var(--accent)", dashed: true },
  { name: "Minimum only", color: "var(--chart-minimum)", dashed: false },
] as const;

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <header className="fade-in-up fixed inset-x-0 top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between rounded-full border border-white/45 bg-[rgba(242,239,231,0.72)] px-4 py-3 shadow-[0_10px_40px_rgba(18,59,45,0.06)] backdrop-blur-md sm:px-6">
            <p className="text-3xl leading-none font-[var(--font-brand)] tracking-[-0.05em] text-[color:var(--foreground)] sm:text-4xl">
              Lonnex
            </p>
            <Link
              aria-label="Account"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/70 text-[color:var(--foreground)] transition duration-300 hover:border-[color:var(--accent)] hover:bg-white"
              href="/login"
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
            </Link>
          </div>
        </div>
      </header>

      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_12%,rgba(18,59,45,0.12),transparent_24%),radial-gradient(circle_at_10%_8%,rgba(255,255,255,0.9),transparent_28%)]" />
        <div className="mx-auto flex min-h-[100svh] max-w-7xl flex-col px-6 pb-16 pt-28 sm:px-8 sm:pt-32 lg:px-12">
          <div className="grid flex-1 items-start gap-16 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] lg:gap-8">
            <div className="max-w-2xl">
              <p className="fade-in-up delay-1 text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
                Loan repayment planning, made human
              </p>
              <h1 className="fade-in-up delay-2 mt-5 max-w-4xl font-display text-5xl leading-[1.08] tracking-tight text-[color:var(--foreground)] sm:text-6xl lg:text-7xl">
                Loan payoff, explained like a person would.
              </h1>
              <p className="fade-in-up delay-3 mt-7 max-w-xl text-lg leading-8 text-[color:var(--muted)] sm:text-xl">
                Lonnex helps you figure out the smartest way to pay off your
                loans. It tells you which strategy wins, how much each approach
                saves, what happens if you add more each month, and what to do
                next with help from AI agents that turn the math into action.
              </p>
              <div className="fade-in-up delay-4 mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  className="inline-flex items-center justify-center rounded-full border border-[color:var(--line)] bg-white/55 px-6 py-3.5 text-base font-medium text-[color:var(--foreground)] transition duration-300 hover:border-[color:var(--accent)] hover:bg-white"
                  href="#strategy-chart"
                >
                  See how it works
                </a>
              </div>
            </div>

            <div className="relative hidden lg:block lg:pt-2" aria-hidden="true">
              <div className="relative h-[430px]">
                <div className="absolute inset-0 rounded-[2.75rem] border border-white/45 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.88),transparent_22%),linear-gradient(150deg,rgba(255,255,255,0.58),rgba(217,236,222,0.55)_42%,rgba(18,59,45,0.18)_100%)] shadow-[0_30px_80px_rgba(18,59,45,0.12)]" />
                <div className="absolute left-8 top-8 rounded-full border border-white/55 bg-white/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)] backdrop-blur-sm">
                  Ranked payoff options
                </div>
                <div className="hero-float absolute right-8 top-8 w-[10.5rem] rounded-[1.4rem] border border-white/55 bg-[color:var(--accent-deep)] p-4 text-white shadow-[0_18px_40px_rgba(18,59,45,0.18)]">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/70">
                    Best outcome
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight">
                    $2,840
                  </p>
                  <p className="mt-1 text-sm leading-6 text-white/76">
                    less interest with the top-ranked path
                  </p>
                </div>

                <div className="absolute left-8 right-28 top-24 rounded-[2rem] border border-white/55 bg-white/78 p-5 shadow-[0_24px_60px_rgba(18,59,45,0.1)] backdrop-blur-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
                        Strategy comparison
                      </p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--foreground)]">
                        Avalanche wins for this portfolio
                      </h3>
                    </div>
                    <div className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-deep)]">
                      4 paths modeled
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between rounded-[1.2rem] bg-[color:var(--accent-deep)] px-4 py-3 text-white">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/16 text-sm font-semibold">
                          1
                        </span>
                        <div>
                          <p className="text-sm font-semibold">Avalanche</p>
                          <p className="text-xs text-white/68">
                            lowest total cost
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold">2031 payoff</p>
                    </div>

                    <div className="flex items-center justify-between rounded-[1.2rem] border border-[color:var(--line)] bg-white/72 px-4 py-3 text-[color:var(--foreground)]">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-sm font-semibold text-[color:var(--accent-deep)]">
                          2
                        </span>
                        <div>
                          <p className="text-sm font-semibold">Snowball</p>
                          <p className="text-xs text-[color:var(--muted)]">
                            faster small-loan wins
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold">+$1,190 cost</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[1.2rem] border border-[color:var(--line)] bg-white/68 px-4 py-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                          Standard
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                          balanced baseline
                        </p>
                      </div>
                      <div className="rounded-[1.2rem] border border-[color:var(--line)] bg-white/68 px-4 py-3">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                          Minimum only
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                          longest and most expensive
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hero-float hero-float-slow absolute bottom-7 left-8 w-[13rem] rounded-[1.6rem] border border-white/55 bg-white/78 p-4 shadow-[0_18px_40px_rgba(18,59,45,0.1)] backdrop-blur-sm">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                    This month
                  </p>
                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center justify-between text-sm text-[color:var(--foreground)]">
                      <span>Loan A</span>
                      <span className="font-semibold">$420</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-[color:var(--foreground)]">
                      <span>Loan B</span>
                      <span className="font-semibold">$185</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-[color:var(--foreground)]">
                      <span>Extra payment</span>
                      <span className="font-semibold text-[color:var(--accent-deep)]">
                        +$100
                      </span>
                    </div>
                  </div>
                </div>

                <div className="hero-float hero-float-fast absolute bottom-10 right-8 w-[11rem] rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--accent-soft)]/88 p-4 shadow-[0_16px_36px_rgba(18,59,45,0.1)] backdrop-blur-sm">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-deep)]">
                    Agent brief
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--accent-deep)]">
                    Put the extra money toward Loan A first and revisit in 30
                    days.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-14 grid gap-8 border-t border-[color:var(--line)] pt-8 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div
                className={`fade-in-up ${stepAnimationDelays[index]} max-w-sm`}
                key={step.title}
              >
                <p className="text-sm font-semibold text-[color:var(--accent)]">
                  {step.number}
                </p>
                <h2 className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
                  {step.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div className="max-w-md">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
              Why people get it fast
            </p>
            <h2 className="mt-5 font-display text-4xl leading-tight tracking-tight text-[color:var(--foreground)] sm:text-5xl">
              It answers the question most borrowers keep putting off.
            </h2>
            <p className="mt-6 text-lg leading-8 text-[color:var(--muted)]">
              Should the extra money go to the big loan, the small loan, or the
              highest-rate loan? Lonnex turns that overwhelming question into a
              concrete answer backed by math and agent-generated guidance.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <article
                className="rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(18,59,45,0.06)] backdrop-blur-sm"
                key={feature.title}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
                  {feature.eyebrow}
                </p>
                <h3 className="mt-4 text-2xl font-semibold leading-tight text-[color:var(--foreground)]">
                  {feature.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6 sm:px-8 lg:px-12">
        <div className="grid gap-12 rounded-[2.2rem] border border-[color:var(--line)] bg-white/50 px-6 py-8 shadow-[0_18px_60px_rgba(18,59,45,0.05)] backdrop-blur-sm lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
          <div className="max-w-md">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
              Four strategies
            </p>
            <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight text-[color:var(--foreground)] sm:text-5xl">
              Lonnex models the paths people actually compare.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[color:var(--muted)]">
              Instead of showing one generic answer, it runs avalanche,
              snowball, standard, and minimum-only side by side against your
              exact portfolio so you can see the real difference.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {strategies.map((strategy) => (
              <article
                className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5"
                key={strategy.name}
              >
                <h3 className="text-xl font-semibold text-[color:var(--foreground)]">
                  {strategy.name}
                </h3>
                <p className="mt-3 text-base leading-7 text-[color:var(--muted)]">
                  {strategy.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="scroll-mt-28 border-y border-[color:var(--line)] bg-white/38"
        id="strategy-chart"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-12">
          <div className="max-w-lg">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
              Strategy comparison
            </p>
            <h2 className="mt-5 font-display text-4xl leading-tight tracking-tight text-[color:var(--foreground)] sm:text-5xl">
              Which repayment strategy actually saves the most for your loans?
            </h2>
            <p className="mt-6 text-lg leading-8 text-[color:var(--muted)]">
              Lonnex models all four approaches at once so you can compare the
              real tradeoffs. This sample chart shows how avalanche, snowball,
              standard, and minimum-only payments separate over time when they
              run against the same loan portfolio.
            </p>
          </div>

          <div className="self-start rounded-[2rem] border border-[color:var(--line)] bg-white/74 p-4 shadow-[0_30px_80px_rgba(18,59,45,0.08)] backdrop-blur-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                  Named strategies
                </p>
                <h3 className="mt-2 text-xl font-semibold leading-tight tracking-tight text-[color:var(--foreground)] sm:text-2xl">
                  Avalanche vs Snowball vs Standard vs Minimum only
                </h3>
              </div>
              <p className="max-w-[14rem] text-sm leading-6 text-[color:var(--muted)] sm:text-right">
                Tap or hover the chart to compare balances year by year.
              </p>
            </div>

            <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
              {strategyLegend.map((item) => (
                <div
                  className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]"
                  key={item.name}
                >
                  <span
                    aria-hidden="true"
                    className="block h-[4px] w-8 shrink-0 rounded-full"
                    style={
                      item.dashed
                        ? {
                            backgroundImage: `repeating-linear-gradient(to right, ${item.color} 0 10px, transparent 10px 16px)`,
                          }
                        : { backgroundColor: item.color }
                    }
                  />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>

            <div className="h-[220px] sm:h-[255px]">
              <ResponsiveContainer
                height="100%"
                initialDimension={{ width: 720, height: 255 }}
                width="100%"
              >
                <LineChart
                  data={payoffData}
                  margin={{ top: 12, right: 10, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    stroke="rgba(16,36,27,0.08)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="year"
                    dy={8}
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                    tickFormatter={axisFormatter}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(250, 248, 242, 0.96)",
                      border: "1px solid rgba(16, 36, 27, 0.12)",
                      borderRadius: "18px",
                      boxShadow: "0 18px 50px rgba(18, 59, 45, 0.12)",
                    }}
                    formatter={(value, name) => [
                      currencyFormatter.format(Number(value ?? 0)),
                      String(name ?? ""),
                    ]}
                    labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                  />
                  <Line
                    activeDot={{ fill: "var(--chart-smart)", r: 6 }}
                    dataKey="avalanche"
                    dot={false}
                    name="Avalanche"
                    stroke="var(--chart-smart)"
                    strokeLinecap="round"
                    strokeWidth={4}
                    type="monotone"
                  />
                  <Line
                    activeDot={{ fill: "var(--chart-extra)", r: 6 }}
                    dataKey="snowball"
                    dot={false}
                    name="Snowball"
                    stroke="var(--chart-extra)"
                    strokeLinecap="round"
                    strokeWidth={3}
                    type="monotone"
                  />
                  <Line
                    activeDot={{ fill: "var(--accent)", r: 6 }}
                    dataKey="standard"
                    dot={false}
                    name="Standard"
                    stroke="var(--accent)"
                    strokeDasharray="7 6"
                    strokeLinecap="round"
                    strokeWidth={3}
                    type="monotone"
                  />
                  <Line
                    activeDot={{ fill: "var(--chart-minimum)", r: 6 }}
                    dataKey="minimumOnly"
                    dot={false}
                    name="Minimum only"
                    stroke="var(--chart-minimum)"
                    strokeLinecap="round"
                    strokeWidth={3}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
              Illustrative chart with sample balances. Lonnex will eventually
              personalize this with your own loans, rates, payment ideas, and
              agent recommendations.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="max-w-md">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[color:var(--accent)]">
              Multi-agent engine
            </p>
            <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight text-[color:var(--foreground)] sm:text-5xl">
              The technical heart is four specialized agents working in sequence.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[color:var(--muted)]">
              Behind the scenes, Lonnex uses a structured agent pipeline to
              validate your loans, model the strategies, simulate changes, and
              package the result into a ranked action plan.
            </p>
          </div>

          <div className="grid gap-4">
            {pipeline.map((item, index) => (
              <div
                className="flex gap-5 rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-[0_10px_30px_rgba(18,59,45,0.04)]"
                key={item.agent}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-sm font-semibold text-[color:var(--accent-deep)]">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[color:var(--foreground)]">
                    {item.agent}
                  </h3>
                  <p className="mt-2 text-base leading-7 text-[color:var(--muted)]">
                    {item.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-12">
        <div className="grid gap-10 rounded-[2.75rem] bg-[color:var(--accent-deep)] px-8 py-12 text-white shadow-[0_30px_80px_rgba(18,59,45,0.16)] lg:grid-cols-[1fr_auto] lg:items-end lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/70">
              Ready when you are
            </p>
            <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
              Make a plan that feels clear before it feels complicated.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/76">
              Lonnex helps you understand your options, compare four repayment
              strategies, test what changes the timeline, and walk away with an
              agent-guided payoff plan instead of a pile of tabs.
            </p>
          </div>

          <Link
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-base font-semibold text-[color:var(--accent-deep)] transition duration-300 hover:bg-[color:var(--accent-soft)]"
            href="/login"
          >
            Get Started
          </Link>
        </div>
      </section>
    </main>
  );
}
