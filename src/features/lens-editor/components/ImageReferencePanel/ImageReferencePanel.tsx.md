# `features/lens-editor/components/ImageReferencePanel/ImageReferencePanel.tsx`

## Purpose

Lens Editor drawer panel for selecting the app-wide image reference convention used by OPD-related analysis and optimization workflows.

## Behaviour

- Reads `imagePoint` and `setImagePoint` from `ImagePointProvider`.
- Renders one `Select` labeled `Image point`.
- Offers exactly two options:
  - `"chief_ray"` — `Chief ray`
  - `"centroid"` — `Centroid`
- Calls `setImagePoint(...)` only when the selected option differs from the current value.
- Does not own persistence; persistence remains handled by `ImagePointProvider`.

## Usages

Rendered as the `Image Reference` tab in `BottomDrawerContainer`.
