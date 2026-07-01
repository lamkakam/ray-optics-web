# `shared/hooks/useDebouncedCallback.ts`

## Purpose

Provide a small shared React hook for delayed, cancelable side effects that should only run after recent input settles.

## API

```ts
useDebouncedCallback<Args extends readonly unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): {
  readonly run: (...args: Args) => void;
  readonly cancel: () => void;
}
```

## Behavior

- `run(...args)` clears any pending timer and schedules `callback(...args)` after `delayMs`.
- If `run(...)` is called repeatedly before the delay expires, only the latest arguments are delivered.
- `cancel()` clears pending work and is a no-op when no timer is pending.
- Pending work is canceled automatically when the component using the hook unmounts.
- The scheduled callback reads the latest callback implementation through a ref, so rerenders can update callback behavior without recreating the pending timer.

## Conventions

- Uses `undefined` for the absence of a timer id.
- Does not introduce runtime dependencies beyond React and browser timer APIs.
