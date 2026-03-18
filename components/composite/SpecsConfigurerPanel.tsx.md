# `components/composite/SpecsConfigurerPanel.tsx`

## Purpose

Presentational panel for editing optical system specifications: system aperture (type + value), field summary, and wavelength summary. Calls back to the container for all state changes; holds only a local draft string for the aperture value input.

## Props

```ts
interface SpecsConfigurerPanelProps {
  pupilSpace: PupilSpace;
  pupilType: PupilType;
  pupilValue: number;
  fieldSummary: string;
  wavelengthSummary: string;
  onApertureChange: (patch: AperturePatch) => void;
  onOpenFieldModal: () => void;
  onOpenWavelengthModal: () => void;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `pupilSpace` | `PupilSpace` | Yes | Current aperture space (`"object"` / `"image"`) |
| `pupilType` | `PupilType` | Yes | Current aperture type (`"epd"`, `"f/#"`, `"NA"`) |
| `pupilValue` | `number` | Yes | Numeric aperture value |
| `fieldSummary` | `string` | Yes | Human-readable summary of field config (e.g. `"3 fields, 20° max"`) |
| `wavelengthSummary` | `string` | Yes | Human-readable summary of wavelengths (e.g. `"3 wavelengths"`) |
| `onApertureChange` | `(patch) => void` | Yes | Partial update for aperture space, type, or value |
| `onOpenFieldModal` | `() => void` | Yes | Opens `FieldConfigModal` |
| `onOpenWavelengthModal` | `() => void` | Yes | Opens `WavelengthConfigModal` |

## Internal State

- `valueStr: string` — local string draft of `pupilValue`. Synced with `pupilValue` prop via `useEffect`. Committed on `blur` if the string parses to a valid number; reverted otherwise.

## Key Behaviors

- Aperture dropdown selects from three pre-defined combinations of `pupilSpace`+`pupilType`.
- Field and wavelength sections show their summaries as toggle-style buttons that open the respective modals.

## Usages

- Rendered by `SpecsConfigurerContainer`, which wires it to the `specsConfigurerStore`.
