# `app/(app-shell)/AppShellContext.tsx`

## Purpose
Client-only context for route components rendered inside the app-shell route group. Exposes shared Pyodide state and shell-level UI actions without prop drilling through every route page.

## Context Value

```ts
interface AppShellContextValue {
  proxy: PyodideWorkerAPI | undefined;
  isReady: boolean;
  openErrorModal: () => void;
}
```

## Behaviour
- `proxy` and `isReady` come from `usePyodide()` owned by the app-shell layout
- `openErrorModal()` lets child routes surface worker/setup errors through the shared shell modal
- `useAppShell()` throws if called outside `AppShellProvider`

## Consumers
- `app/(app-shell)/page.tsx`
- `app/(app-shell)/glass-map/page.tsx`
