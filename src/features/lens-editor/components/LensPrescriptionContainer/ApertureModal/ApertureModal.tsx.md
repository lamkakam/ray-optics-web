# `features/lens-editor/components/LensPrescriptionContainer/ApertureModal/ApertureModal.tsx`

Modal for editing or inspecting a surface's aperture configuration.

## Props

- `isOpen`: controls visibility.
- `initialClearAperture`: optional current clear aperture. Only `{ shape: "circular" }` is supported.
- `initialEdgeAperture`: optional current edge aperture. When omitted, Edge Aperture uses `Default (Follow Clear Aperture)`.
- `readOnly`: disables controls and renders a Close-only footer.
- `onConfirm`: receives `{ clear_aperture, edge_aperture }`.
- `onClose`: closes/cancels the modal.

## Behavior

- Renders Clear Aperture and Edge Aperture as two sections.
- Clear Aperture shape currently supports only `Circular`; no radius is stored because clear aperture radius is derived from `semiDiameter`.
- Edge Aperture shape supports `Default (Follow Clear Aperture)` and `Circular`.
- Edge `Circular` shows a Radius text input.
- Confirm always writes `clear_aperture: { shape: "circular" }`.
- Confirm writes `edge_aperture: { shape: "circular", radius }` only when Edge Aperture is Circular.
- Confirm clears `edge_aperture` by returning `undefined` when Edge Aperture is Default.
- Circular edge radius must parse to a finite number greater than `0`; invalid values keep the modal open and show an inline error.
- Shape-specific content is selected through two `Record<shape, React.ReactNode>` maps.
