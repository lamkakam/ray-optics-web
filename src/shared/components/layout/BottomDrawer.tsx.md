# `shared/components/layout/BottomDrawer.tsx`

## Purpose

Resizable bottom panel that houses tabbed content. Supports pointer-based drag-to-resize with a continuous height between collapsed (48px) and a viewport-based maximum (85vh). Can also run in non-draggable mode for simple layouts.

## Props

```ts
interface BottomDrawerProps {
  tabs: readonly TabItem[];
  draggable?: boolean;
  panelClassName?: string;
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  initialHeight?: number;
  onHeightCommit?: (height: number) => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tabs` | `readonly TabItem[]` | Yes | Tab definitions passed directly to `Tabs` |
| `draggable` | `boolean` | No | Enables drag-resize and collapse toggle. Defaults to `true` |
| `panelClassName` | `string` | No | Extra classes appended to the tab panel so callers can override or extend the default panel padding/scroll styling |
| `activeTabId` | `string` | No | Optional controlled active tab id forwarded to `Tabs` |
| `onTabChange` | `(tabId: string) => void` | No | Optional tab click callback forwarded to `Tabs` |
| `initialHeight` | `number` | No | Optional persisted drawer height in pixels used for the first render |
| `onHeightCommit` | `(height: number) => void` | No | Optional callback invoked when the drawer height is committed after resize settles or collapse/expand toggles |

## Internal State

- `height: number` — current drawer height in pixels; initialized on first render from `initialHeight` or `window.innerHeight * 0.4`.
- `collapsed: boolean` — whether the drawer is currently collapsed to its minimum height.
- `dragging: React.MutableRefObject<boolean>` — pointer capture flag.
- `startY / startHeight: React.MutableRefObject<number>` — drag start coordinates.

## Key Behaviors

- Pointer events use `setPointerCapture` to track drag outside the handle element.
- While dragging, the drawer height updates continuously within a bounded range of 48px to 85% of the viewport height.
- On pointer-up, dragging stops without snapping to preset heights and commits the final height through `onHeightCommit`.
- Dragging close to the minimum height collapses the drawer and hides the active tab panel.
- Collapse toggle button is injected into `Tabs`'s `actions` slot.
- Expanding from the collapsed state restores the default open height of `window.innerHeight * 0.4` and commits that height through `onHeightCommit`.
- When `draggable = false`, renders a simpler non-resizable bordered container.
- Caller-provided `panelClassName` is appended after the drawer's default panel classes, so feature pages can override padding with Tailwind utilities such as `p-0` without changing the shared drawer defaults.
- Tab selection can be either uncontrolled or externally controlled through the forwarded `activeTabId` / `onTabChange` props.
- `initialHeight` values at or below the collapsed threshold (`48 + 10`) start the drawer in the collapsed state on the first render.
- The drawer root is `shrink-0` in both draggable and non-draggable modes so flex layouts preserve the committed drawer height instead of compressing the panel internals.

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
