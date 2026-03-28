"use client";

import React, { useState } from "react";
import type { AppView } from "@/lib/appView";
import { Button } from "@/components/micro/Button";
import { Header } from "@/components/micro/Header";
import { SideNav } from "@/components/composite/SideNav";
import { useScreenBreakpoint } from "@/hooks/useScreenBreakpoint";

interface LayoutProps {
  readonly currentView: AppView;
  readonly onNavigate: (view: AppView) => void;
  readonly errorModal: React.ReactNode;
  readonly initOverlayNode: React.ReactNode;
  readonly children: React.ReactNode;
}

export function Layout({
  currentView,
  onNavigate,
  errorModal,
  initOverlayNode,
  children,
}: LayoutProps) {
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
      currentView={currentView}
      onClose={() => setSideNavOpen(false)}
      onNavigate={(view) => {
        onNavigate(view);
        setSideNavOpen(false);
      }}
    />
  );

  if (isLG) {
    return (
      <div className="flex flex-col h-screen">
        <header className="shrink-0 border-b border-gray-200 dark:border-gray-700">
          <div className="flex h-12 items-center gap-4 px-4">
            {hamburgerButton}
            <Header level={1}>Ray Optics Web</Header>
          </div>
        </header>

        <div className="relative flex-1 flex flex-col min-h-0">
          {sideNavNode}
          {children}
        </div>

        {errorModal}
        {initOverlayNode}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <header className="shrink-0 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="flex items-center">
          {hamburgerButton}
          <Header level={1} className="ml-2">Ray Optics Web</Header>
        </div>
      </header>

      <div className="relative flex flex-col">
        {sideNavNode}
        {children}
      </div>

      {errorModal}
      {initOverlayNode}
    </div>
  );
}
