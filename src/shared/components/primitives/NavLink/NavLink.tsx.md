# NavLink.tsx

## Purpose
Micro-component for navigation links. Wraps Next.js `Link` with the app's active/inactive styling and optional click handling.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `active` | `boolean` | Active state — drives colour variant |
| `href` | `string` | Route destination |
| `children` | `React.ReactNode` | Label |
| `aria-label` | `string \| undefined` | ARIA label |
| `aria-current` | `"page" \| undefined` | Active ARIA attribute |
| `className` | `string \| undefined` | Optional extra Tailwind classes |
| `onClick` | `React.MouseEventHandler<HTMLAnchorElement> \| undefined` | Optional click callback that receives the anchor click event |

## Styling (via `componentTokens.navLink` in `styleTokens.ts`)
- Base: `block px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer`
- Active: `bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-blue-400`
- Inactive: `text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800`

## Behaviour
- Renders a Next.js `Link`
- Preserves normal route navigation through `href`
- Invokes `onClick` when supplied and passes through the anchor click event, allowing callers to call `preventDefault()` before guarded programmatic navigation
- Active/inactive state is controlled entirely via the `active` prop

## Usages

```tsx
// Navigation link in SideNav
{NAV_ITEMS.map(({ href, label }) => (
  <NavLink
    key={href}
    href={href}
    active={pathname === href}
    aria-label={label}
    aria-current={pathname === href ? "page" : undefined}
    onClick={(event) => {
      event.preventDefault();
      guardedNavigate(href);
    }}
  >
    {label}
  </NavLink>
))}

// Active and inactive states
<div className="space-y-2">
  <NavLink
    href="/"
    active={true}
    aria-label="Home"
    aria-current="page"
  >
    Home
  </NavLink>
  <NavLink
    href="/settings"
    active={false}
    aria-label="Settings"
  >
    Settings
  </NavLink>
</div>

// With custom className
<NavLink
  active={isActive}
  href="/custom"
  onClick={handleClick}
  className="mx-2"
  aria-label="Custom link"
>
  Custom Link
</NavLink>
```
