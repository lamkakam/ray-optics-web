# `features/lens-editor/components/LensPrescriptionContainer/FormattingModal/FormattingModal.tsx`

## Purpose

Modal for scaling or reversing selected lens prescription rows from the Lens Editor toolbar. It owns draft controls for the current modal session and delegates all row transformation to the pure `prescriptionFormatting` helper.

## Props

```ts
interface FormattingModalProps {
  isOpen: boolean;
  rows: readonly GridRow[];
  onConfirm: (result: { mode: FormattingMode; rows: GridRow[] }) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}
```

## Behavior

- Uses the shared `Modal` without `onBackdropClick`, so backdrop clicks do not dismiss the dialog.
- Initializes local draft controls on mount from the current rows: Scale mode, factor `1`, Scale `Object` to `Image`, and Reverse `Object` to the last surface.
- Scale mode shows `Factor`, includes Image in the selectors, and uses the Scale range draft.
- Reverse mode is labeled `Reverse (also reversing thickness and medium)`, hides `Factor`, excludes Image from the selectors, and uses the Reverse range draft.
- Scale and Reverse first/last surface selections are independent within one mounted modal session.
- If a local surface index is outside the current row range, the rendered selector value and confirm input are clamped to the nearest valid index. Valid local selections are not rewritten while rendering.
- `Cancel` calls `onCancel` without producing rows.
- `Confirm` calls `formatPrescriptionRows`; valid results are passed to `onConfirm` with the active formatting mode, while invalid or overflowing results call `onError` and do not mutate rows.

## Dependencies

- UI primitives: `Modal`, `RadioInput`, `Input`, `Select`, `Button`, and `Label`.
- Formatting logic: `buildScaleSurfaceOptions`, `buildReverseSurfaceOptions`, and `formatPrescriptionRows`.
