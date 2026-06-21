# `features/lens-editor/components/LensPrescriptionContainer/FormattingModal/FormattingModal.tsx`

## Purpose

Modal for scaling or reversing selected lens prescription rows from the Lens Editor toolbar. It receives store-backed draft controls from the parent and delegates all row transformation to the pure `prescriptionFormatting` helper.

## Props

```ts
interface FormattingModalProps {
  isOpen: boolean;
  rows: readonly GridRow[];
  draft: {
    mode: "scale" | "reverse";
    scaleFactor: string;
    scaleFirstSurface: number;
    scaleLastSurface: number;
    reverseFirstSurface: number;
    reverseLastSurface: number;
  };
  draftActions: {
    setMode: (mode: "scale" | "reverse") => void;
    setScaleFactor: (factor: string) => void;
    setScaleFirstSurface: (surface: number) => void;
    setScaleLastSurface: (surface: number) => void;
    setReverseFirstSurface: (surface: number) => void;
    setReverseLastSurface: (surface: number) => void;
  };
  onConfirm: (rows: GridRow[]) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}
```

## Behavior

- Uses the shared `Modal` without `onBackdropClick`, so backdrop clicks do not dismiss the dialog.
- Displays the store-backed draft mode, factor, and per-mode first/last surface selections.
- Scale mode shows `Factor`, includes Image in the selectors, and uses the Scale range draft.
- Reverse mode is labeled `Reverse (also reversing thickness and medium)`, hides `Factor`, excludes Image from the selectors, and uses the Reverse range draft.
- If a stored surface index is outside the current row range, the rendered selector value and confirm input are clamped to the nearest valid index. Valid persisted selections are not rewritten while rendering.
- `Cancel` calls `onCancel` without producing rows.
- `Confirm` calls `formatPrescriptionRows`; valid results are passed to `onConfirm`, while invalid or overflowing results call `onError` and do not mutate rows.

## Dependencies

- UI primitives: `Modal`, `RadioInput`, `Input`, `Select`, `Button`, and `Label`.
- Formatting logic: `buildScaleSurfaceOptions`, `buildReverseSurfaceOptions`, and `formatPrescriptionRows`.
