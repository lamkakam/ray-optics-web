/**
## Conventions

- Uses `undefined` for the absence of a timer id.
- Does not introduce runtime dependencies beyond React and browser timer APIs.
*/
import { useCallback, useEffect, useRef } from "react";

type DebouncedCallbackControls<Args extends readonly unknown[]> = {
  readonly run: (...args: Args) => void;
  readonly cancel: () => void;
};

/**
Provide a small shared React hook for delayed, cancelable side effects that should only run after recent input settles.

## Behavior

- `run(...args)` clears any pending timer and schedules `callback(...args)` after `delayMs`.
- If `run(...)` is called repeatedly before the delay expires, only the latest arguments are delivered.
- `cancel()` clears pending work and is a no-op when no timer is pending.
- Pending work is canceled automatically when the component using the hook unmounts.
- The scheduled callback reads the latest callback implementation through a ref, so rerenders can update callback behavior without recreating the pending timer.
*/
export function useDebouncedCallback<Args extends readonly unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): DebouncedCallbackControls<Args> {
  const callbackRef = useRef(callback);
  const timeoutIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timeoutIdRef.current === undefined) {
      return;
    }

    window.clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = undefined;
  }, []);

  const run = useCallback((...args: Args) => {
    cancel();
    timeoutIdRef.current = window.setTimeout(() => {
      timeoutIdRef.current = undefined;
      callbackRef.current(...args);
    }, delayMs);
  }, [cancel, delayMs]);

  useEffect(() => cancel, [cancel]);

  return { run, cancel };
}
