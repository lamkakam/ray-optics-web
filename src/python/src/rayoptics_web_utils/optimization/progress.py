"""Track solver-independent optimization progress."""

from __future__ import annotations

import math

import numpy as np

from ._types import FloatArray, OptimizationProgressEntry, ProblemEvaluation, ProgressReporter


MERIT_LOG_EPSILON = 1e-300


class OptimizationProgress:
    """Track optimization progress snapshots by distinct evaluated vectors.


    Tracks solver progress snapshots in a solver-independent way.

    - Stores the existing progress payload shape:
      - `iteration`
      - `merit_function_value`
      - `log10_merit_function_value`
    - Deduplicates repeated evaluations of the same vector within the same optional glass-search context; a new candidate context always starts a new history segment.
    - Stores a copied latest recorded vector and exposes it through `latest_vector` as a defensive copy so interrupted optimization can build a partial-result report without mutating internal progress state.
    - Can notify an optional progress reporter whenever a new snapshot is recorded."""

    def __init__(self) -> None:
        self.entries: list[OptimizationProgressEntry] = []
        self._last_vector: FloatArray | None = None
        self._last_context: dict[str, object] | None = None

    @property
    def latest_vector(self) -> FloatArray | None:
        if self._last_vector is None:
            return None
        return np.array(self._last_vector, dtype=float, copy=True)

    def record(
        self,
        vector: FloatArray,
        evaluation: ProblemEvaluation,
        reporter: ProgressReporter | None = None,
        *,
        context: dict[str, object] | None = None,
    ) -> bool:
        candidate = np.array(vector, dtype=float, copy=True)
        normalized_context = dict(context) if context is not None else None
        if (
            self._last_vector is not None
            and normalized_context == self._last_context
            and np.allclose(candidate, self._last_vector, rtol=0.0, atol=1e-12)
        ):
            return False
        if "merit_function" not in evaluation:
            return False

        merit_function_value = float(evaluation["merit_function"]["sum_of_squares"])
        progress_entry = {
            "iteration": len(self.entries),
            "merit_function_value": merit_function_value,
            "log10_merit_function_value": float(math.log10(max(merit_function_value, MERIT_LOG_EPSILON))),
            **(normalized_context or {}),
        }
        self.entries.append(progress_entry)
        self._last_vector = candidate
        self._last_context = normalized_context
        if reporter is not None:
            reporter(list(self.entries))
        return True
