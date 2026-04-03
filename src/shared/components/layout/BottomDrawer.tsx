"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Tabs, TabItem } from "@/shared/components/primitives/Tabs";

export type { TabItem };

interface BottomDrawerProps {
  readonly tabs: readonly TabItem[];
  readonly draggable?: boolean;
}

const SNAP_COLLAPSED = 48;
const DEFAULT_OPEN_HEIGHT_RATIO = 0.4;
const MAX_HEIGHT_RATIO = 0.85;

function getDefaultOpenHeight(): number {
  return Math.round(window.innerHeight * DEFAULT_OPEN_HEIGHT_RATIO);
}

export function BottomDrawer({ tabs, draggable = true }: BottomDrawerProps) {
  const [height, setHeight] = useState(300);

  useEffect(() => {
    setHeight(getDefaultOpenHeight()); // eslint-disable-line react-hooks/set-state-in-effect -- syncing with browser viewport API
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
      Math.min(startHeight.current + delta, window.innerHeight * MAX_HEIGHT_RATIO)
    );
    setHeight(Math.round(newHeight));
    setCollapsed(newHeight <= SNAP_COLLAPSED + 10);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
  }, []);

  const toggleCollapse = useCallback(() => {
    if (collapsed) {
      setHeight(getDefaultOpenHeight());
      setCollapsed(false);
    } else {
      setHeight(SNAP_COLLAPSED);
      setCollapsed(true);
    }
  }, [collapsed]);

  if (!draggable) {
    return (
      <div className="flex flex-col border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <Tabs tabs={tabs} panelClassName="p-3" />
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
        panelClassName="flex-1 overflow-auto p-3"
      />
    </div>
  );
}
