# Lonnex

Lonnex is a loan repayment planning web app that helps people compare payoff strategies, test what-if scenarios, and get agent-backed guidance on what to do next. The goal is to make repayment planning feel clear, practical, and less overwhelming.

## Architecture

Lonnex is designed as a loan planning product with a Next.js frontend, Supabase for auth and data storage, and a multi-agent repayment engine orchestrated through LangGraph.

At the product level, the app is meant to work like this:

- a user signs in and stores their loan portfolio
- the app compares multiple repayment strategies against that exact portfolio
- the user can test scenario changes like adding extra monthly payments
- the system then turns the results into a clear action plan for what to do next

The planned decision engine is centered around four specialised agents connected in a LangGraph workflow:

1. `LoanParser`
   Takes raw loan inputs and validates them, normalises interest-rate formats, and converts them into clean loan objects the rest of the system can trust.

2. `StrategyModeller`
   Runs the repayment simulations across the core strategies such as avalanche, snowball, standard, and minimum-only, producing month-by-month payoff schedules and total cost outcomes.

3. `ScenarioSimulator`
   Re-runs the best or selected strategy with modified assumptions, such as adding more money each month, changing rates, or testing payoff adjustments, so users can explore what-if questions.

4. `ResultAggregator`
   Collects the strategy outputs, ranks them, highlights the winner, calculates savings differences, and shapes the final response that the dashboard and AI explanation layer can use.

LangGraph is intended to coordinate these agents as a state-driven pipeline so each step has a clear responsibility and passes structured results forward cleanly instead of mixing all repayment logic into one large function.

Around that workflow, the wider project is structured so the frontend handles the user experience, Supabase handles authentication and application data, and the repayment engine provides the modeling and recommendation layer that powers the dashboard and agent-written guidance.

## Status

This project is still under active development, and the product, workflows, and connected data features are still being built out.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The project will be deployed after the whole website has been made.
