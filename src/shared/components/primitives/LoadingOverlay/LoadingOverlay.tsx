/**
# `shared/components/primitives/LoadingOverlay/LoadingOverlay.tsx`
*/
import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface LoadingOverlayProps {
  /** Bold status heading (e.g. "Initializing Pyodide") */
  readonly title: string;
  /** Supplementary text or progress details shown below the title */
  readonly contents: React.ReactNode;
}

/**
## Purpose

Full-screen loading overlay with an animated spinner, a title, and a neutral content area. Used while heavy async operations (Pyodide init, wheel download) are in progress.

## Key Behaviors

- Renders as `fixed inset-0` with `z-[200]`, covering the entire viewport above all other UI.
- Spinner is an SVG `animate-spin` circle with `aria-hidden="true"`.
- Renders `contents` inside a neutral `<div>`, not a paragraph, so structured content such as progress bars is valid markup.

## Usages

```tsx
// Show during Pyodide initialization
const initOverlayNode = !isReady && (
  <LoadingOverlay
    title="Initializing Ray Optics"
    contents="Loading Pyodide and installing packages…"
  />
);

<Layout>
  {initOverlayNode}
  {/* Page content *\/}
</Layout>

// Custom content with progress details
<LoadingOverlay
  title="Building Lens Model"
  contents={
    <div className="space-y-2">
      <p>Tracing rays...</p>
      <div className="w-32 h-2 bg-gray-300 rounded">
        <div className="h-full bg-blue-500 rounded" style={{ width: `${progress}%` }} />
      </div>
    </div>
  }
/>

// Show during heavy computation
{isCalculating && (
  <LoadingOverlay
    title="Calculating Aberrations"
    contents="Analyzing optical system..."
  />
)}
```
*/
export function LoadingOverlay({ title, contents }: LoadingOverlayProps) {
  const overlayClass = clsx(
    cx.overlay.style.zIndex,
    cx.overlay.style.backdropBlur,
    cx.overlay.color.backdropBgColor
  );
  const panelClass = clsx(
    cx.overlay.style.panelBorderRadius,
    cx.overlay.size.panelHorizontalPadding,
    cx.overlay.size.panelVerticalPadding,
    cx.overlay.style.panelShadow,
    cx.overlay.color.panelBgColor,
    cx.overlay.color.panelTextColor
  );

  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center ${overlayClass}`}>
      <div className={`flex flex-col items-center gap-4 ${panelClass}`}>
        <svg
          className="h-10 w-10 animate-spin text-blue-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <Paragraph className="text-lg font-semibold tracking-wide">{title}</Paragraph>
        <div className="text-center text-sm text-gray-700 dark:text-gray-300">
          {contents}
        </div>
      </div>
    </div>
  );
}
