# `features/optimization/components/AsphereVarModal.tsx`

## Purpose

Modal dialog for configuring asphere variable and pickup optimization targets for a single surface. Allows the user to select the asphere type (Conic, Even Aspheric, Radial Polynomial, X Toroid, Y Toroid) and set each term (conic constant, polynomial coefficients, toroid sweep radius) to `constant`, `variable`, or `pickup` mode. Keeps changes in local draft state until "Done" is clicked.

## Props

```ts
interface AsphereVarModalProps {
  isOpen: boolean;
  surfaceIndex: number | undefined;
  asphereState: AsphereOptimizationState | undefined;
  onSave: (surfaceIndex: number, state: AsphereOptimizationState) => void;
  onClose: () => void;
}
```

## Behavior

- Seeds draft from `asphereState` when the modal editor mounts, and resets that draft by remounting a keyed inner editor whenever the committed target surface or asphere state changes.
- Reuses `curvatureRadiusCrossesZero()` from `features/optimization/lib/modalHelpers.ts` for toroid sweep radius validation.
- Reuses `ModeSelectField.tsx`, `BoundedVariableModeFields.tsx`, and `PickupModeFields.tsx` for the shared term-row mode selector and common variable/pickup field groups, while keeping asphere-specific type switching, term mapping, coefficient pickup wiring, and toroid validation in this modal.
- **Type selector**: dropdown with Conic / Even Aspheric / Radial Polynomial / X Toroid / Y Toroid. Disabled when `asphereState.lockedType === true` (surface already has an aspheric configuration from the Editor). Changing the type (when unlocked) resets all term modes to `constant`.
- **Term rows** rendered based on selected type:
  - `Conic`: Conic Constant only
  - `EvenAspherical`: Conic Constant + a_2, a_4, ..., a_20 (10 coefficients, even-indexed)
  - `RadialPolynomial`: Conic Constant + a_1, a_2, ..., a_10 (10 coefficients, sequential)
  - `XToroid` / `YToroid`: Conic Constant + Toroid sweep R + a_2, a_4, ..., a_20
- Coefficient row labels are displayed with `MathJax inline` as `\(a_{n}\)` while preserving plain-text accessibility names such as `a_2 mode` and `a_2 Min.` for controls in the same row.
- Each term row has a mode selector (`constant` / `variable` / `pickup`).
  - **variable**: shows Min and Max `Input` fields inline.
    - For `Toroid sweep R`, also shows guidance that `R = 0` is a flat surface (infinite radius), instructs users not to straddle `0`, and shows an inline validation message when bounds straddle `0`.
  - **pickup**: shows Source Surface Index, Scale, Offset `Input` fields. Coefficient rows additionally show a Source Coefficient Index field (stored as `sourceTermKey = "coefficient:N"` where `N` is the zero-based coefficient slot and may be `0`).
- Footer actions: `Cancel` on the left and `Confirm` on the right.
- **Cancel button**: closes the modal and discards uncommitted draft changes.
- **Confirm button**: disabled when any variable term has non-finite bounds or `min >= max`. Also disabled when `Toroid sweep R` variable bounds straddle `0` (negative min with positive max). Calls `onSave(surfaceIndex, draft)` then `onClose()`.
- Clicking or touching outside the modal does not close it.
- Pressing `Escape` does not close it.

## Key Conventions

- Coefficient label mapping: EvenAspherical/XToroid/YToroid use `a_${(index+1)*2}` (a_2, a_4…); RadialPolynomial uses `a_${index+1}` (a_1, a_2…).
- `sourceTermKey` for coefficient pickups is stored as the template literal `"coefficient:N"` where `N` is a zero-based coefficient slot, and is validated by `buildOptimizationConfig()` in the store.
- Conic and toricSweep pickups do not require a `sourceTermKey`.
- Uses `<MathJax inline>` for coefficient labels only; this component does not own a `MathJaxContext` and relies on the app-level provider.
