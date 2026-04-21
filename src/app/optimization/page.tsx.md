# `app/optimization/page.tsx`

## Purpose

App Router page for `/optimization`.

## Behavior

- Reads `proxy`, `isReady`, and `openErrorModal` from `useAppShell()`.
- Renders `features/optimization/OptimizationPage`.
- Delegates worker/setup errors to the shared shell error modal via `openErrorModal`.
