# `python/src/rayoptics_web_utils/optimization/progress.py`

## Purpose

Tracks solver progress snapshots in a solver-independent way.

## Public Surface

```python
class OptimizationProgress:
    entries: list[OptimizationProgressEntry]
    record(vector: FloatArray, evaluation: ProblemEvaluation, reporter: ProgressReporter | None = None) -> bool
```

## Key Behaviors

- Stores the existing progress payload shape:
  - `iteration`
  - `merit_function_value`
  - `log10_merit_function_value`
- Deduplicates repeated evaluations of the same vector.
- Can notify an optional progress reporter whenever a new snapshot is recorded.
