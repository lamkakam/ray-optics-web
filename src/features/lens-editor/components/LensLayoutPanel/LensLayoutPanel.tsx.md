# `features/lens-editor/components/LensLayoutPanel/LensLayoutPanel.tsx`

## Purpose

Displays the lens layout diagram received as a base64-encoded PNG from the Pyodide worker. Shows appropriate placeholder text when no image is available or during loading.

## Props

```ts
interface LensLayoutPanelProps {
  imageBase64?: string;
  loading?: boolean;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `imageBase64` | `string` | No | Base64 PNG data (without the `data:image/png;base64,` prefix) |
| `loading` | `boolean` | No | When `true` and an image is present, a semi-transparent "Updating..." overlay is shown. When `true` and no image yet, shows "Loading lens layout..." placeholder |

## Key Behaviors

- Uses a plain `<img>` tag with a `data:image/png;base64,` URI (not `next/image`, which cannot optimize data URIs).
- The loading overlay uses `dark:bg-gray-900/60` to avoid pure-white flash in dark mode.
- The root div has `overflow-hidden` to prevent placeholder text from bleeding over the BottomDrawer when the viewport height is small (the root div is `position: relative`, which would otherwise paint it above non-positioned sibling elements).

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
    {/* Render in tabs or drawer */}
    {lensLayoutPanel}
  </div>
);
```
