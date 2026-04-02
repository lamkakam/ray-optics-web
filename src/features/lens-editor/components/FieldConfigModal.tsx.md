# `features/lens-editor/components/FieldConfigModal.tsx`

## Purpose

Modal for configuring optical field settings: field space, field type, max field value, a list of relative field positions, and the optional wide-angle ray-aiming mode. Uses AG Grid for the editable field table.

## Props

```ts
interface FieldConfigModalProps {
  isOpen: boolean;
  initialSpace: FieldSpace;
  initialType: FieldType;
  initialMaxField: number;
  initialRelativeFields: readonly number[];
  initialIsWideAngle: boolean;
  onApply: (result: FieldConfigResult) => void;
  onClose: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility |
| `initialSpace` | `FieldSpace` | Yes | `"object"` or `"image"` |
| `initialType` | `FieldType` | Yes | `"height"` or `"angle"` |
| `initialMaxField` | `number` | Yes | Max field value in mm or degrees |
| `initialRelativeFields` | `readonly number[]` | Yes | List of relative field values (0–1) |
| `initialIsWideAngle` | `boolean` | Yes | Initial state for the wide-angle ray-aiming checkbox |
| `onApply` | `(result) => void` | Yes | Called with the final config on Apply |
| `onClose` | `() => void` | Yes | Cancel callback |

## Internal State

- `space`, `fieldType`, `maxFieldStr`, `isWideAngle` — draft values for the controls.
- `rows: FieldRow[]` — AG Grid row data for relative field values; each row has a stable `id`.

## Key Behaviors

- Reset-on-open: all draft state is re-initialized from props when `isOpen` transitions to `true`.
- Row limit is 10; the add button becomes hidden (not removed) at the limit.
- The first row cannot be deleted.
- A compact checkbox below the grid toggles whether wide-angle mode is enabled for more robust ray aiming; the checkbox stays narrow while the label is left-aligned beside it.
- Row ids use a module-level counter for stable AG Grid `getRowId`.

## Usages

```tsx
import { FieldConfigModal } from "@/features/lens-editor/components/FieldConfigModal";

// In a container component (e.g., SpecsConfiguratorContainer)
const fieldSpace = useStore(store, (s) => s.fieldSpace);
const fieldType = useStore(store, (s) => s.fieldType);
const maxField = useStore(store, (s) => s.maxField);
const relativeFields = useStore(store, (s) => s.relativeFields);
const isWideAngle = useStore(store, (s) => s.isWideAngle);
const fieldModalOpen = useStore(store, (s) => s.fieldModalOpen);

const handleFieldApply = useCallback(
  (result: {
    space: FieldSpace;
    type: FieldType;
    maxField: number;
    relativeFields: number[];
    isWideAngle: boolean;
  }) => {
    store.getState().setField(result);
    store.getState().closeFieldModal();
  },
  [store]
);

return (
  <>
    <FieldConfigModal
      isOpen={fieldModalOpen}
      initialSpace={fieldSpace}
      initialType={fieldType}
      initialMaxField={maxField}
      initialRelativeFields={relativeFields}
      initialIsWideAngle={isWideAngle}
      onApply={handleFieldApply}
      onClose={() => store.getState().closeFieldModal()}
    />
  </>
);
```
