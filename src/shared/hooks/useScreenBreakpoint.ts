/** Shared media-query subscriptions for the application's 1440px layout breakpoint. */
import { useLayoutEffect, useState } from "react";

/** Small viewport below 1440px or large viewport at least 1440px wide. */
export type ScreenSize = "screenSM" | "screenLG";
/** SSR-safe initial layout until the pre-paint media-query subscription runs. */
const DEFAULT_SCREEN: ScreenSize = "screenLG";

const BREAKPOINT_QUERY = "(min-width: 1440px)";

interface SubscriptionEntry {
  handler: (e: MediaQueryListEvent) => void;
  mql: MediaQueryList;
}

// --- Subscriber registry ---
let nextId = 0;
const subscriptions = new Map<number, SubscriptionEntry>();

/** Registers one listener and immediately reports the current breakpoint. */
function subscribe(cb: (size: ScreenSize) => void): number {
  const id = nextId++;
  const mql = window.matchMedia(BREAKPOINT_QUERY);
  const handler = (e: MediaQueryListEvent) => {
    cb(e.matches ? "screenLG" : "screenSM");
  };

  subscriptions.set(id, { handler, mql });
  mql.addEventListener("change", handler);

  // Notify immediately with current state
  cb(mql.matches ? "screenLG" : "screenSM");

  return id;
}

/** Removes one registered media-query listener. */
function unsubscribe(id: number): void {
  const entry = subscriptions.get(id);
  if (entry) {
    entry.mql.removeEventListener("change", entry.handler);
    subscriptions.delete(id);
  }
}

// --- Hook ---
/**
 * Return the current responsive breakpoint (`"screenSM"` or `"screenLG"`) based on a `(min-width: 1440px)` media query, updating reactively as the viewport resizes.
 *
 * @remarks
 * ## Behavior
 *
 * 1. The hook initialises `size` to `"screenLG"` (the default, which is also the SSR-safe value).
 * 2. Inside `useLayoutEffect` (runs only in the browser, before paint), it calls the module-level `subscribe()` function, which:
 * - Creates a `MediaQueryList` for `(min-width: 1440px)`.
 * - Attaches a `"change"` listener that updates `size` on every viewport transition.
 * - Immediately fires the callback with the current match state so the initial value is correct before the first paint.
 * 3. The cleanup function returned by `useLayoutEffect` calls `unsubscribe()`, which removes the event listener and deletes the entry from the internal registry.
 * 4. Returns the current `size` value.
 *
 * ## Edge Cases / Error Handling
 *
 * - Multiple hook instances each register an independent listener via the internal subscription registry; they do not interfere with one another.
 * - `_resetRegistry()` is exported for test isolation only — not for production use.
 *
 * This keeps child components testable without a real browser environment.
 */
export function useScreenBreakpoint(): ScreenSize {
  const [size, setSize] = useState<ScreenSize>(DEFAULT_SCREEN);

  useLayoutEffect(() => {
    const id = subscribe(setSize);
    return () => unsubscribe(id);
  }, []);

  return size;
}

/** Removes every media-query listener and resets ids for test isolation. */
export function _resetRegistry(): void {
  subscriptions.forEach((entry) => {
    entry.mql.removeEventListener("change", entry.handler);
  });
  subscriptions.clear();
  nextId = 0;
}
