# `shared/components/providers/OpdAimPointProvider/OpdAimPointProvider.tsx`

## Purpose

Provides app-wide OPD aim point state for wavefront-like analyses.

## API

- `OpdAimPoint` is `"chief_ray" | "centroid"`.
- `OpdAimPointProvider` initializes from `localStorage` key `ray-optics-web-opd-aim-point`.
- `useOpdAimPoint()` returns `{ opdAimPoint, setOpdAimPoint }`.

## Behavior

- Defaults to `"chief_ray"` to preserve the existing RayOptics reference convention.
- Persists valid updates to `localStorage`.
- Ignores invalid persisted values and invalid runtime updates.
