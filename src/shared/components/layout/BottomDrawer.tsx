"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import clsx from "clsx";
import { Tabs, TabItem } from "@/shared/components/primitives/Tabs";

export type { TabItem };

interface BottomDrawerProps {
  readonly tabs: readonly TabItem[];
  readonly draggable?: boolean;
  readonly panelClassName?: string;
  readonly activeTabId?: string;
  readonly onTabChange?: (tabId: string) => void;
  readonly initialHeight?: number;
  readonly onHeightCommit?: (height: number) => void;
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

export function BottomDrawer({
  tabs,
  draggable = true,
  panelClassName,
  activeTabId,
  onTabChange,
  initialHeight,
  onHeightCommit,
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
  }, []);

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
      onHeightCommit?.(defaultHeight);
    } else {
      heightRef.current = SNAP_COLLAPSED;
      collapsedRef.current = true;
      setHeight(SNAP_COLLAPSED);
      setCollapsed(true);
      onHeightCommit?.(SNAP_COLLAPSED);
    }
  }, [collapsed, onHeightCommit]);

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
