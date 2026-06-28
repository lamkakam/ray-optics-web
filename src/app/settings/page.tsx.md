# `app/settings/page.tsx`

## Purpose
Settings route page (`/settings`).

## Behaviour
- Reads `theme` and `setTheme` from `ThemeProvider`
- Adapts the `<select>` change event into the `Theme` union
- Renders the Settings heading and theme selector inline in the route file
- Uses the shared `Select` primitive with bounded width for layout stability
- Does not render the Image point selector; image reference selection lives in the Lens Editor drawer's `Image Reference` tab
