# `e2e/pyodideModuleWorkerDev.spec.ts`

## Purpose

Regression coverage for the Next.js development bundle that starts the Pyodide worker.

## Behavior

- Runs against the Playwright-configured `npm run dev` server.
- Records page console errors, uncaught page and worker errors, and created worker URLs before navigation.
- Waits for the normal Pyodide initialization flow to complete.
- Confirms the Pyodide worker was created and rejects the Pyodide loader's `Classic web workers are not supported` failure.
- Requires initialization to complete without browser runtime errors.
