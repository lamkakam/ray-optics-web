"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { cx } from "@/components/ui/modalTokens";

interface DrawerTab {
  readonly id: string;
  readonly label: string;
  readonly content: React.ReactNode;
}

interface BottomDrawerProps {
  readonly tabs: readonly DrawerTab[];
  readonly draggable?: boolean;
}

const SNAP_COLLAPSED = 48;
const SNAP_HALF = 0.4;
const SNAP_EXPANDED = 0.7;

export function BottomDrawer({ tabs, draggable = true }: BottomDrawerProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");
  const [height, setHeight] = useState(300);

  useEffect(() => {
    setHeight(Math.round(window.innerHeight * SNAP_HALF));
  }, []);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      startY.current = e.clientY;
      startHeight.current = collapsed ? SNAP_COLLAPSED : height;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [height, collapsed]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    const newHeight = Math.max(
      SNAP_COLLAPSED,
      Math.min(startHeight.current + delta, window.innerHeight * 0.85)
    );
    setHeight(Math.round(newHeight));
    setCollapsed(newHeight <= SNAP_COLLAPSED + 10);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    // snap to nearest
    const vh = window.innerHeight;
    const ratio = height / vh;
    if (ratio < 0.15) {
      setHeight(SNAP_COLLAPSED);
      setCollapsed(true);
    } else if (ratio < 0.55) {
      setHeight(Math.round(vh * SNAP_HALF));
      setCollapsed(false);
    } else {
      setHeight(Math.round(vh * SNAP_EXPANDED));
      setCollapsed(false);
    }
  }, [height]);

  const toggleCollapse = useCallback(() => {
    if (collapsed) {
      setHeight(Math.round(window.innerHeight * SNAP_HALF));
      setCollapsed(false);
    } else {
      setHeight(SNAP_COLLAPSED);
      setCollapsed(true);
    }
  }, [collapsed]);

  if (!draggable) {
    return (
      <div className="flex flex-col border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-3 dark:border-gray-700">
          <div role="tablist" className="flex flex-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-label={tab.label}
                aria-selected={activeTab === tab.id}
                className={`rounded-t-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === tab.id ? cx.tabActive : cx.tabInactive
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div role="tabpanel" className="p-3">
          {tabs.find((t) => t.id === activeTab)?.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col border-t border-gray-200 bg-white will-change-[height] dark:border-gray-700 dark:bg-gray-900"
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

      {/* Tab bar + toggle */}
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-3 dark:border-gray-700">
        <div role="tablist" className="flex flex-1 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-label={tab.label}
              aria-selected={activeTab === tab.id}
              className={`rounded-t-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Toggle drawer"
          className="rounded p-1 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
          onClick={toggleCollapse}
        >
          {collapsed ? "▲" : "▼"}
        </button>
      </div>

      {/* Tab content */}
      {!collapsed && (
        <div role="tabpanel" className="flex-1 overflow-auto p-3">
          {tabs.find((t) => t.id === activeTab)?.content}
        </div>
      )}
    </div>
  );
}
