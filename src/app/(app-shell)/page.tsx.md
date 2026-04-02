# `app/(app-shell)/page.tsx`

## Purpose
Root route page (`/`) for the App Router shell. Renders the lens editor using Pyodide state supplied by `AppShellContext`.

## Behaviour
- Reads `proxy`, `isReady`, and `openErrorModal` from `useAppShell()`
- Renders `LensEditor`
- Passes `openErrorModal` to `LensEditor` as `onError`
