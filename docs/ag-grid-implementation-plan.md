# AG Grid Data Grid Implementation Plan — Lens Prescription Editor

## Context

The ray-optics-web project needs a data grid for users to input and edit optical surface prescriptions. This grid is the primary data entry point for the sequential optical model. AG Grid Community (MIT) was chosen for its mature inline editing, keyboard navigation, and built-in row management APIs.

---

## 1. Package Installation

```bash
npm install ag-grid-community ag-grid-react
```

AG Grid Community is ~298 kB gzipped. Since the project already loads Pyodide + rayoptics WASM (many megabytes), this is acceptable.

---

## 2. Component Hierarchy

```
components/
├── micro/
│   ├── SurfaceLabelCell.tsx          # Dropdown renderer: "Default" | "Stop"
│   ├── NumberCell.tsx                # Numeric input cell editor
│   ├── MediumCell.tsx                # Read-only cell + click-to-open-modal trigger
│   └── AsphericalCell.tsx            # Checkbox cell + click-to-open-modal trigger
│
├── composite/
│   ├── LensPrescriptionGrid.tsx      # AgGridReact wrapper, column defs, grid options
│   ├── MediumSelectorModal.tsx       # Glass selection modal (manufacturer + glass dropdown)
│   └── AsphericalModal.tsx           # Conic constant + type + polynomial coefficient fields
│
└── container/
    └── LensPrescriptionContainer.tsx # Zustand binding, row add/delete, export, modal state
```

All files use `"use client"`.

---

## 3. Internal Data Model

### 3.1 Grid Row Type

A unified row type represents Object, Surface, and Image rows in the grid:

```typescript
// lib/gridTypes.ts

export type SurfaceRowKind = "object" | "surface" | "image";

export interface GridRow {
  readonly id: string;                    // stable UUID for AG Grid getRowId
  readonly kind: SurfaceRowKind;
  // Object row
  objectDistance?: number;
  // Surface + Image rows
  label?: "Default" | "Stop";
  curvatureRadius?: number;
  thickness?: number;
  medium?: string;
  manufacturer?: string;
  semiDiameter?: number;
  aspherical?: {
    conicConstant: number;
    polynomialCoefficients?: number[];    // length <= 10, even terms a2..a20
  };
}
```

- Object and Image rows use fixed IDs: `"row-object"` and `"row-image"`
- Surface rows use `crypto.randomUUID()`

### 3.2 Transformation: `Surfaces` <-> `GridRow[]`

A pure function module with no React dependencies:

```typescript
// lib/gridTransform.ts

export function surfacesToGridRows(surfaces: Surfaces): GridRow[]
export function gridRowsToSurfaces(rows: GridRow[]): Surfaces
```

- `surfacesToGridRows`: Object row (kind=object, objectDistance) + N surface rows + Image row (kind=image, curvatureRadius)
- `gridRowsToSurfaces`: Filters by kind, maps back to the `Surfaces` interface
- Must round-trip: `gridRowsToSurfaces(surfacesToGridRows(s))` equals `s`

---

## 4. Zustand Store

```typescript
// store/lensEditorStore.ts

interface ModalState {
  open: boolean;
  rowId: string;
}

interface LensEditorState {
  rows: GridRow[];
  selectedRowId: string | undefined;
  mediumModal: ModalState;
  asphericalModal: ModalState;

  // Actions
  setRows: (rows: GridRow[]) => void;
  updateRow: (id: string, patch: Partial<GridRow>) => void;
  addRowAfterSelected: () => void;           // one row at a time
  deleteSelectedRow: () => void;
  setSelectedRowId: (id: string | undefined) => void;
  openMediumModal: (rowId: string) => void;
  closeMediumModal: () => void;
  openAsphericalModal: (rowId: string) => void;
  closeAsphericalModal: () => void;
  exportToJson: () => string;
}
```

- `rows` is the single source of truth — AG Grid is purely a rendering layer
- Default new surface: `label: "Default"`, `curvatureRadius: 0`, `thickness: 0`, `medium: "air"`, `manufacturer: "air"`, `semiDiameter: 1`, `aspherical: undefined`
- Object and Image rows are never deletable (guarded in `deleteSelectedRow`)

---

## 5. AG Grid Configuration

### 5.1 Column Definitions

| # | Header | Field | Object Row | Surface Rows | Image Row |
|---|--------|-------|------------|--------------|-----------|
| 1 | (checkbox) | — | No checkbox | Checkbox | No checkbox |
| 2 | Surface | `label` | "Object" (static) | Dropdown: Default/Stop | "Image" (static) |
| 3 | Radius | `curvatureRadius` | Not editable | Editable (number) | Editable (number) |
| 4 | Thickness | `thickness` | Hidden | Editable (number) | Hidden |
| 5 | Medium | `medium` | Hidden | Click opens modal | Hidden |
| 6 | Semi-diam. | `semiDiameter` | Hidden | Editable (number) | Hidden |
| 7 | Asph. | `aspherical` | Hidden | Checkbox opens modal | Hidden |

"Hidden" = cell value not displayed and not editable for that row kind.

### 5.2 Key Grid Options

```typescript
{
  rowSelection: "single",
  domLayout: "autoHeight",
  getRowId: (params) => params.data.id,
  stopEditingWhenCellsLoseFocus: true,
  enterNavigatesVertically: true,
  enterNavigatesVerticallyAfterEdit: true,
}
```

### 5.3 Theme

Use `ag-theme-quartz` with `data-ag-theme-mode` attribute for light/dark switching:

```tsx
<div className="ag-theme-quartz" data-ag-theme-mode={theme}>
  <AgGridReact ... />
</div>
```

Import only the necessary CSS:
```typescript
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
```

---

## 6. Micro Components

### 6.1 SurfaceLabelCell

- Renders `<select>` with "Default" and "Stop" options
- Props: `readonly value`, `readonly onValueChange`
- `aria-label="Surface label"`

### 6.2 NumberCell

- AG Grid custom cell editor (implements ref-based `getValue()`)
- Renders `<input type="number">`, auto-selects on mount
- Props via AG Grid editor params: `allowNegative`, `min`, `max`
- Validates: rejects non-finite values

### 6.3 MediumCell

- Cell renderer (NOT editor) — displays medium string
- Clicking opens Medium modal via callback
- Props: `readonly medium`, `readonly onOpenModal`
- `aria-label="Edit medium"`

### 6.4 AsphericalCell

- Cell renderer — displays read-only checkbox
- Clicking opens Aspherical modal via callback
- Props: `readonly isAspherical`, `readonly onOpenModal`
- `aria-label="Edit aspherical parameters"`

---

## 7. Modal Components

### 7.1 MediumSelectorModal

```typescript
interface Props {
  readonly isOpen: boolean;
  readonly initialMedium: string;
  readonly initialManufacturer: string;
  readonly onConfirm: (medium: string, manufacturer: string) => void;
  readonly onClose: () => void;
}
```

**Glass catalog source**: The opticalglass Python package (installed via micropip in the Pyodide worker) includes static glass catalogs for 6 manufacturers. Glass names can be queried BUT we will use a local hard-coded JSON file for the glass catalog:

```python
from opticalglass.glassfactory import get_glass_catalog
catalog = get_glass_catalog('Schott')
glass_names = list(catalog.df.index)  # e.g., ['N-BK7', 'N-SF6', ...]
```

**Supported manufacturers**: Schott, Hoya, Ohara, CDGM, Hikari, Sumita

**UI flow**:
1. Manufacturer dropdown at the top (includes "Special" group for air/REFL + the 6 manufacturers)
2. When "Special" selected → show options: "air", "REFL" (no glass dropdown needed)
3. When a real manufacturer selected → fetch glass list from worker → show filterable glass dropdown
4. Glass list is cached after first fetch per manufacturer
5. Confirm/Cancel buttons

**Accessibility**: `role="dialog"`, `aria-modal="true"`, focus trap, Escape closes.

### 7.2 AsphericalModal

```typescript
type AsphericalType = "Conical" | "EvenAspherical";

interface Props {
  readonly isOpen: boolean;
  readonly initialConicConstant: number;
  readonly initialType: AsphericalType;
  readonly initialCoefficients: number[];
  readonly onConfirm: (params: {
    conicConstant: number;
    type: AsphericalType;
    polynomialCoefficients: number[];
  }) => void;
  readonly onClose: () => void;
  readonly onRemove: () => void;
}
```

**UI flow**:
1. Conic constant `<input type="number">` — always visible (both types need it)
2. Type `<select>`: "Conical" or "Even Aspherical"
3. When "Even Aspherical" → 10 number inputs labeled a2, a4, a6, a8, a10, a12, a14, a16, a18, a20
4. "Remove Aspherical" button (calls `onRemove`)
5. Confirm/Cancel buttons

**Accessibility**: Same as MediumSelectorModal.

---

## 8. Container Component

```typescript
// components/container/LensPrescriptionContainer.tsx

interface Props {
  readonly initialSurfaces: Surfaces;
  readonly onSurfacesChange: (surfaces: Surfaces) => void;
}
```

**Responsibilities**:
1. Initializes Zustand store rows from `initialSurfaces` via `surfacesToGridRows`
2. Subscribes to store changes → calls `onSurfacesChange(gridRowsToSurfaces(rows))`
3. Renders toolbar: Add Row, Delete Selected Row, Export JSON
4. Renders `LensPrescriptionGrid` with DI callbacks
5. Renders both modals, controlled by store modal state

**Toolbar button states**:
- Add Row: disabled if no surface row is selected
- Delete Row: disabled if selected row is Object or Image
- Export: always enabled → downloads `lens-prescription.json`

**DI pattern**: Container passes callbacks as props. No composite/micro component imports the Zustand store directly.

---

## 9. Complete File Structure

```
ray-optics-web/
├── lib/
│   ├── opticalModel.ts              # EXISTING
│   ├── gridTypes.ts                 # NEW — GridRow, SurfaceRowKind
│   └── gridTransform.ts             # NEW — surfacesToGridRows, gridRowsToSurfaces
│
├── store/
│   └── lensEditorStore.ts           # NEW — Zustand store
│
├── components/
│   ├── micro/
│   │   ├── SurfaceLabelCell.tsx     # NEW
│   │   ├── NumberCell.tsx           # NEW
│   │   ├── MediumCell.tsx           # NEW
│   │   └── AsphericalCell.tsx       # NEW
│   │
│   ├── composite/
│   │   ├── LensPrescriptionGrid.tsx # NEW — AG Grid wrapper
│   │   ├── MediumSelectorModal.tsx  # NEW
│   │   └── AsphericalModal.tsx      # NEW
│   │
│   └── container/
│       └── LensPrescriptionContainer.tsx  # NEW
│
├── __mocks__/
│   ├── ag-grid-react.tsx            # NEW — Jest mock for AgGridReact
│   └── ag-grid-community.ts         # NEW — stub for CSS imports
│
└── jest.config.ts                   # MODIFY — add AG Grid moduleNameMapper entries
```

**Test files** (co-located `__tests__/` directories):

```
lib/__tests__/gridTransform.test.ts
store/__tests__/lensEditorStore.test.ts
components/micro/__tests__/SurfaceLabelCell.test.tsx
components/micro/__tests__/NumberCell.test.tsx
components/micro/__tests__/MediumCell.test.tsx
components/micro/__tests__/AsphericalCell.test.tsx
components/composite/__tests__/LensPrescriptionGrid.test.tsx
components/composite/__tests__/MediumSelectorModal.test.tsx
components/composite/__tests__/AsphericalModal.test.tsx
components/container/__tests__/LensPrescriptionContainer.test.tsx
```

---

## 10. Jest Configuration for AG Grid

AG Grid uses browser APIs (ResizeObserver, etc.) unavailable in jsdom. Mock the entire library:

```typescript
// jest.config.ts additions to moduleNameMapper:
{
  "^ag-grid-react$": "<rootDir>/__mocks__/ag-grid-react.tsx",
  "^ag-grid-community/styles/.*$": "<rootDir>/__mocks__/ag-grid-community.ts",
}
```

The `ag-grid-react` mock renders a plain `<table>` with `data-testid="ag-grid-mock"`, mapping `rowData` and `columnDefs` to rows and cells. The `ag-grid-community` mock is an empty export (stubs CSS imports).

---

## 11. Testing Strategy (TDD)

### What to Test

| Layer | What | How |
|-------|------|-----|
| `lib/gridTransform.ts` | Round-trip transformation, edge cases (single surface, empty) | Pure unit tests, no React |
| `store/lensEditorStore.ts` | All actions: add/delete/update/select, modal toggles, export | Zustand store called directly |
| Micro components | Render output, callback invocation, aria labels | React Testing Library |
| `MediumSelectorModal` | Open/close, manufacturer filter, Escape key, confirm payload | React Testing Library |
| `AsphericalModal` | Type toggle shows/hides coefficients, confirm/remove callbacks | React Testing Library |
| `LensPrescriptionGrid` | Correct rowData/columnDefs passed to AG Grid mock | React Testing Library |
| `LensPrescriptionContainer` | Button states, data flow, modal triggers | Integration test (jest) |

### What NOT to Test in Jest
- AG Grid internal keyboard navigation (tested by AG Grid)
- AG Grid cell editing lifecycle (use E2E instead)
- CSS/visual appearance

### E2E (Playwright)

```
e2e/lensPrescriptionGrid.spec.ts
```

Covers: page load with demo data, inline editing, add/delete rows, modal interactions, JSON export.

---

## 12. Implementation Phases

### Phase A — Types & Pure Logic
1. Write failing tests for `gridTransform`
2. Create `lib/gridTypes.ts` and `lib/gridTransform.ts`
3. All tests pass

### Phase B — Zustand Store
1. Write failing tests for `lensEditorStore`
2. Create `store/lensEditorStore.ts`
3. All tests pass

### Phase C — Micro Components
For each (SurfaceLabelCell → NumberCell → MediumCell → AsphericalCell):
1. Write failing tests
2. Implement component
3. Tests pass

### Phase D — AG Grid Mock + Grid Composite
1. Create `__mocks__/ag-grid-react.tsx` and `__mocks__/ag-grid-community.ts`
2. Update `jest.config.ts`
3. Write failing tests for `LensPrescriptionGrid`
4. Implement `LensPrescriptionGrid`
5. Tests pass

### Phase E — Modal Components
1. Write failing tests → implement `MediumSelectorModal` → tests pass
2. Write failing tests → implement `AsphericalModal` → tests pass

### Phase F — Container Integration
1. Write failing tests for `LensPrescriptionContainer`
2. Implement container
3. Tests pass

### Phase G — Page Integration & E2E
1. Import container into `app/page.tsx`
2. Write Playwright spec
3. All E2E tests pass

---

## 13. Accessibility Checklist

- [ ] All `<select>`, `<input>`, `<button>` elements have `aria-label`
- [ ] Modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- [ ] Modal focus trap: first focusable element receives focus; Tab cycles within
- [ ] Escape key closes both modals
- [ ] Grid wrapper: `aria-label="Lens prescription editor"`
- [ ] Disabled toolbar buttons use `aria-disabled`

---

## 14. Constraints & Decisions

| Constraint | Decision |
|---|---|
| AG Grid in jsdom | Mock `ag-grid-react` entirely; test behavior via props |
| Glass catalog data | Query Pyodide worker at runtime via opticalglass; cache per manufacturer |
| `"use client"` | All grid components are Client Components |
| Row IDs | `crypto.randomUUID()` for surfaces; fixed IDs for Object/Image |
| Polynomial coefficients | 10 inputs (a2–a20); trailing zeros truncated before storing |
| Add rows | One at a time, after the selected surface row |
| Bundle size | ~298 kB gzipped is acceptable given Pyodide is already loaded |

---

*Generated: 2026-03-02*
