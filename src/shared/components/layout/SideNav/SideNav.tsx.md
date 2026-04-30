# `shared/components/layout/SideNav/SideNav.tsx`

## Purpose
Collapsible side navigation panel toggled by the hamburger button in the header. Uses Next.js App Router links for route navigation and highlights the active route from the current layout segment.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | When `false`, nav is translated off-screen (`-translate-x-full`); always in DOM |
| `isLG` | `boolean` | Determines width: `w-[33vw]` on LG, `w-[50vw]` on SM |
| `onClose` | `() => void` | Called when the ✕ close button is clicked |
| `onNavigate` | `(href: string, event: React.MouseEvent<HTMLAnchorElement>) => boolean \| undefined` | Optional navigation interceptor; returning `false` keeps the nav open and leaves route handling to the caller |

## Behaviour
- Always rendered in the DOM — never returns `null`
- `<nav aria-label="Side navigation" aria-hidden={!isOpen} inert={!isOpen}>` positioned `absolute top-0 left-0 h-full z-40`
- `aria-hidden="true"` when closed — hides from accessibility tree (screen readers, `queryByRole`)
- `inert` when closed — removes descendants from keyboard focus and user interaction while the panel is off-screen
- Background: `bg-white dark:bg-gray-900`, `border-r`, `shadow-xl`
- Slide animation: `transition-transform duration-200 ease-out will-change-transform`; `translate-x-0` when open, `-translate-x-full` when closed
- Parent container must have `overflow-hidden` to clip the off-screen nav
- Close button (`aria-label="Close navigation"`) is right-aligned at the top
- Uses `useSelectedLayoutSegment()` to determine the active route
- Nav items rendered as `<NavLink>` links
  - Active item: `active={true}` + `aria-current="page"`
  - Root route (`/`) is active when the selected segment is `null`
- When `onNavigate` is supplied, item clicks pass both the target `href` and click event to it before calling `onClose`.
- If `onNavigate` returns `false`, `SideNav` does not close; this supports guarded navigation modals that keep the attempted route pending.
- No outside-click-to-close handler (intentional)

## Nav Items
| Label | Href |
|-------|----------|
| Lens Editor | `/` |
| Example Systems | `/example-systems` |
| Optimization | `/optimization` |
| Glass Map | `/glass-map` |
| Settings | `/settings` |
| Privacy Policy | `/privacy-policy` |
| About | `/about` |

## Usages

```tsx
import { SideNav } from "@/shared/components/layout/SideNav";

// In a layout component (e.g., Layout)
const [sideNavOpen, setSideNavOpen] = useState(false);
const screenSize = useScreenBreakpoint();
const isLG = screenSize === "screenLG";

const sideNavNode = (
  <SideNav
    isOpen={sideNavOpen}
    isLG={isLG}
    onClose={() => setSideNavOpen(false)}
    onNavigate={guardedNavigate}
  />
);

return (
  <div className="relative flex-1 overflow-hidden">
    {sideNavNode}
    {children}
  </div>
);
```
