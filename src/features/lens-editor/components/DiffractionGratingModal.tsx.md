# `features/lens-editor/components/DiffractionGratingModal.tsx`

## Purpose

Modal for configuring diffraction grating parameters on a surface.

## Props

```ts
interface DiffractionGratingModalProps {
  isOpen: boolean;
  initialDiffractionGrating: DiffractionGrating | undefined;
  readOnly?: boolean;
  onConfirm: (diffractionGrating: DiffractionGrating) => void;
  onClose: () => void;
  onRemove: () => void;
}
```

## Key Behaviors

- Defaults to `lpmm = 1000` and `order = 1` when the surface has no existing grating.
- Keeps raw input as strings and parses on confirm.
- Invalid `lp/mm` values fall back to the initial positive value.
- Invalid `order` values fall back to the initial integer value.
- `Remove` clears the stored diffraction grating config.
- In `readOnly` mode, both inputs are disabled and the footer renders only `Close`.
