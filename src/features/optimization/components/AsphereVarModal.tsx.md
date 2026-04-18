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

- Initializes draft from `asphereState` via `useEffect` when `isOpen` becomes true; clears draft on close.
- **Type selector**: dropdown with Conic / Even Aspheric / Radial Polynomial / X Toroid / Y Toroid. Disabled when `asphereState.lockedType === true` (surface already has an aspheric configuration from the Editor). Changing the type (when unlocked) resets all term modes to `constant`.
- **Term rows** rendered based on selected type:
  - `Conic`: Conic Constant only
  - `EvenAspherical`: Conic Constant + a_2, a_4, ..., a_20 (10 coefficients, even-indexed)
  - `RadialPolynomial`: Conic Constant + a_1, a_2, ..., a_10 (10 coefficients, sequential)
  - `XToroid` / `YToroid`: Conic Constant + Toroid sweep R + a_2, a_4, ..., a_20
- Each term row has a mode selector (`constant` / `variable` / `pickup`).
  - **variable**: shows Min and Max `Input` fields inline.
    - For `Toroid sweep R`, also shows guidance that `R = 0` is a flat surface (infinite radius), instructs users not to straddle `0`, and shows an inline validation message when bounds straddle `0`.
  - **pickup**: shows Source Surface Index, Scale, Offset `Input` fields. Coefficient rows additionally show a Source Coefficient Index field (stored as `sourceTermKey = "coefficient:N"`).
- **Done button**: disabled when any variable term has non-finite bounds or `min >= max`. Also disabled when `Toroid sweep R` variable bounds straddle `0` (negative min with positive max). Calls `onSave(surfaceIndex, draft)` then `onClose()`.

## Key Conventions

- Coefficient label mapping: EvenAspherical/XToroid/YToroid use `a_${(index+1)*2}` (a_2, a_4…); RadialPolynomial uses `a_${index+1}` (a_1, a_2…).
- `sourceTermKey` for coefficient pickups is stored as the template literal `"coefficient:N"` and validated by `buildOptimizationConfig()` in the store.
- Conic and toricSweep pickups do not require a `sourceTermKey`.
