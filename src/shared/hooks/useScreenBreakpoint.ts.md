# `shared/hooks/useScreenBreakpoint.ts`

## Purpose

Return the current responsive breakpoint (`"screenSM"` or `"screenLG"`) based on a `(min-width: 1440px)` media query, updating reactively as the viewport resizes.

## Return Value

```ts
type ScreenSize = "screenSM" | "screenLG";
```

- `"screenLG"` — viewport is ≥ 1440 px wide.
- `"screenSM"` — viewport is < 1440 px wide.

## Behavior

1. The hook initialises `size` to `"screenLG"` (the default, which is also the SSR-safe value).
2. Inside `useLayoutEffect` (runs only in the browser, before paint), it calls the module-level `subscribe()` function, which:
   - Creates a `MediaQueryList` for `(min-width: 1440px)`.
   - Attaches a `"change"` listener that updates `size` on every viewport transition.
   - Immediately fires the callback with the current match state so the initial value is correct before the first paint.
3. The cleanup function returned by `useLayoutEffect` calls `unsubscribe()`, which removes the event listener and deletes the entry from the internal registry.
4. Returns the current `size` value.

## Default

The module-level default is `"screenLG"`. The usage of `useLayoutEffect` is to avoid a visible layout shift.

## Dependencies

- `useState`, `useLayoutEffect` from React.
- Browser `window.matchMedia` API.

## Edge Cases / Error Handling

- Multiple hook instances each register an independent listener via the internal subscription registry; they do not interfere with one another.
- `_resetRegistry()` is exported for test isolation only — not for production use.

## Usages

```tsx
"use client";

import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";

export function ResponsiveLayout() {
  const screenSize = useScreenBreakpoint();

  return (
    <div>
      {screenSize === "screenLG" ? (
        <div className="flex gap-8">
          <Sidebar />
          <MainContent />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <MainContent />
          <Sidebar />
        </div>
      )}
    </div>
  );
}

// Better: pass breakpoint to children as a prop for testability
export function PageContainer() {
  const screenSize = useScreenBreakpoint();

  return <MainLayout screenSize={screenSize} />;
}

interface MainLayoutProps {
  screenSize: "screenSM" | "screenLG";
}
```

This keeps child components testable without a real browser environment.
