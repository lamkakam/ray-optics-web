# NavLink.tsx

## Purpose
Micro-component for SPA-style navigation links. Renders a styled `<a href="#">` that prevents default navigation and calls an `onClick` handler instead.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `active` | `boolean` | Active state — drives colour variant |
| `onClick` | `() => void` | Called on click (after `preventDefault`) |
| `children` | `React.ReactNode` | Label |
| `aria-label` | `string \| undefined` | ARIA label |
| `aria-current` | `"page" \| undefined` | Active ARIA attribute |
| `className` | `string \| undefined` | Optional extra Tailwind classes |

## Styling (via `componentTokens.navLink` in `styleTokens.ts`)
- Base: `block px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer`
- Active: `bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-400`
- Inactive: `text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800`

## Behaviour
- Renders an `<a>` element with `href="#"` and `role="link"`
- Calls `e.preventDefault()` before invoking `onClick` to prevent URL navigation
- Active/inactive state is controlled entirely via the `active` prop

## Usages

```tsx
// Navigation link in SideNav
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

// Active and inactive states
<div className="space-y-2">
  <NavLink
    active={currentPage === "home"}
    aria-label="Home"
    aria-current={currentPage === "home" ? "page" : undefined}
    onClick={() => setCurrentPage("home")}
  >
    Home
  </NavLink>
  <NavLink
    active={currentPage === "settings"}
    aria-label="Settings"
    onClick={() => setCurrentPage("settings")}
  >
    Settings
  </NavLink>
</div>

// With custom className
<NavLink
  active={isActive}
  onClick={handleClick}
  className="mx-2"
  aria-label="Custom link"
>
  Custom Link
</NavLink>
```
