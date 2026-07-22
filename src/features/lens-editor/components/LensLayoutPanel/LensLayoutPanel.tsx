/**
# `features/lens-editor/components/LensLayoutPanel/LensLayoutPanel.tsx`
*/
import clsx from "clsx";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface LensLayoutPanelProps {
  /** Base64 PNG data (without the `data:image/png;base64,` prefix) */
  readonly imageBase64?: string;
  /** When `true` and an image is present, a semi-transparent "Updating..." overlay is shown. When `true` and no image yet, shows "Loading lens layout..." placeholder */
  readonly loading?: boolean;
}

/**
## Purpose

Displays the lens layout diagram received as a base64-encoded PNG from the Pyodide worker. Shows appropriate placeholder text when no image is available or during loading.

## Key Behaviors

- Uses a plain `<img>` tag with a `data:image/png;base64,` URI (not `next/image`, which cannot optimize data URIs).
- The loading overlay uses `dark:bg-gray-900/60` to avoid pure-white flash in dark mode.
- The root div has `overflow-hidden` to prevent placeholder text from bleeding over the BottomDrawer when the viewport height is small (the root div is `position: relative`, which would otherwise paint it above non-positioned sibling elements).
- The empty-state copy tells users to configure System Specs and Lens Prescription manually, then click "Update System" to render the layout. It points example-based starts through the menu button to the separate Example Systems page, where an example can be applied.

## Usages

```tsx
import { LensLayoutPanel } from "@/features/lens-editor/components/LensLayoutPanel";
import { useLensLayoutImageStore } from "@/features/analysis/providers/LensLayoutImageStoreProvider";
import { useStore } from "zustand";

// In a page or container component (e.g., LensEditor)
const store = useLensLayoutImageStore();
const layoutImage = useStore(store, (s) => s.layoutImage);
const layoutLoading = useStore(store, (s) => s.layoutLoading);

const lensLayoutPanel = (
  <LensLayoutPanel imageBase64={layoutImage} loading={layoutLoading} />
);

return (
  <div>
    {/* Render in tabs or drawer *\/}
    {lensLayoutPanel}
  </div>
);
```
*/
export function LensLayoutPanel({
  imageBase64,
  loading,
}: LensLayoutPanelProps) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      {imageBase64 ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not optimizable by next/image */}
          <img
            src={`data:image/png;base64,${imageBase64}`}
            alt="Lens layout diagram"
            className="max-h-full max-w-full object-contain"
          />
          {loading && (
            <div className={clsx("absolute inset-0 flex items-center justify-center", "dark:bg-gray-900/60")}>
              <Paragraph variant="placeholder">
                Updating...
              </Paragraph>
            </div>
          )}
        </>
      ) : (
        <Paragraph variant="placeholder">
          {loading
            ? "Loading lens layout..."
            : "Configure the System Specs and Lens Prescription below, then click \u201cUpdate System\u201d to view the lens layout. To start from an example, click the menu button, open Example Systems, and apply one there."}
        </Paragraph>
      )}
    </div>
  );
}
