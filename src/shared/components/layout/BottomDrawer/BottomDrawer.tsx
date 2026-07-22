/**
# `shared/components/layout/BottomDrawer/BottomDrawer.tsx`

## Internal State

- `height: number` — current drawer height in pixels; initialized on first render from `initialHeight` or `window.innerHeight * 0.4`.
- `collapsed: boolean` — whether the drawer is currently collapsed to its minimum height.
- `dragging: React.MutableRefObject<boolean>` — pointer capture flag.
- `startY / startHeight: React.MutableRefObject<number>` — drag start coordinates.
*/
"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import clsx from "clsx";
import { Tabs, TabItem } from "@/shared/components/primitives/Tabs";

export type { TabItem };

/**
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
  onHeightChange?: (height: number) => void;
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
| `onHeightChange` | `(height: number) => void` | No | Optional callback invoked on live height changes while dragging and on collapse/expand toggles so surrounding layouts can react immediately |
*/
interface BottomDrawerProps {
  readonly tabs: readonly TabItem[];
  readonly draggable?: boolean;
  readonly panelClassName?: string;
  readonly activeTabId?: string;
  readonly onTabChange?: (tabId: string) => void;
  readonly initialHeight?: number;
  readonly onHeightCommit?: (height: number) => void;
  readonly onHeightChange?: (height: number) => void;
}

const SNAP_COLLAPSED = 48;
const DEFAULT_OPEN_HEIGHT_RATIO = 0.4;
const MAX_HEIGHT_RATIO = 0.85;

function getDefaultOpenHeight(): number {
  return Math.round(window.innerHeight * DEFAULT_OPEN_HEIGHT_RATIO);
}

function isCollapsedHeight(height: number): boolean {
  return height <= SNAP_COLLAPSED + 10;
}

/**
## Purpose

Resizable bottom panel that houses tabbed content. Supports pointer-based drag-to-resize with a continuous height between collapsed (48px) and a viewport-based maximum (85vh). Can also run in non-draggable mode for simple layouts.

## Key Behaviors

- Pointer events use `setPointerCapture` to track drag outside the handle element.
- While dragging, the drawer height updates continuously within a bounded range of 48px to 85% of the viewport height.
- While dragging, `onHeightChange` receives the current live height on every pointer move.
- On pointer-up, dragging stops without snapping to preset heights and commits the final height through `onHeightCommit`.
- Dragging close to the minimum height collapses the drawer and hides the active tab panel.
- Collapse toggle button is injected into `Tabs`'s `actions` slot.
- Collapsing and expanding through the toggle both emit `onHeightChange`; expanding from the collapsed state restores the default open height of `window.innerHeight * 0.4` and commits that height through `onHeightCommit`.
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
*/
export function BottomDrawer({
  tabs,
  draggable = true,
  panelClassName,
  activeTabId,
  onTabChange,
  initialHeight,
  onHeightCommit,
  onHeightChange,
}: BottomDrawerProps) {
  const resolvedInitialHeight = initialHeight ?? 300;
  const resolvedInitialCollapsed = isCollapsedHeight(resolvedInitialHeight);
  const [height, setHeight] = useState(resolvedInitialHeight);
  const [collapsed, setCollapsed] = useState(resolvedInitialCollapsed);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const heightRef = useRef(resolvedInitialHeight);
  const collapsedRef = useRef(resolvedInitialCollapsed);

  useEffect(() => {
    if (initialHeight !== undefined) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const defaultHeight = getDefaultOpenHeight();
      heightRef.current = defaultHeight;
      collapsedRef.current = false;
      setHeight(defaultHeight);
      setCollapsed(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [initialHeight]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      startY.current = e.clientY;
      startHeight.current = collapsedRef.current ? SNAP_COLLAPSED : heightRef.current;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    const newHeight = Math.max(
      SNAP_COLLAPSED,
      Math.min(startHeight.current + delta, window.innerHeight * MAX_HEIGHT_RATIO)
    );
    const roundedHeight = Math.round(newHeight);
    const nextCollapsed = isCollapsedHeight(newHeight);
    heightRef.current = roundedHeight;
    collapsedRef.current = nextCollapsed;
    setHeight(roundedHeight);
    setCollapsed(nextCollapsed);
    onHeightChange?.(nextCollapsed ? SNAP_COLLAPSED : roundedHeight);
  }, [onHeightChange]);

  const handlePointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    onHeightCommit?.(collapsedRef.current ? SNAP_COLLAPSED : heightRef.current);
  }, [onHeightCommit]);

  const toggleCollapse = useCallback(() => {
    if (collapsed) {
      const defaultHeight = getDefaultOpenHeight();
      heightRef.current = defaultHeight;
      collapsedRef.current = false;
      setHeight(defaultHeight);
      setCollapsed(false);
      onHeightChange?.(defaultHeight);
      onHeightCommit?.(defaultHeight);
    } else {
      heightRef.current = SNAP_COLLAPSED;
      collapsedRef.current = true;
      setHeight(SNAP_COLLAPSED);
      setCollapsed(true);
      onHeightChange?.(SNAP_COLLAPSED);
      onHeightCommit?.(SNAP_COLLAPSED);
    }
  }, [collapsed, onHeightChange, onHeightCommit]);

  if (!draggable) {
    return (
      <div className="flex shrink-0 flex-col border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <Tabs
          tabs={tabs}
          panelClassName={clsx("p-3", panelClassName)}
          activeTabId={activeTabId}
          onTabChange={onTabChange}
        />
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 flex-col border-t border-gray-200 bg-white will-change-[height] dark:border-gray-700 dark:bg-gray-900"
      style={{ height: collapsed ? SNAP_COLLAPSED : height }}
    >
      {/* Drag handle */}
      <div
        role="separator"
        aria-label="Resize drawer"
        className="flex shrink-0 cursor-row-resize items-center justify-center py-1"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      <Tabs
        tabs={tabs}
        actions={
          <button
            type="button"
            aria-label="Toggle drawer"
            className="rounded p-1 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
            onClick={toggleCollapse}
          >
            {collapsed ? "▲" : "▼"}
          </button>
        }
        showPanel={!collapsed}
        panelClassName={clsx("flex-1 overflow-auto p-3", panelClassName)}
        activeTabId={activeTabId}
        onTabChange={onTabChange}
      />
    </div>
  );
}
