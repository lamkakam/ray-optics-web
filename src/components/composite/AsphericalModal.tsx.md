# `components/composite/AsphericalModal.tsx`

## Purpose

Modal for configuring aspherical surface parameters: conic constant, surface type (Conical or Even Aspherical), and up to 10 polynomial coefficients (a₂ through a₂₀). Renders MathJax equations to label coefficients and explain the sag formula.

## Props

```ts
interface AsphericalModalProps {
  isOpen: boolean;
  initialConicConstant: number;
  initialType: AsphericalType;
  initialCoefficients: number[];
  onConfirm: (params: { conicConstant: number; type: AsphericalType; polynomialCoefficients: number[] }) => void;
  onClose: () => void;
  onRemove: () => void;
}

type AsphericalType = "Conical" | "EvenAspherical";
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `initialConicConstant` | `number` | Yes | Starting conic constant value |
| `initialType` | `AsphericalType` | Yes | Surface type on open |
| `initialCoefficients` | `number[]` | Yes | Polynomial coefficients on open (may be shorter than 10) |
| `onConfirm` | `(params) => void` | Yes | Called with parsed values on Confirm |
| `onClose` | `() => void` | Yes | Cancel callback |
| `onRemove` | `() => void` | Yes | Clears aspherical data for the surface |

## Internal State

- `conicConstantStr: string` — draft string for conic constant input.
- `type: AsphericalType` — selected type.
- `coefficientStrs: string[]` — draft strings for all 10 coefficient inputs.

## Key Behaviors

- Coefficient inputs are only shown when type is `"EvenAspherical"`.
- On confirm, trailing zero coefficients are stripped (`truncateTrailingZeros`); Conical type produces an empty coefficients array.
- Coefficients array is padded to length 10 on initialization.
- Uses `<MathJax>` for the sag formula and coefficient labels; `MathJaxContext` is provided by the ancestor (`page.tsx`).

## Usages

- Opened from `AsphericalCell` in the lens prescription grid.
