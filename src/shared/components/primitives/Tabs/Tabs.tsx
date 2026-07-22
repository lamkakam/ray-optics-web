/**
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

interface TabsProps {
  /** Tab definitions — id, label, and content node */
  readonly tabs: readonly TabItem[];
  /** Extra element rendered at the far-right of the tab bar (e.g. collapse button) */
  readonly actions?: React.ReactNode;
  /** When `false` the content panel is hidden. Defaults to `true` */
  readonly showPanel?: boolean;
  /** Applied to the `role="tabpanel"` div */
  readonly panelClassName?: string;
  /** Controlled active tab id. When omitted, `Tabs` manages its own internal selection state */
  readonly activeTabId?: string;
  /** Called whenever the user clicks a tab, in both controlled and uncontrolled modes */
  readonly onTabChange?: (tabId: string) => void;
}

/**
Accessible tabbed panel component. Renders a tab bar with ARIA roles and a content panel for the active tab. Supports an optional action slot beside the tabs and a collapsible panel.

## Key Behaviors

- Tab buttons carry `role="tab"`, `aria-selected`, and `aria-label`.
- The content area carries `role="tabpanel"`.
- Tab bar scrolls horizontally when tabs overflow.
- In controlled mode, `activeTabId` decides the selected tab and clicks only emit `onTabChange`.
- If `activeTabId` or the uncontrolled state points to a tab id that is no longer present, `Tabs` safely falls back to the first tab in `tabs`.
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
