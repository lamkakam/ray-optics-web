"""Base types for optimization solver adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod


class SolverAdapter(ABC):
    """Adapter that runs one optimization algorithm against a problem."""

    def __init__(self, problem):
        self.problem = problem

    @abstractmethod
    def solve(self, progress_reporter=None) -> dict:
        """Run the solver and return a normalized result mapping."""
