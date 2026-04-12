# `features/lens-editor/components/DiffractionGratingCell.tsx`

## Purpose

AG Grid cell renderer for the `Diffraction Grating` column. Renders a `SetButton` inside a portal tooltip to indicate whether diffraction grating parameters are configured on a surface.

## Props

```ts
interface DiffractionGratingCellProps {
  isDiffractionGratingSet: boolean;
  onOpenModal: () => void;
}
```

## Key Behaviors

- Uses `Tooltip` with `portal` and `noTouch` for AG Grid compatibility.
- Delegates visual state to `SetButton`.
- Uses aria-label `"Edit diffraction grating"` for the button.
