# `features/lens-editor/components/WavelengthConfigModal.tsx`

## Purpose

Modal for configuring the system's wavelengths. Provides an AG Grid table with columns for Fraunhofer symbol, wavelength (nm), weight, and a reference wavelength radio button.

## Props

```ts
interface WavelengthConfigModalProps {
  isOpen: boolean;
  initialWeights: readonly [number, number][];
  initialReferenceIndex: number;
  onApply: (result: WavelengthConfigResult) => void;
  onClose: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `initialWeights` | `readonly [number, number][]` | Yes | Array of `[wavelength_nm, weight]` pairs |
| `initialReferenceIndex` | `number` | Yes | Index of the reference wavelength in the weights array |
| `onApply` | `(result) => void` | Yes | Called with updated weights and reference index on Apply |
| `onClose` | `() => void` | Yes | Cancel callback |

## Internal State

- `rows: WavelengthRow[]` — AG Grid row data; each row has `id`, `fraunhofer` symbol, `wavelength`, and `weight`.
- `referenceIndex: number` — index of the reference wavelength.

## Key Behaviors

- Reset-on-open: state is re-initialized from props when `isOpen` transitions to `true`.
- Fraunhofer symbol and wavelength are kept in sync: editing the symbol updates the wavelength, and editing the wavelength updates the symbol if it matches a Fraunhofer line exactly. BUT THE USER'S MANUAL WAVELENGTH INPUT OVERRIDES THE VALUE OF THE SYMBOL.
- Row limit is 7 (HARD LIMIT FROM RayOptics); the first row cannot be deleted.
- When a row is deleted, `referenceIndex` is adjusted to remain valid.

## Usages

```tsx
import { WavelengthConfigModal } from "@/features/lens-editor/components/WavelengthConfigModal";

// In a container component (e.g., SpecsConfigurerContainer)
const wavelengthWeights = useStore(store, (s) => s.wavelengthWeights);
const referenceIndex = useStore(store, (s) => s.referenceIndex);
const wavelengthModalOpen = useStore(store, (s) => s.wavelengthModalOpen);

const handleWavelengthApply = useCallback(
  (result: { weights: WavelengthWeights; referenceIndex: ReferenceIndex }) => {
    store.getState().setWavelengths(result);
    store.getState().closeWavelengthModal();
  },
  [store]
);

return (
  <>
    <WavelengthConfigModal
      isOpen={wavelengthModalOpen}
      initialWeights={wavelengthWeights}
      initialReferenceIndex={referenceIndex}
      onApply={handleWavelengthApply}
      onClose={() => store.getState().closeWavelengthModal()}
    />
  </>
);
```
