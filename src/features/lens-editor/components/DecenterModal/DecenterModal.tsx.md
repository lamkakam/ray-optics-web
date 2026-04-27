# `features/lens-editor/components/DecenterModal/DecenterModal.tsx`

## Purpose

Modal for configuring surface tilt and decenter parameters: coordinate system strategy, Euler angles (alpha, beta, gamma in degrees), and X/Y offsets.

## Props

```ts
interface DecenterModalProps {
  isOpen: boolean;
  initialDecenter: DecenterType | undefined;
  readOnly?: boolean;
  onConfirm: (decenter: DecenterType) => void;
  onClose: () => void;
  onRemove: () => void;
}

type DecenterType = DecenterConfig;  // from lib/opticalModel
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `initialDecenter` | `DecenterType \| undefined` | Yes | Existing decenter config, or `undefined` for a new one (defaults to bend/all zeros) |
| `readOnly` | `boolean` | No | When `true`, all controls are disabled and the footer shows only `Close` |
| `onConfirm` | `(decenter) => void` | Yes | Called with parsed values on Confirm |
| `onClose` | `() => void` | Yes | Cancel callback |
| `onRemove` | `() => void` | Yes | Clears decenter data for the surface |

## Internal State

- `posAndOrientation: DecenterCoordinateSystemStrategy` — selected strategy.
- `alphaStr`, `betaStr`, `gammaStr`, `offsetXStr`, `offsetYStr: string` — draft strings for numeric inputs.

## Key Behaviors

- When `initialDecenter` is `undefined`, all fields default to `0` and strategy defaults to `"bend"`.
- Invalid or empty numeric strings fall back to the initial value.
- In `readOnly` mode, the strategy select and all numeric inputs are disabled; the footer renders only `Close`.

## Usages

```tsx
import { DecenterModal, type DecenterType } from "@/features/lens-editor/components/DecenterModal";

// In a container component (e.g., LensPrescriptionContainer)
const decenterRow = rows.find((r) => r.id === decenterModal.rowId);

return (
  <>
    <DecenterModal
      key={decenterModal.open ? decenterModal.rowId : "decenter-closed"}
      isOpen={decenterModal.open}
      initialDecenter={decenterRow?.kind !== "object" ? decenterRow?.decenter : undefined}
      onConfirm={(decenter: DecenterType) => {
        store.getState().updateRow(decenterModal.rowId, { decenter });
        store.getState().closeDecenterModal();
      }}
      onClose={() => store.getState().closeDecenterModal()}
      onRemove={() => {
        store.getState().updateRow(decenterModal.rowId, { decenter: undefined });
        store.getState().closeDecenterModal();
      }}
    />
  </>
);
```
