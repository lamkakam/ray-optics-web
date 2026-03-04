# Aperture, Field & Wavelength Configurer — Implementation Plan

## Overview

A panel component that lets users configure the three fundamental optical system specifications: **System Aperture**, **Field of View**, and **Wavelengths**. The component maps directly to `OpticalSpecs` in `lib/opticalModel.ts`.

All work is done on a feature branch (not `main`), following TDD: tests written first (must fail), then implementation to make them pass.

---

## Component Architecture

```
Container:  SpecsConfigurerContainer
                │
Composite:  SpecsConfigurerPanel
                ├── ApertureSection (inline — dropdown + textbox)
                ├── FieldConfigModal (modal with ag-grid)
                └── WavelengthConfigModal (modal with ag-grid)
```

### Layer Responsibilities

| Layer | Component | Role |
|-------|-----------|------|
| Container | `SpecsConfigurerContainer` | Creates local Zustand store, wires callbacks, coordinates modal open/close state |
| Composite | `SpecsConfigurerPanel` | Renders the 3-section panel: aperture inline controls + field button + wavelength button |
| Composite | `FieldConfigModal` | Modal with dropdowns (space, type), max-field textbox, ag-grid for relative fields, Cancel/Apply |
| Composite | `WavelengthConfigModal` | Modal with ag-grid for wavelengths/weights/reference, Cancel/Apply |

No new micro components are needed — the sections are simple enough to stay within composites.

---

## Data Flow

```
OpticalSpecs (from parent / worker)
       │
       ▼
SpecsConfigurerContainer (local Zustand store)
       │
       ├─► ApertureSection: inline edits update store immediately
       ├─► FieldConfigModal: local draft state → Apply writes to store
       └─► WavelengthConfigModal: local draft state → Apply writes to store
       │
       ▼
onSpecsChange(specs: OpticalSpecs)  ← callback to parent
```

- **Aperture** changes are applied immediately (no modal).
- **Field** and **Wavelength** modals use **local draft state** — changes are committed only on "Apply" and discarded on "Cancel".

---

## Zustand Store: `specsConfigurerStore.ts`

### State Shape

```typescript
interface SpecsConfigurerState {
  // Aperture
  pupilSpace: "object" | "image";
  pupilType: "epd" | "f/#" | "NA";
  pupilValue: number;

  // Field
  fieldSpace: "object" | "image";
  fieldType: "angle" | "height";
  maxField: number;
  relativeFields: number[];

  // Wavelengths
  wavelengthWeights: [number, number][]; // [nm, weight][]
  referenceIndex: number;

  // Modal state
  fieldModalOpen: boolean;
  wavelengthModalOpen: boolean;

  // Actions
  setAperture: (patch: { pupilSpace?: ...; pupilType?: ...; pupilValue?: ... }) => void;
  setField: (field: { space: ...; type: ...; maxField: ...; relativeFields: ... }) => void;
  setWavelengths: (wl: { weights: ...; referenceIndex: ... }) => void;
  openFieldModal: () => void;
  closeFieldModal: () => void;
  openWavelengthModal: () => void;
  closeWavelengthModal: () => void;
  toOpticalSpecs: () => OpticalSpecs;
  loadFromSpecs: (specs: OpticalSpecs) => void;
}
```

### Pattern

Follow existing `createLensEditorSlice` pattern: `StateCreator` + `createStore` in the container.

---

## Detailed Component Specs

### 1. `SpecsConfigurerPanel` (composite)

**Props** (all readonly):
- `pupilSpace`, `pupilType`, `pupilValue` — current aperture state
- `fieldSummary: string` — display text for the field button (e.g. "3 fields, 20° max")
- `wavelengthSummary: string` — display text for the wavelength button (e.g. "3 wavelengths")
- `onApertureChange: (patch) => void`
- `onOpenFieldModal: () => void`
- `onOpenWavelengthModal: () => void`

**Rendering** (per requirements layout):

```
┌──────────────────────────────────────────────┐
│ System Aperture                              │
│ [Dropdown ▾] [Value textbox]                 │
├──────────────────────────────────────────────┤
│ Field                                        │
│ [Configure Fields... button]                 │
├──────────────────────────────────────────────┤
│ Wavelengths                                  │
│ [Configure Wavelengths... button]            │
└──────────────────────────────────────────────┘
```

**Aperture dropdown** maps `SystemApertureValue` to display labels:
| Label | Value |
|---|---|
| Entrance Pupil Diameter | `{ pupilSpace: "object", pupilType: "epd" }` |
| Image Space F/# | `{ pupilSpace: "image", pupilType: "f/#" }` |
| Object Space NA | `{ pupilSpace: "object", pupilType: "NA" }` |

### 2. `FieldConfigModal` (composite)

**Props** (all readonly):
- `isOpen: boolean`
- `initialSpace`, `initialType`, `initialMaxField`, `initialRelativeFields`
- `onApply: (result: { space, type, maxField, relativeFields }) => void`
- `onClose: () => void`

**Internal draft state**: Cloned from initial props on open. Only committed via `onApply`.

**ag-grid columns** (all `sortable: false`, `filter: false`, `suppressMovable: true`):

| # | Column | Editor | Notes |
|---|--------|--------|-------|
| 1 | Actions | Custom cell renderer | Add row (+) / Delete row (−). No delete on first row. |
| 2 | Relative Field | `agTextCellEditor` | Float, positive or negative. Default 0. |

- Min 1 row, max 10 rows.
- Row order is preserved and maps directly to `relativeFields: number[]`.

### 3. `WavelengthConfigModal` (composite)

**Props** (all readonly):
- `isOpen: boolean`
- `initialWeights: [number, number][]`
- `initialReferenceIndex: number`
- `onApply: (result: { weights, referenceIndex }) => void`
- `onClose: () => void`

**Internal draft state**: Cloned from initial props on open.

**ag-grid columns** (all `sortable: false`, `filter: false`, `suppressMovable: true`):

| # | Column | Editor | Notes |
|---|--------|--------|-------|
| 1 | Actions | Custom cell renderer | Add (+) / Delete (−). No delete on first row. |
| 2 | Fraunhofer Line | `agSelectCellEditor` | Dropdown: sorted long→short wavelength. Default "e". Selecting updates nm column. |
| 3 | Wavelength (nm) | `agTextCellEditor` | Float > 0. Default 546.073. Overrides Fraunhofer column. |
| 4 | Weight | `agTextCellEditor` | Float >= 0. Default 1. |
| 5 | Reference | Custom cell renderer | Radio button. Exactly one selected. Default: first row. |

**Fraunhofer lines** (sorted long → short wavelength):

| Symbol | λ (nm) |
|--------|--------|
| r | 706.519 |
| C | 656.273 |
| C' | 643.847 |
| d | 587.562 |
| e | 546.073 |
| F | 486.133 |
| F' | 479.991 |
| g | 435.835 |
| h | 404.656 |
| i | 365.015 |

- Min 1 row, max 10 rows.
- Output: `{ weights: [number, number][], referenceIndex: number }`.

### 4. `SpecsConfigurerContainer` (container)

**Props** (all readonly):
- `initialSpecs: OpticalSpecs`
- `onSpecsChange: (specs: OpticalSpecs) => void`

**Responsibilities**:
- Creates a local Zustand store via `useMemo(() => createStore(createSpecsConfigurerSlice), [])`.
- Initializes store from `initialSpecs` on mount.
- Renders `SpecsConfigurerPanel` + `FieldConfigModal` + `WavelengthConfigModal`.
- Calls `onSpecsChange` whenever the store state changes (debounced or on-apply).

---

## File Structure

```
components/
├── composite/
│   ├── SpecsConfigurerPanel.tsx
│   ├── FieldConfigModal.tsx
│   └── WavelengthConfigModal.tsx
├── container/
│   └── SpecsConfigurerContainer.tsx
store/
│   └── specsConfigurerStore.ts
lib/
│   └── fraunhoferLines.ts          # Fraunhofer line lookup table
__tests__/
├── store/
│   └── specsConfigurerStore.test.ts
├── components/composite/
│   ├── SpecsConfigurerPanel.test.tsx
│   ├── FieldConfigModal.test.tsx
│   └── WavelengthConfigModal.test.tsx
└── components/container/
    └── SpecsConfigurerContainer.test.tsx
```

---

## Implementation Steps (TDD order)

### Step 1: `lib/fraunhoferLines.ts`

1. Write test: lookup by symbol returns correct nm value; list is sorted long→short.
2. Implement: export a `FRAUNHOFER_LINES` array of `{ symbol: string; wavelength: number }` and a `lookupWavelength(symbol: string): number | undefined` helper.

### Step 2: `store/specsConfigurerStore.ts`

1. Write tests for:
   - `loadFromSpecs` populates all fields correctly.
   - `setAperture` updates pupil fields.
   - `setField` updates field fields.
   - `setWavelengths` updates wavelength fields.
   - `toOpticalSpecs()` returns a valid `OpticalSpecs` object.
   - Modal open/close toggles.
2. Implement the store slice.

### Step 3: `SpecsConfigurerPanel`

1. Write tests:
   - Renders "System Aperture" label, dropdown with 3 options, value textbox.
   - Renders "Field" label and button.
   - Renders "Wavelengths" label and button.
   - Selecting dropdown option calls `onApertureChange` with correct `{ pupilSpace, pupilType }`.
   - Typing in textbox calls `onApertureChange` with `{ pupilValue }`.
   - Clicking field button calls `onOpenFieldModal`.
   - Clicking wavelength button calls `onOpenWavelengthModal`.
2. Implement component.

### Step 4: `FieldConfigModal`

1. Write tests:
   - Not rendered when `isOpen` is false.
   - Renders space dropdown (Object/Image), type dropdown (Height/Angle), max-field textbox.
   - Renders ag-grid with initial relative fields.
   - Add row button adds a row (up to 10).
   - Delete row button removes a row (not the first).
   - Cancel closes without calling `onApply`.
   - Apply calls `onApply` with current draft state.
   - Escape key closes modal.
2. Implement component.

### Step 5: `WavelengthConfigModal`

1. Write tests:
   - Not rendered when `isOpen` is false.
   - Renders ag-grid with initial wavelength rows.
   - Fraunhofer dropdown selection auto-fills wavelength nm.
   - Manual nm edit overrides Fraunhofer selection.
   - Weight validation (>= 0).
   - Radio button selects reference wavelength (exactly one).
   - Add/delete row behavior (min 1, max 10, no delete on first row).
   - Cancel/Apply/Escape behavior.
2. Implement component.

### Step 6: `SpecsConfigurerContainer`

1. Write tests:
   - Initializes store from `initialSpecs`.
   - Aperture changes propagate to `onSpecsChange`.
   - Field modal open/close/apply flow.
   - Wavelength modal open/close/apply flow.
2. Implement component.

### Step 7: Integration

- Wire `SpecsConfigurerContainer` into the main page alongside `LensPrescriptionContainer`.
- Run full test suite (`npm run test`).

---

## Styling & Accessibility

- Reuse `modalTokens.ts` (`cx.backdrop`, `cx.panel`, `cx.title`, etc.) for Field and Wavelength modals.
- ag-grid theme switching via `useTheme()` + `themeQuartz.withPart(colorSchemeDark | colorSchemeLight)` (same as `LensPrescriptionGrid`).
- All interactive elements get `aria-label`.
- Modals get `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
- Dropdown gets `aria-label="System aperture type"`.
- Value textbox gets `aria-label="Aperture value"`.

---

## Validation Rules

| Field | Rule |
|-------|------|
| Aperture value | Float, can be positive or negative. Default 0.5 |
| Max field value | Float, can be positive or negative. Default 0 |
| Relative field values | Float, can be positive or negative. Default 0 |
| Wavelength (nm) | Float, must be > 0. Default 546.073 |
| Weight | Float, must be >= 0. Default 1 |
| Reference wavelength | Exactly one selected (radio). Default: first row |
| Field rows | Min 1, max 10 |
| Wavelength rows | Min 1, max 10 |

---

## Dependencies

- `ag-grid-community` + `ag-grid-react` (already installed)
- `zustand` (already installed)
- `next-themes` / `useTheme` (already in use)
- Shared `modalTokens.ts` (already exists)
