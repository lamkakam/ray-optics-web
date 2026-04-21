"""Progress tracking helpers for optimization runs."""

from __future__ import annotations

import math

import numpy as np

from ._types import FloatArray, OptimizationProgressEntry, ProblemEvaluation, ProgressReporter


MERIT_LOG_EPSILON = 1e-300


class OptimizationProgress:
    """Track optimization progress snapshots by distinct evaluated vectors."""

    def __init__(self) -> None:
        self.entries: list[OptimizationProgressEntry] = []
        self._last_vector: FloatArray | None = None

    def record(
        self,
        vector: FloatArray,
        evaluation: ProblemEvaluation,
        reporter: ProgressReporter | None = None,
    ) -> bool:
        candidate = np.array(vector, dtype=float, copy=True)
        if self._last_vector is not None and np.allclose(candidate, self._last_vector, rtol=0.0, atol=1e-12):
            return False
        if "merit_function" not in evaluation:
            return False

        merit_function_value = float(evaluation["merit_function"]["sum_of_squares"])
        progress_entry = {
            "iteration": len(self.entries),
            "merit_function_value": merit_function_value,
            "log10_merit_function_value": float(math.log10(max(merit_function_value, MERIT_LOG_EPSILON))),
        }
        self.entries.append(progress_entry)
        self._last_vector = candidate
        if reporter is not None:
            reporter(list(self.entries))
        return True
