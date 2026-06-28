# `app/settings/page.tsx`

## Purpose
Settings route page (`/settings`).

## Behaviour
- Reads `theme` and `setTheme` from `ThemeProvider`
- Reads `imagePoint` and `setImagePoint` from `ImagePointProvider`
- Adapts the `<select>` change event into the `Theme` union
- Adapts the OPD aim-point `<select>` into `"chief_ray" | "centroid"`
- Renders the Settings heading, theme selector, and Image point selector inline in the route file
- Uses the shared `Select` primitive with bounded width for layout stability
