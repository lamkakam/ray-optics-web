# `app/(app-shell)/settings/page.tsx`

## Purpose
Settings route page (`/settings`) for the App Router shell.

## Behaviour
- Reads `theme` and `setTheme` from `ThemeProvider`
- Adapts the `<select>` change event into the `Theme` union used by `SettingsView`
- Renders `SettingsView` as page content for the route
