# `components/composite/FieldConfigModal.tsx`

## Purpose

Modal for configuring optical field settings: field space, field type, max field value, and a list of relative field positions. Uses AG Grid for the editable field table.

## Props

```ts
interface FieldConfigModalProps {
  isOpen: boolean;
  initialSpace: FieldSpace;
  initialType: FieldType;
  initialMaxField: number;
  initialRelativeFields: readonly number[];
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
| `onApply` | `(result) => void` | Yes | Called with the final config on Apply |
| `onClose` | `() => void` | Yes | Cancel callback |

## Internal State

- `space`, `fieldType`, `maxFieldStr` — draft values for the header controls.
- `rows: FieldRow[]` — AG Grid row data for relative field values; each row has a stable `id`.

## Key Behaviors

- Reset-on-open: all draft state is re-initialized from props when `isOpen` transitions to `true`.
- Row limit is 10; the add button becomes hidden (not removed) at the limit.
- The first row cannot be deleted.
- Row ids use a module-level counter for stable AG Grid `getRowId`.

## Usages

- Rendered by `SpecsConfigurerContainer`; opened from `SpecsConfigurerPanel`.
