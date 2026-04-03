# `shared/components/layout/BottomDrawer.tsx`

## Purpose

Resizable bottom panel that houses tabbed content. Supports pointer-based drag-to-resize with a continuous height between collapsed (48px) and a viewport-based maximum (85vh). Can also run in non-draggable mode for simple layouts.

## Props

```ts
interface BottomDrawerProps {
  tabs: readonly TabItem[];
  draggable?: boolean;
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tabs` | `readonly TabItem[]` | Yes | Tab definitions passed directly to `Tabs` |
| `draggable` | `boolean` | No | Enables drag-resize and collapse toggle. Defaults to `true` |
| `activeTabId` | `string` | No | Optional controlled active tab id forwarded to `Tabs` |
| `onTabChange` | `(tabId: string) => void` | No | Optional tab click callback forwarded to `Tabs` |

## Internal State

- `height: number` — current drawer height in pixels; initialized to `window.innerHeight * 0.4` via `useEffect`.
- `collapsed: boolean` — whether the drawer is currently collapsed to its minimum height.
- `dragging: React.MutableRefObject<boolean>` — pointer capture flag.
- `startY / startHeight: React.MutableRefObject<number>` — drag start coordinates.

## Key Behaviors

- Pointer events use `setPointerCapture` to track drag outside the handle element.
- While dragging, the drawer height updates continuously within a bounded range of 48px to 85% of the viewport height.
- On pointer-up, dragging stops without snapping to preset heights.
- Dragging close to the minimum height collapses the drawer and hides the active tab panel.
- Collapse toggle button is injected into `Tabs`'s `actions` slot.
- Expanding from the collapsed state restores the default open height of `window.innerHeight * 0.4`.
- When `draggable = false`, renders a simpler non-resizable bordered container.
- Tab selection can be either uncontrolled or externally controlled through the forwarded `activeTabId` / `onTabChange` props.

## Usages

```tsx
import { BottomDrawer } from "@/shared/components/layout/BottomDrawer";

// In a container component (e.g., BottomDrawerContainer)
const tabs = useMemo(
  () => [
    {
      id: "specs",
      label: "System Specs",
      content: <SpecsConfiguratorContainer />,
    },
    {
      id: "prescription",
      label: "Prescription",
      content: <LensPrescriptionContainer {...props} />,
    },
    {
      id: "focusing",
      label: "Focusing",
      content: <FocusingContainer {...focusingProps} />,
    },
  ],
  [getOpticalModel, onImportJson, onUpdateSystem, isReady, computing, proxy, onError]
);

return <BottomDrawer tabs={tabs} draggable={draggable} />;
```
