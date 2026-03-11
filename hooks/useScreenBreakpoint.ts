import { useLayoutEffect, useState } from "react";

export type ScreenSize = "screenSM" | "screenLG";
const DEFAULT_SCREEN: ScreenSize = "screenLG";

const BREAKPOINT_QUERY = "(min-width: 1440px)";

interface SubscriptionEntry {
  handler: (e: MediaQueryListEvent) => void;
  mql: MediaQueryList;
}

// --- Subscriber registry ---
let nextId = 0;
const subscriptions = new Map<number, SubscriptionEntry>();

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

function unsubscribe(id: number): void {
  const entry = subscriptions.get(id);
  if (entry) {
    entry.mql.removeEventListener("change", entry.handler);
    subscriptions.delete(id);
  }
}

// --- Hook ---
export function useScreenBreakpoint(): ScreenSize {
  const [size, setSize] = useState<ScreenSize>(DEFAULT_SCREEN);

  useLayoutEffect(() => {
    const id = subscribe(setSize);
    return () => unsubscribe(id);
  }, []);

  return size;
}

/** Reset module state. Only for testing. */
export function _resetRegistry(): void {
  subscriptions.forEach((entry) => {
    entry.mql.removeEventListener("change", entry.handler);
  });
  subscriptions.clear();
  nextId = 0;
}
