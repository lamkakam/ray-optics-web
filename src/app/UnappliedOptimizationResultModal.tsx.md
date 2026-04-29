# `app/UnappliedOptimizationResultModal.tsx`

## Purpose

Shell-level warning dialog shown when the user tries to leave `/optimization` while a completed optimization result has updated only the Optimization-local optical model.

## Props

```ts
interface UnappliedOptimizationResultModalProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
  onApplyToEditor: () => void;
}
```

## Behavior

- Renders `Modal` with title `"Unapplied Optimization Result"`.
- Warns that the optimized optical model has not been applied to the Editor and may be lost if the user leaves Optimization.
- Offers explicit `Stay`, `Leave`, and `Apply to Editor` actions.
- Does not pass `onBackdropClick`, so backdrop clicks do not dismiss the dialog.
