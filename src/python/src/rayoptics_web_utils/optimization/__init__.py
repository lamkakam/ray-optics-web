"""Expose continuous and categorical optimization helpers for RayOptics models."""

from rayoptics_web_utils.optimization.glass_optimizer import optimize_glasses

from rayoptics_web_utils.optimization.optimization import (
    evaluate_optimization_problem,
    optimize_opm,
)

__all__ = [
    "evaluate_optimization_problem",
    "optimize_glasses",
    "optimize_opm",
]
