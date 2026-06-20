# `features/lens-editor/components/LensPrescriptionContainer/FormattingModal/FormattingModal.tsx`

## Purpose

Modal for scaling or reversing selected lens prescription rows from the Lens Editor toolbar. It keeps draft controls locally and delegates all row transformation to the pure `prescriptionFormatting` helper.

## Props

```ts
interface FormattingModalProps {
  isOpen: boolean;
  rows: readonly GridRow[];
  onConfirm: (rows: GridRow[]) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}
```

## Behavior

- Uses the shared `Modal` without `onBackdropClick`, so backdrop clicks do not dismiss the dialog.
- Initializes in Scale mode with `Factor = 1`, `First Surface = Object`, and `Last Surface = Image`. The parent container keys the component across open/closed transitions so this local draft state resets on each open.
- Reverse mode hides `Factor`, excludes Image from the selectors, and defaults to `Object` through the last surface.
- `Cancel` calls `onCancel` without producing rows.
- `Confirm` calls `formatPrescriptionRows`; valid results are passed to `onConfirm`, while invalid or overflowing results call `onError` and do not mutate rows.

## Dependencies

- UI primitives: `Modal`, `RadioInput`, `Input`, `Select`, `Button`, and `Label`.
- Formatting logic: `buildScaleSurfaceOptions`, `buildReverseSurfaceOptions`, and `formatPrescriptionRows`.
