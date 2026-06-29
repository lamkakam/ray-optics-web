# `features/lens-editor/components/LensPrescriptionContainer/ApertureModal/ApertureModal.tsx`

Modal for editing or inspecting a surface's aperture configuration.

## Props

- `isOpen`: controls visibility.
- `semiDiameter`: outer clear aperture radius for the selected surface, used to validate annular obstruction radius.
- `initialClearAperture`: optional current clear aperture. Supports circular, annular, and rectangular clear apertures.
- `initialEdgeAperture`: optional current edge aperture. When omitted, Edge Aperture uses `Default (Follow Clear Aperture)`.
- `readOnly`: disables controls and renders a Close-only footer.
- `onConfirm`: receives `{ clear_aperture, edge_aperture }`.
- `onClose`: closes/cancels the modal.

## Behavior

- Renders Clear Aperture and Edge Aperture as two sections.
- `ApertureModal` owns the modal shell, footer, inline error display, close/cancel handling, and confirm orchestration.
- Clear Aperture draft state lives in `ClearApertureSection`, including selected shape, signed X/Y offsets, and annular central obstruction radius.
- Edge Aperture draft state lives in `EdgeApertureSection`, including selected shape, circular radius, and signed X/Y offsets.
- Clear Aperture shape supports `Circular`, `Annular`, and `Rectangular`; circular and annular outer radius is derived from `semiDiameter`, while rectangular stores its own `xHalfWidth`, `yHalfWidth`, `rotation`, and signed X/Y offsets.
- Edge Aperture shape supports `Default (Follow Clear Aperture)`, `Circular`, and `Rectangular`.
- Clear `Circular` shows Offset X and Offset Y text inputs.
- Clear `Annular` shows Central Obstruction Radius above Offset X and Offset Y.
- Clear `Rectangular` shows Half-Length, Half-Width, Rotation (°), Offset X, and Offset Y.
- Edge `Circular` shows Radius, Offset X, and Offset Y text inputs.
- Edge `Rectangular` shows Half-Length, Half-Width, Rotation (°), Offset X, and Offset Y.
- Missing initial offsets default to `0`.
- Confirm writes circular, annular, or rectangular `clear_aperture` based on the selected clear aperture shape.
- Confirm writes `edge_aperture: { shape: "circular", radius, offsetX, offsetY }` when Edge Aperture is Circular and `edge_aperture: { shape: "rectangular", xHalfWidth, yHalfWidth, rotation, offsetX, offsetY }` when Edge Aperture is Rectangular.
- Confirm clears `edge_aperture` by returning `undefined` when Edge Aperture is Default.
- On confirm, `ApertureModal` reads clear and edge values through internal section refs. Clear Aperture validates first; Edge Aperture validates only after Clear Aperture succeeds.
- Annular central obstruction radius must parse to a finite number greater than `0` and smaller than `semiDiameter`; invalid values keep the modal open and show an inline error.
- Circular edge radius must parse to a finite number greater than `0`; invalid values keep the modal open and show an inline error.
- Rectangular half lengths/widths must parse to finite numbers greater than `0`; invalid values keep the modal open and show an inline error.
- Rectangular rotation must parse to a finite signed number; invalid values keep the modal open and show an inline error.
- Circular offsets must parse to finite signed numbers; `0` and negative values are accepted.
- Rectangular offsets must parse to finite signed numbers; `0` and negative values are accepted.
- Shape-specific field content is selected through two module-scope component maps: one for clear aperture shapes and one for edge aperture shapes.
