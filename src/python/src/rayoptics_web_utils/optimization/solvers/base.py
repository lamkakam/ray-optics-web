"""Base types for optimization solver adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod

from rayoptics_web_utils.optimization._types import OptimizationProblemProtocol, ProgressReporter, SolverResult


class SolverAdapter(ABC):
    """Adapter that runs one optimization algorithm against a problem."""

    def __init__(self, problem: OptimizationProblemProtocol):
        self.problem = problem

    @abstractmethod
    def solve(self, progress_reporter: ProgressReporter | None = None) -> SolverResult:
        """Run the solver and return a normalized result mapping."""
