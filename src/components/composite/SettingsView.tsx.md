# SettingsView.tsx

## Purpose
Full-page settings view shown when `currentView === 'settings'` in `page.tsx`. Contains the same theme selector as the former `SettingsModal` but rendered inline (no modal wrapper).

## Props
| Prop | Type | Description |
|------|------|-------------|
| `theme` | `Theme` | Current active theme (`'light'` \| `'dark'`) |
| `onThemeChange` | `(e: React.ChangeEvent<HTMLSelectElement>) => void` | Called on theme select change |

## Behaviour
- Renders `<Header level={2}>Settings</Header>`
- Renders a `<Select aria-label="Theme">` bound to `theme` / `onThemeChange`
- Theme options: `light`, `dark`
- No Ok/Close button — navigation is handled by the side nav
