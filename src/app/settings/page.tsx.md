# `app/settings/page.tsx`

## Purpose
Settings route page (`/settings`).

## Behaviour
- Reads `theme` and `setTheme` from `ThemeProvider`
- Reads `opdAimPoint` and `setOpdAimPoint` from `OpdAimPointProvider`
- Adapts the `<select>` change event into the `Theme` union
- Adapts the OPD aim-point `<select>` into `"chief_ray" | "centroid"`
- Renders the Settings heading, theme selector, and OPD aim point selector inline in the route file
- Uses the shared `Select` primitive with bounded width for layout stability
