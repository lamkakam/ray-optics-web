# SideNav.tsx

## Purpose
Collapsible side navigation panel toggled by the hamburger button in the header. Allows navigation between `AppView` states without URL changes.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | When `false`, nav is translated off-screen (`-translate-x-full`); always in DOM |
| `isLG` | `boolean` | Determines width: `w-[33vw]` on LG, `w-[50vw]` on SM |
| `currentView` | `AppView` | Active view; used for `aria-current` and active styling |
| `onClose` | `() => void` | Called when the ✕ close button is clicked |
| `onNavigate` | `(view: AppView) => void` | Called when a nav item is clicked |

## Behaviour
- Always rendered in the DOM — never returns `null`
- `<nav aria-label="Side navigation" aria-hidden={!isOpen}>` positioned `absolute top-0 left-0 h-full z-40`
- `aria-hidden="true"` when closed — hides from accessibility tree (screen readers, `queryByRole`)
- Background: `bg-white dark:bg-gray-900`, `border-r`, `shadow-xl`
- Slide animation: `transition-transform duration-200 ease-out will-change-transform`; `translate-x-0` when open, `-translate-x-full` when closed
- Parent container must have `overflow-hidden` to clip the off-screen nav
- Close button (`aria-label="Close navigation"`) is right-aligned at the top
- Nav items rendered as `<NavLink>` micro-component
  - Active item: `active={true}` + `aria-current="page"`
  - Inactive items: `active={false}`
- No outside-click-to-close handler (intentional)

## Nav Items
| Label | View key |
|-------|----------|
| Lens Editor | `'home'` |
| Settings | `'settings'` |
| Privacy Policy | `'privacy-policy'` |
| About | `'about'` |
