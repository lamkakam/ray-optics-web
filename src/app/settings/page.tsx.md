# `app/settings/page.tsx`

## Purpose
Settings route page (`/settings`).

## Behaviour
- Reads `theme` and `setTheme` from `ThemeProvider`
- Adapts the `<select>` change event into the `Theme` union
- Renders the Settings heading and theme selector inline in the route file
- Uses the shared `Select` primitive with bounded width for layout stability
