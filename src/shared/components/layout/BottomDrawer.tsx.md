# `shared/components/layout/BottomDrawer.tsx`

## Purpose

Resizable bottom panel that houses tabbed content. Supports pointer-based drag-to-resize with snap points at collapsed (48px), half (40% vh), and expanded (70% vh) heights. Can also run in non-draggable mode for simple layouts.

## Props

```ts
interface BottomDrawerProps {
  tabs: readonly TabItem[];
  draggable?: boolean;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tabs` | `readonly TabItem[]` | Yes | Tab definitions passed directly to `Tabs` |
| `draggable` | `boolean` | No | Enables drag-resize and collapse toggle. Defaults to `true` |

## Internal State

- `height: number` — current drawer height in pixels; initialized to `window.innerHeight * 0.4` via `useEffect`.
- `collapsed: boolean` — whether the drawer is snapped to its minimum height.
- `dragging: React.MutableRefObject<boolean>` — pointer capture flag.
- `startY / startHeight: React.MutableRefObject<number>` — drag start coordinates.

## Key Behaviors

- Pointer events use `setPointerCapture` to track drag outside the handle element.
- On pointer-up, height snaps to the nearest of three snap points based on the fraction of viewport height.
- Collapse toggle button is injected into `Tabs`'s `actions` slot.
- When `draggable = false`, renders a simpler non-resizable bordered container.

## Usages

```tsx
import { BottomDrawer } from "@/shared/components/layout/BottomDrawer";

// In a container component (e.g., BottomDrawerContainer)
const tabs = useMemo(
  () => [
    {
      id: "specs",
      label: "System Specs",
      content: <SpecsConfigurerContainer store={specsStore} />,
    },
    {
      id: "prescription",
      label: "Prescription",
      content: <LensPrescriptionContainer store={lensStore} {...props} />,
    },
    {
      id: "focusing",
      label: "Focusing",
      content: <FocusingContainer {...focusingProps} />,
    },
  ],
  [specsStore, lensStore, getOpticalModel, onImportJson, onUpdateSystem, isReady, computing, proxy, onError]
);

return <BottomDrawer tabs={tabs} draggable={draggable} />;
```
