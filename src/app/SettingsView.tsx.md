# SettingsView.tsx

## Purpose
Full-page settings view rendered by the `/settings` App Router page.

## Props
- `theme: Theme` — currently selected app theme
- `onThemeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void` — change handler for the theme select

## Content
- `<Header level={2}>Settings</Header>`
- Theme selector with `light` and `dark` options
- Uses the shared `Select` primitive with bounded width for layout stability

## Usages

```tsx
// In app/(app-shell)/settings/page.tsx
<SettingsView theme={theme} onThemeChange={handleThemeChange} />
```
