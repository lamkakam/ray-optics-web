# `shared/components/providers/ImagePointProvider/ImagePointProvider.tsx`

## Purpose

Provides app-wide image-point state for spot, wavefront-like, and OPD-related analyses.

## API

- `ImagePoint` is `"chief_ray" | "centroid"`.
- `ImagePointProvider` initializes from `localStorage` key `ray-optics-web-image-point`, falling back to the legacy `ray-optics-web-opd-aim-point` key for migration.
- `useImagePoint()` returns `{ imagePoint, setImagePoint }`.

## Behavior

- Defaults to `"chief_ray"` to preserve the existing RayOptics reference convention.
- Persists valid updates to the new `localStorage` key.
- Ignores invalid persisted values and invalid runtime updates.
