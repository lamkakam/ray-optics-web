"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { Button } from "@/shared/components/primitives/Button";
import { NavLink } from "@/shared/components/primitives/NavLink";

interface SideNavProps {
  readonly isOpen: boolean;
  readonly isLG: boolean;
  readonly onClose: () => void;
}

const NAV_ITEMS = [
  { segment: null, href: "/", label: "Lens Editor" },
  { segment: "optimization", href: "/optimization", label: "Optimization" },
  { segment: "glass-map", href: "/glass-map", label: "Glass Map" },
  { segment: "settings", href: "/settings", label: "Settings" },
  { segment: "privacy-policy", href: "/privacy-policy", label: "Privacy Policy" },
  { segment: "about", href: "/about", label: "About" },
] as const;

export function SideNav({ isOpen, isLG, onClose }: SideNavProps) {
  const selectedSegment = useSelectedLayoutSegment();
  const activeSegment = selectedSegment ?? null;

  return (
    <nav
      aria-label="Side navigation"
      aria-hidden={!isOpen}
      className={`transition-transform duration-200 ease-out will-change-transform absolute top-0 left-0 h-full z-40 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl ${isLG ? "w-[33vw]" : "w-[50vw]"} ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex justify-end p-2">
        <Button variant="secondary" size="sm" aria-label="Close navigation" onClick={onClose}>
          ✕
        </Button>
      </div>
      <div className="flex flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ segment, href, label }) => {
          const isActive = activeSegment === segment;
          return (
            <NavLink
              key={href}
              href={href}
              active={isActive}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              onClick={onClose}
            >
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
