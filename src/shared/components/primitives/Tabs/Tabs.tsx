/**
# `shared/components/primitives/Tabs/Tabs.tsx`

## Internal State

- `internalActiveTabId: string` — uncontrolled active tab id, initialized to `tabs[0]?.id`.
*/
"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly content: React.ReactNode;
}

/**
## Props

```ts
interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: readonly TabItem[];
  actions?: React.ReactNode;
  showPanel?: boolean;
  panelClassName?: string;
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tabs` | `readonly TabItem[]` | Yes | Tab definitions — id, label, and content node |
| `actions` | `React.ReactNode` | No | Extra element rendered at the far-right of the tab bar (e.g. collapse button) |
| `showPanel` | `boolean` | No | When `false` the content panel is hidden. Defaults to `true` |
| `panelClassName` | `string` | No | Applied to the `role="tabpanel"` div |
| `activeTabId` | `string` | No | Controlled active tab id. When omitted, `Tabs` manages its own internal selection state |
| `onTabChange` | `(tabId: string) => void` | No | Called whenever the user clicks a tab, in both controlled and uncontrolled modes |
*/
interface TabsProps {
  readonly tabs: readonly TabItem[];
  readonly actions?: React.ReactNode;
  readonly showPanel?: boolean;
  readonly panelClassName?: string;
  readonly activeTabId?: string;
  readonly onTabChange?: (tabId: string) => void;
}

/**
## Purpose

Accessible tabbed panel component. Renders a tab bar with ARIA roles and a content panel for the active tab. Supports an optional action slot beside the tabs and a collapsible panel.

## Key Behaviors

- Tab buttons carry `role="tab"`, `aria-selected`, and `aria-label`.
- The content area carries `role="tabpanel"`.
- Tab bar scrolls horizontally when tabs overflow.
- In controlled mode, `activeTabId` decides the selected tab and clicks only emit `onTabChange`.
- If `activeTabId` or the uncontrolled state points to a tab id that is no longer present, `Tabs` safely falls back to the first tab in `tabs`.

## Usages

```tsx
// Analysis results tabs in BottomDrawer
const tabs = [
  {
    id: "ray-fan",
    label: "Ray Fan",
    content: <RayFanPlot data={plotData} />,
  },
  {
    id: "spot-diagram",
    label: "Spot Diagram",
    content: <SpotDiagramPlot data={plotData} />,
  },
  {
    id: "wavefront",
    label: "Wavefront",
    content: <WavefrontPlot data={plotData} />,
  },
];

<Tabs
  tabs={tabs}
  actions={<collapseButton />}
  showPanel={true}
/>

// Tabs with custom panel styling
<Tabs
  tabs={configTabs}
  panelClassName="p-6 bg-gray-50"
/>
```
*/
export function Tabs({
  tabs,
  actions,
  showPanel = true,
  panelClassName,
  activeTabId,
  onTabChange,
}: TabsProps) {
  const [internalActiveTabId, setInternalActiveTabId] = useState(tabs[0]?.id ?? "");
  const resolvedActiveTabId = tabs.some((tab) => tab.id === activeTabId)
    ? activeTabId
    : undefined;
  const activeTab = resolvedActiveTabId ?? (
    tabs.some((tab) => tab.id === internalActiveTabId) ? internalActiveTabId : tabs[0]?.id ?? ""
  );

  const handleTabClick = (tabId: string) => {
    if (resolvedActiveTabId === undefined) {
      setInternalActiveTabId(tabId);
    }
    onTabChange?.(tabId);
  };

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-3 dark:border-gray-700">
        <div role="tablist" className="flex flex-1 gap-1 overflow-x-auto min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-label={tab.label}
              aria-selected={activeTab === tab.id}
              className={clsx(
                "rounded-t-lg px-3 py-1.5 text-sm font-medium transition whitespace-nowrap shrink-0",
                activeTab === tab.id
                  ? [cx.tab.color.activeBgColor, cx.tab.color.activeTextColor]
                  : [cx.tab.color.inactiveTextColor, cx.tab.color.inactiveHoverTextColor],
              )}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {actions}
      </div>
      {showPanel && (
        <div role="tabpanel" className={panelClassName}>
          {tabs.find((t) => t.id === activeTab)?.content}
        </div>
      )}
    </>
  );
}
