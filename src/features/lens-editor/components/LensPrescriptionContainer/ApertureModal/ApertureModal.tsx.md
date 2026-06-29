# `features/lens-editor/components/LensPrescriptionContainer/ApertureModal/ApertureModal.tsx`

Modal for editing or inspecting a surface's aperture configuration.

## Props

- `isOpen`: controls visibility.
- `initialClearAperture`: optional current clear aperture. Only `{ shape: "circular", offsetX, offsetY }` is supported.
- `initialEdgeAperture`: optional current edge aperture. When omitted, Edge Aperture uses `Default (Follow Clear Aperture)`.
- `readOnly`: disables controls and renders a Close-only footer.
- `onConfirm`: receives `{ clear_aperture, edge_aperture }`.
- `onClose`: closes/cancels the modal.

## Behavior

- Renders Clear Aperture and Edge Aperture as two sections.
- Clear Aperture shape currently supports only `Circular`; radius is derived from `semiDiameter`, while signed X/Y offsets are stored on `clear_aperture`.
- Edge Aperture shape supports `Default (Follow Clear Aperture)` and `Circular`.
- Clear `Circular` shows Offset X and Offset Y text inputs.
- Edge `Circular` shows Radius, Offset X, and Offset Y text inputs.
- Missing initial offsets default to `0`.
- Confirm always writes `clear_aperture: { shape: "circular", offsetX, offsetY }`.
- Confirm writes `edge_aperture: { shape: "circular", radius, offsetX, offsetY }` only when Edge Aperture is Circular.
- Confirm clears `edge_aperture` by returning `undefined` when Edge Aperture is Default.
- Circular edge radius must parse to a finite number greater than `0`; invalid values keep the modal open and show an inline error.
- Circular offsets must parse to finite signed numbers; `0` and negative values are accepted.
- Shape-specific content is selected through two `Record<shape, React.ReactNode>` maps.
