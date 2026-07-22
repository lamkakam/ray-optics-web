/**
 * Describes the Side Nav module.
 *
 * @remarks
 * ## Behaviour
 * - Always rendered in the DOM — never returns `null`
 * - `<nav aria-label="Side navigation" aria-hidden={!isOpen} inert={!isOpen}>` positioned `absolute top-0 left-0 h-full z-40`
 * - `aria-hidden="true"` when closed — hides from accessibility tree (screen readers, `queryByRole`)
 * - `inert` when closed — removes descendants from keyboard focus and user interaction while the panel is off-screen
 * - Background: `bg-white dark:bg-gray-900`, `border-r`, `shadow-xl`
 * - Slide animation: `transition-transform duration-200 ease-out will-change-transform`; `translate-x-0` when open, `-translate-x-full` when closed
 * - Parent container must have `overflow-hidden` to clip the off-screen nav
 * - Close button (`aria-label="Close navigation"`) is right-aligned at the top
 * - Uses `useSelectedLayoutSegment()` to determine the active route
 * - Nav items rendered as `<NavLink>` links
 * - Active item: `active={true}` + `aria-current="page"`
 * - Root route (`/`) is active when the selected segment is `null`
 * - When `onNavigate` is supplied, item clicks pass both the target `href` and click event to it before calling `onClose`.
 * - If `onNavigate` returns `false`, `SideNav` does not close; this supports guarded navigation modals that keep the attempted route pending.
 * - Outside pointer dismissal is owned by `Layout`; `SideNav` only exposes `onClose` for close-button and accepted navigation actions.
 *
 * ## Nav Items
 * | Label | Href |
 * |-------|----------|
 * | Lens Editor | `/` |
 * | Example Systems | `/example-systems` |
 * | Optimization | `/optimization` |
 * | Glass Map | `/glass-map` |
 * | Import Custom Glass | `/import-custom-glass` |
 * | Settings | `/settings` |
 * | Privacy Policy | `/privacy-policy` |
 * | About | `/about` |
 */
"use client";

import type React from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { Button } from "@/shared/components/primitives/Button";
import { NavLink } from "@/shared/components/primitives/NavLink";

interface SideNavProps {
  /** When `false`, nav is translated off-screen (`-translate-x-full`); always in DOM */
  readonly isOpen: boolean;
  /** Determines width: `w-[33vw]` on LG, `w-[50vw]` on SM */
  readonly isLG: boolean;
  /** Called when the ✕ close button is clicked */
  readonly onClose: () => void;
  /** Optional navigation interceptor; returning `false` keeps the nav open and leaves route handling to the caller */
  readonly onNavigate?: (href: string, event: React.MouseEvent<HTMLAnchorElement>) => boolean;
}

const NAV_ITEMS = [
  { segment: null, href: "/", label: "Lens Editor" },
  { segment: "example-systems", href: "/example-systems", label: "Example Systems" },
  { segment: "optimization", href: "/optimization", label: "Optimization" },
  { segment: "glass-map", href: "/glass-map", label: "Glass Map" },
  { segment: "import-custom-glass", href: "/import-custom-glass", label: "Import Custom Glass" },
  { segment: "settings", href: "/settings", label: "Settings" },
  { segment: "privacy-policy", href: "/privacy-policy", label: "Privacy Policy" },
  { segment: "about", href: "/about", label: "About" },
] as const;

/** Collapsible side navigation panel toggled by the hamburger button in the header. Uses Next.js App Router links for route navigation and highlights the active route from the current layout segment. */
export function SideNav({ isOpen, isLG, onClose, onNavigate }: SideNavProps) {
  const selectedSegment = useSelectedLayoutSegment();
  const activeSegment = selectedSegment ?? null;

  return (
    <nav
      aria-label="Side navigation"
      aria-hidden={!isOpen}
      inert={!isOpen}
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
              onClick={(event) => {
                if (onNavigate?.(href, event) === false) {
                  return;
                }
                onClose();
              }}
            >
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
