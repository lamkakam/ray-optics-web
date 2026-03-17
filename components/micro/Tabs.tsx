"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/styleTokens";

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly content: React.ReactNode;
}

interface TabsProps {
  readonly tabs: readonly TabItem[];
  readonly actions?: React.ReactNode;
  readonly showPanel?: boolean;
  readonly panelClassName?: string;
}

export function Tabs({ tabs, actions, showPanel = true, panelClassName }: TabsProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");

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
              onClick={() => setActiveTab(tab.id)}
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
