# `app/AppShellContext.tsx`

## Purpose
Client-only context for app routes rendered inside the shared shell. Exposes shared Pyodide state and shell-level UI actions without prop drilling through every page.

## Context Value

```ts
interface AppShellContextValue {
  proxy: PyodideWorkerAPI | undefined;
  isReady: boolean;
  openErrorModal: () => void;
}
```

## Behaviour
- `proxy` and `isReady` come from `usePyodide()` owned by `app/AppShell.tsx`
- `openErrorModal()` lets child pages surface worker/setup errors through the shared shell modal
- `useAppShell()` throws if called outside `AppShellProvider`

## Consumers
- `app/page.tsx`
- `app/glass-map/page.tsx`
