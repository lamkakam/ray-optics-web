# `features/optimization/providers/OptimizationStoreProvider.tsx`

## Purpose

Creates the optimization store once and exposes it through React context so `/optimization` state persists across route switches.

## Exports

- `OptimizationStoreContext` — raw context for tests
- `OptimizationStoreProvider` — provider mounted once in `app/layout.tsx`
- `useOptimizationStore()` — returns `StoreApi<OptimizationState>`

## Behavior

- The provider creates the store once per mount with `useState(() => createStore(...))`.
- `useOptimizationStore()` throws when called outside the provider.
- Tests may inject a pre-built store directly with `<OptimizationStoreContext.Provider value={store}>`.
