# `features/lens-editor/components/LensPrescriptionContainer/AsphericalModal/AsphericalModal.tsx`

## Purpose

Modal for configuring aspherical surface parameters: conic constant, surface type, up to 10 polynomial coefficients (a₂ through a₂₀), and the toroid sweep radius of curvature for toroidal types. Renders MathJax equations to label coefficients and explain the sag formula.

## Props

```ts
interface AsphericalModalProps {
  isOpen: boolean;
  readOnly?: boolean;
  initialConicConstant: number;
  initialType: AsphericalType;
  initialCoefficients: number[];
  initialToricSweepRadiusOfCurvature: number;
  onConfirm: (params: {
    conicConstant: number;
    type: AsphericalType;
    polynomialCoefficients: number[];
    toricSweepRadiusOfCurvature: number;
  }) => void;
  onClose: () => void;
  onRemove: () => void;
}
```

The modal keeps these UI-facing labels, while the container maps them to the domain `Surface["aspherical"]` union:
- `"Conic"` -> `{ kind: "Conic", conicConstant }`
- `"EvenAspherical"` -> `{ kind: "EvenAspherical", conicConstant, polynomialCoefficients }`
- `"RadialPolynomial"` -> `{ kind: "RadialPolynomial", conicConstant, polynomialCoefficients }`
- `"XToroid"` -> `{ kind: "XToroid", conicConstant, toricSweepRadiusOfCurvature, polynomialCoefficients }`
- `"YToroid"` -> `{ kind: "YToroid", conicConstant, toricSweepRadiusOfCurvature, polynomialCoefficients }`

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `readOnly` | `boolean` | No | When `true`, all controls are disabled and the footer shows only `Close` |
| `initialConicConstant` | `number` | Yes | Starting conic constant value |
| `initialType` | `AsphericalType` | Yes | Surface type on open |
| `initialCoefficients` | `number[]` | Yes | Polynomial coefficients on open (may be shorter than 10) |
| `initialToricSweepRadiusOfCurvature` | `number` | Yes | Starting toroid sweep radius of curvature value |
| `onConfirm` | `(params) => void` | Yes | Called with parsed values on Confirm |
| `onClose` | `() => void` | Yes | Cancel callback |
| `onRemove` | `() => void` | Yes | Clears aspherical data for the surface |

## Internal State

- `conicConstantStr: string` — draft string for conic constant input.
- `type: AsphericalType` — selected type.
- `toricSweepRadiusOfCurvatureStr: string` — draft string for the toroid sweep radius input.
- `coefficientStrs: string[]` — draft strings for all 10 coefficient inputs.

## Key Behaviors

- Coefficient inputs are shown for every non-conic type: `"EvenAspherical"`, `"RadialPolynomial"`, `"XToroid"`, and `"YToroid"`.
- The toroid sweep radius input is shown only for `"XToroid"` and `"YToroid"`.
- On confirm, trailing zero coefficients are stripped (`truncateTrailingZeros`); Conic type produces an empty coefficients array.
- On confirm, toroid sweep radius values that parse to a non-finite number fall back to `0`.
- Coefficients array is padded to length 10 on initialization.
- Uses `<MathJax>` for the sag formula and coefficient labels; `MathJaxContext` is provided by the ancestor (`page.tsx`).
- In `readOnly` mode, the type selector and all numeric inputs are disabled; `Remove Aspherical`, `Cancel`, and `Confirm` are replaced by a single `Close` button.

## Usages

```tsx
import { AsphericalModal } from "@/features/lens-editor/components/LensPrescriptionContainer";
import type { AsphericalType } from "@/shared/lib/types/opticalModel";

// In a container component (e.g., LensPrescriptionContainer)
const asphericalRow = rows.find((r) => r.id === asphericalModal.rowId);

return (
  <>
    <AsphericalModal
      key={asphericalModal.open ? asphericalModal.rowId : "aspherical-closed"}
      isOpen={asphericalModal.open}
      initialConicConstant={asphericalRow?.kind === "surface" ? (asphericalRow.aspherical?.conicConstant ?? 0) : 0}
      initialType={getInitialAsphericalType(asphericalRow)}
      initialCoefficients={getInitialAsphericalCoefficients(asphericalRow)}
      initialToricSweepRadiusOfCurvature={getInitialToricSweepRadiusOfCurvature(asphericalRow)}
      onConfirm={(params) => {
        const aspherical = params.type === "EvenAspherical"
          ? { kind: "EvenAspherical", conicConstant: params.conicConstant, polynomialCoefficients: params.polynomialCoefficients }
          : params.type === "RadialPolynomial"
            ? { kind: "RadialPolynomial", conicConstant: params.conicConstant, polynomialCoefficients: params.polynomialCoefficients }
            : params.type === "XToroid"
              ? {
                  kind: "XToroid",
                  conicConstant: params.conicConstant,
                  toricSweepRadiusOfCurvature: params.toricSweepRadiusOfCurvature,
                  polynomialCoefficients: params.polynomialCoefficients,
                }
              : params.type === "YToroid"
                ? {
                    kind: "YToroid",
                    conicConstant: params.conicConstant,
                    toricSweepRadiusOfCurvature: params.toricSweepRadiusOfCurvature,
                    polynomialCoefficients: params.polynomialCoefficients,
                  }
          : { kind: "Conic", conicConstant: params.conicConstant };
        store.getState().updateRow(asphericalModal.rowId, { aspherical });
        store.getState().closeAsphericalModal();
      }}
      onClose={() => store.getState().closeAsphericalModal()}
      onRemove={() => {
        store.getState().updateRow(asphericalModal.rowId, { aspherical: undefined });
        store.getState().closeAsphericalModal();
      }}
    />
  </>
);
```
