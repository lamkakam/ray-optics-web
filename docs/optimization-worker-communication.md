# Optimization Worker Communication

Optimization runs execute inside the long-lived Pyodide web worker and are called from `OptimizationPage` through the typed Comlink proxy exposed by `usePyodide`.

## Progress Streaming

`OptimizationPage` calls `proxy.optimizeOpm(...)` with:

- the page-local optical model
- the built optimization config
- the app-wide OPD aim point
- a Comlink-wrapped progress callback
- a per-run id
- an optional `SharedArrayBuffer` interrupt buffer

Inside the worker, `_optimizeOpm(...)` temporarily binds `_optimization_progress_callback` into `pyodide.globals`. The generated Python script wraps that global as `_report_optimization_progress(progress)`, serializes each progress snapshot to JSON, and passes it back to the page callback while Python is still running.

The page stores the streamed `OptimizationProgressEntry[]` in React state. `OptimizationProgressModal` plots the newest 2000 entries while retaining the full history in page state.

## Stop Signal Lifecycle

Stopping is tied to one optimization run id. Before a run starts, the page creates a run id and, when supported, a `SharedArrayBuffer(4)`. The worker creates an `Int32Array` view over that buffer, resets the first cell to `0`, records the active run id, and calls `pyodide.setInterruptBuffer(interruptView)` before entering Python.

When the user clicks Stop:

1. The page writes Pyodide's interrupt signal (`2`) directly into the shared buffer with `Atomics.store(...)`.
2. The page calls `proxy.requestOptimizationStop(activeRunId)`.
3. The worker only signals the buffer when the supplied id still matches the active run id.
4. Late or stale stop requests return `{ signaled: false }` and cannot affect a later run.

The direct `Atomics.store(...)` on the page is required because a normal Comlink message to the same worker may not be processed while Pyodide/SciPy is busy. Comlink is still used for run-id validation and late no-op behavior, but the shared buffer is what delivers the interrupt to Pyodide during the running call.

## Cleanup

`_optimizeOpm(...)` clears interrupt state in `finally`:

- `pyodide.setInterruptBuffer(undefined)`
- resets the shared buffer to `0`
- clears the active run id
- clears the active interrupt buffer reference
- removes the temporary progress callback global

This cleanup runs for optimized, stopped, failed, and thrown-error paths.

## Python Result Semantics

Pyodide delivers the interrupt to Python as `KeyboardInterrupt`. `optimize_opm(...)` catches it, evaluates the latest recorded optimizer vector, and returns a normal successful partial report:

- `success: true`
- `status: "stopped"`
- `message: "Optimization stopped by user"`
- latest `final_values`
- latest residual and merit function values
- accumulated `optimization_progress`

The UI applies this report exactly like a successful optimization and does not open the warning modal for the user-requested stopped status.
