/**
 * Factory for the Pyodide web worker.
 * Extracted to its own module so tests can mock it
 * without hitting import.meta.url issues.
 */
export function createPyodideWorker(): Worker {
  return new Worker(
    new URL("../workers/pyodide.worker.ts", import.meta.url)
  );
}
