# `shared/lib/data/exampleSystems.ts`

## Purpose

Provides a catalogue of complete definitions covering a wide variety of optical designs, exported as a keyed record for use in the system-selector UI.

## Exports

```ts
const ExampleSystems: { [key: string]: OpticalModel };
```

Keys are of the form `"N: <name>"` where `N` is the 1-based index of the system in the list (e.g. `"1: Sasian Triplet"`).

## Edge Cases / Error Handling

- The record is plain data — no lazy loading. All 17 models are in memory at module init time.
- Keys are not guaranteed stable if new systems are inserted in the middle of `list`; the numeric prefix will shift. UI components should treat keys as opaque strings.
- Each example model now includes `object.distance`, `object.medium`, and `object.manufacturer`, so downloaded/imported JSON fixtures match the runtime schema.
- Example models with aspherical surfaces use the discriminated domain shape:
  - `{ kind: "Conic", conicConstant }`
  - `{ kind: "EvenAspherical", conicConstant, polynomialCoefficients }`

## Usages

```tsx
import ExampleSystems from "@/shared/lib/data/exampleSystems";
import { surfacesToGridRows } from "@/shared/lib/utils/gridTransform";

// In a system selector dropdown
function SystemSelector() {
  const handleSelectSystem = (key: string) => {
    const model = ExampleSystems[key];
    if (!model) return;

    // Load the selected system into the editor
    lensEditorStore.getState().setRows(surfacesToGridRows(model));
    specsStore.getState().loadFromSpecs(model.specs);
  };

  return (
    <select onChange={(e) => handleSelectSystem(e.target.value)}>
      <option value="">Choose an example system...</option>
      {Object.entries(ExampleSystems).map(([key, model]) => (
        <option key={key} value={key}>
          {key}
        </option>
      ))}
    </select>
  );
}
```
