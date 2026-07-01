import { useCallback, useEffect, useRef } from "react";

type DebouncedCallbackControls<Args extends readonly unknown[]> = {
  readonly run: (...args: Args) => void;
  readonly cancel: () => void;
};

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
