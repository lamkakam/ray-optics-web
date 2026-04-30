# `features/example-systems/lib/exampleSystems.ts`

## Purpose

Provides a catalogue of complete definitions covering a wide variety of optical designs, exported as a keyed record for use in the system-selector UI.

## Exports

```ts
const ExampleSystemList: Record<string, OpticalModel>;
type ExampleSystemName = keyof typeof ExampleSystemList;
```

- `ExampleSystemList` is the unprefixed catalogue keyed by the canonical display names.
- `ExampleSystemName` is the exact union of supported unprefixed example names.

## Edge Cases / Error Handling

- The record is plain data — no lazy loading. All 21 models are in memory at module init time.
- UI components should use the canonical `ExampleSystemName` keys directly; this module does not provide generated numeric prefix aliases.
- Each example model now includes `object.distance`, `object.medium`, and `object.manufacturer`, so downloaded/imported JSON fixtures match the runtime schema.
- Example models with aspherical surfaces use the discriminated domain shape:
  - `{ kind: "Conic", conicConstant }`
  - `{ kind: "EvenAspherical", conicConstant, polynomialCoefficients }`

## Usages

```tsx
import { ExampleSystemList, type ExampleSystemName } from "@/features/example-systems/lib/exampleSystems";
import { surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";

// In a system selector dropdown
function SystemSelector() {
  const handleSelectSystem = (key: ExampleSystemName) => {
    const model = ExampleSystemList[key];

    // Load the selected system into the editor
    lensEditorStore.getState().setRows(surfacesToGridRows(model));
    specsStore.getState().loadFromSpecs(model.specs);
  };

  return (
    <select onChange={(e) => handleSelectSystem(e.target.value as ExampleSystemName)}>
      <option value="">Choose an example system...</option>
      {Object.keys(ExampleSystemList).map((key) => (
        <option key={key} value={key}>
          {key}
        </option>
      ))}
    </select>
  );
}
```
