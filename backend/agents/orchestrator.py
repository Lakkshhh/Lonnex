from __future__ import annotations

from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from agents.loan_parser import LoanParserAgent
from agents.scenario_simulator import ScenarioSimulatorAgent
from agents.strategy_modeller import StrategyModellerAgent


class PipelineState(TypedDict, total=False):
    raw_loans: list[dict]
    parsed_loans: list[dict]
    monthly_income: float
    extra_budget: float
    result: dict


class ScenarioState(TypedDict, total=False):
    loans: list[dict]
    monthly_income: float
    extra_budget: float
    winning_strategy: str
    winning_result: dict
    extra_monthly: float
    lump_sum: float
    refi_rate: float
    scenario_result: dict


def _parse_loans_node(state: PipelineState) -> PipelineState:
    parser = LoanParserAgent()
    monthly_income = float(state["monthly_income"])
    extra_budget = float(state["extra_budget"])

    parsed_loans = [
        parser.run(
            {
                **loan,
                "monthly_income": monthly_income,
                "extra_budget": extra_budget,
            }
        )
        for loan in state["raw_loans"]
    ]

    return {"parsed_loans": parsed_loans}


def _strategy_modeller_node(state: PipelineState) -> PipelineState:
    result = StrategyModellerAgent().run(
        loans=state["parsed_loans"],
        monthly_income=float(state["monthly_income"]),
        extra_budget=float(state["extra_budget"]),
    )
    return {"result": result}


def _scenario_simulator_node(state: ScenarioState) -> ScenarioState:
    scenario_result = ScenarioSimulatorAgent().run(
        loans=state["loans"],
        winning_strategy=state["winning_strategy"],
        winning_result=state["winning_result"],
        extra_budget=float(state["extra_budget"]),
        extra_monthly=float(state["extra_monthly"]),
        lump_sum=float(state["lump_sum"]),
        refi_rate=float(state["refi_rate"]),
    )
    return {"scenario_result": scenario_result}


_builder = StateGraph(PipelineState)
_builder.add_node("loan_parser", _parse_loans_node)
_builder.add_node("strategy_modeller", _strategy_modeller_node)
_builder.add_edge(START, "loan_parser")
_builder.add_edge("loan_parser", "strategy_modeller")
_builder.add_edge("strategy_modeller", END)
_graph = _builder.compile()

_scenario_builder = StateGraph(ScenarioState)
_scenario_builder.add_node("scenario_simulator", _scenario_simulator_node)
_scenario_builder.add_edge(START, "scenario_simulator")
_scenario_builder.add_edge("scenario_simulator", END)
_scenario_graph = _scenario_builder.compile()


def run_pipeline(raw_loans: list[dict], monthly_income: float, extra_budget: float) -> dict:
    final_state = _graph.invoke(
        {
            "raw_loans": raw_loans,
            "monthly_income": monthly_income,
            "extra_budget": extra_budget,
        }
    )
    return final_state["result"]


def run_scenario_pipeline(
    loans: list[dict],
    monthly_income: float,
    extra_budget: float,
    winning_strategy: str,
    winning_result: dict,
    extra_monthly: float,
    lump_sum: float,
    refi_rate: float,
) -> dict:
    final_state = _scenario_graph.invoke(
        {
            "loans": loans,
            "monthly_income": monthly_income,
            "extra_budget": extra_budget,
            "winning_strategy": winning_strategy,
            "winning_result": winning_result,
            "extra_monthly": extra_monthly,
            "lump_sum": lump_sum,
            "refi_rate": refi_rate,
        }
    )
    return final_state["scenario_result"]
