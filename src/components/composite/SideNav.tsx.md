# SideNav.tsx

## Purpose
Collapsible side navigation panel toggled by the hamburger button in the header. Allows navigation between `AppView` states without URL changes.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | When `false`, returns `null` (nothing rendered) |
| `isLG` | `boolean` | Determines width: `w-[33vw]` on LG, `w-[50vw]` on SM |
| `currentView` | `AppView` | Active view; used for `aria-current` and `toggle` variant |
| `onClose` | `() => void` | Called when the ✕ close button is clicked |
| `onNavigate` | `(view: AppView) => void` | Called when a nav item is clicked |

## Behaviour
- Returns `null` when `isOpen` is `false`
- Renders `<nav aria-label="Side navigation">` positioned `absolute top-0 left-0 h-full z-40`
- Background: `bg-white dark:bg-gray-900`, `border-r`, `shadow-xl`
- Close button (`aria-label="Close navigation"`) is right-aligned at the top
- Nav items: Settings, Privacy Policy, About — rendered as `<Button>`
  - Active item: `variant="toggle"` + `aria-current="page"`
  - Inactive items: `variant="secondary"`
- No outside-click-to-close handler (intentional)

## Nav Items
| Label | View key |
|-------|----------|
| Settings | `'settings'` |
| Privacy Policy | `'privacy-policy'` |
| About | `'about'` |
