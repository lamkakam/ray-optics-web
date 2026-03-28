"use client";

import React from "react";
import type { AppView } from "@/lib/appView";
import { Button } from "@/components/micro/Button";
import { NavLink } from "@/components/micro/NavLink";

interface SideNavProps {
  readonly isOpen: boolean;
  readonly isLG: boolean;
  readonly currentView: AppView;
  readonly onClose: () => void;
  readonly onNavigate: (view: AppView) => void;
}

const NAV_ITEMS: { view: AppView; label: string }[] = [
  { view: "home", label: "Lens Editor" },
  { view: "settings", label: "Settings" },
  { view: "privacy-policy", label: "Privacy Policy" },
  { view: "about", label: "About" },
];

export function SideNav({ isOpen, isLG, currentView, onClose, onNavigate }: SideNavProps) {
  if (!isOpen) return null;

  return (
    <nav
      aria-label="Side navigation"
      className={`animate-slide-in-from-left will-change-transform absolute top-0 left-0 h-full z-40 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl ${isLG ? "w-[33vw]" : "w-[50vw]"}`}
    >
      <div className="flex justify-end p-2">
        <Button variant="secondary" size="sm" aria-label="Close navigation" onClick={onClose}>
          ✕
        </Button>
      </div>
      <div className="flex flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ view, label }) => (
          <NavLink
            key={view}
            active={currentView === view}
            aria-label={label}
            aria-current={currentView === view ? "page" : undefined}
            onClick={() => onNavigate(view)}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
