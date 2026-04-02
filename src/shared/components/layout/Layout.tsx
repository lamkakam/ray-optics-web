"use client";

import React, { useState } from "react";
import { Button } from "@/shared/components/primitives/Button";
import { Header } from "@/shared/components/primitives/Header";
import { SideNav } from "@/shared/components/layout/SideNav";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";

interface LayoutProps {
  readonly children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const screenSize = useScreenBreakpoint();
  const isLG = screenSize === "screenLG";

  const hamburgerButton = (
    <Button
      variant="secondary"
      size="sm"
      aria-label="Open navigation"
      onClick={() => setSideNavOpen((prev) => !prev)}
    >
      ☰
    </Button>
  );

  const sideNavNode = (
    <SideNav
      isOpen={sideNavOpen}
      isLG={isLG}
      onClose={() => setSideNavOpen(false)}
    />
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
