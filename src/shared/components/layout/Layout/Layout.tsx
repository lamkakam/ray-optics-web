"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/primitives/Button";
import { Header } from "@/shared/components/primitives/Header";
import { SideNav } from "@/shared/components/layout/SideNav";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";

interface LayoutProps {
  readonly children: React.ReactNode;
  readonly onNavigate?: (href: string, event: React.MouseEvent<HTMLAnchorElement>) => boolean;
}

export function Layout({ children, onNavigate }: LayoutProps) {
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const hamburgerRef = useRef<HTMLSpanElement>(null);
  const sideNavRef = useRef<HTMLDivElement>(null);
  const screenSize = useScreenBreakpoint();
  const isLG = screenSize === "screenLG";

  useEffect(() => {
    if (!sideNavOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (sideNavRef.current?.contains(target) || hamburgerRef.current?.contains(target)) {
        return;
      }

      setSideNavOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [sideNavOpen]);

  const hamburgerButton = (
    <span ref={hamburgerRef}>
      <Button
        variant="secondary"
        size="sm"
        aria-label="Open navigation"
        onClick={() => setSideNavOpen((prev) => !prev)}
      >
        ☰
      </Button>
    </span>
  );

  const sideNavNode = (
    <div ref={sideNavRef} className="contents">
      <SideNav
        isOpen={sideNavOpen}
        isLG={isLG}
        onClose={() => setSideNavOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );

  if (isLG) {
    return (
      <div className="flex flex-col h-full">
        <header className="shrink-0 border-b border-gray-200 dark:border-gray-700">
          <div className="flex h-12 items-center gap-4 px-4">
            {hamburgerButton}
            <Header level={1}>Ray Optics Web</Header>
          </div>
        </header>

        <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
          {sideNavNode}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="shrink-0 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="flex items-center">
          {hamburgerButton}
          <Header level={1} className="ml-2">Ray Optics Web</Header>
        </div>
      </header>

      <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
        {sideNavNode}
        {children}
      </div>
    </div>
  );
}
