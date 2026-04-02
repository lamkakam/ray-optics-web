# `app/page.tsx`

## Purpose
Root route page (`/`). Renders the lens editor using Pyodide state supplied by `AppShellContext`.

## Behaviour
- Reads `proxy`, `isReady`, and `openErrorModal` from `useAppShell()`
- Renders `LensEditor`
- Passes `openErrorModal` to `LensEditor` as `onError`
