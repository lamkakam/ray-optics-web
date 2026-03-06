# Page Layout Design

A responsive layout for `app/page.tsx` — a simplified, user-friendly web version of Zemax.

## Layout Overview

### Desktop (>= 1024px)

```
+----------------------------------------------------------+
|  Header: "Ray Optics Web" + First-order data summary     |
+--------------------------------+-------------------------+
|                                |  Analysis Panel         |
|                                |  +-------------------+  |
|     Lens Layout Diagram        |  | Field: [v 0.0deg] |  |
|     (base64 <img>)             |  | Plot:  [v Ray Fan]|  |
|     ~65% width                 |  +-------------------+  |
|                                |  |                   |  |
|                                |  |  Plot image here  |  |
|                                |  |  (base64 <img>)   |  |
|                                |  |                   |  |
|                                |  +-------------------+  |
|                                |         ~35% width      |
+--------------------------------+-------------------------+
|  ^ Slidable Footer (drag handle or toggle button)        |
|  +- Tabs: [Specs] [Prescription] ----------------------+ |
|  |  SpecsConfigurerContainer | LensPrescriptionContainer| |
|  +------------------------------------------------------+ |
+----------------------------------------------------------+
```

### Mobile (< 1024px)

Single column, stacked vertically:

```
+----------------------+
|  Header              |
+----------------------+
|  Lens Layout (full)  |
+----------------------+
|  Analysis dropdowns  |
|  + Plot image        |
+----------------------+
|  ^ Bottom drawer     |
|  Tabs: Specs | Rx    |
+----------------------+
```

---

## Component Breakdown

### 1. Lens Layout — Center Piece

- Occupies the main viewport area (left 65% on desktop, full width on mobile).
- Renders as `<img src="data:image/png;base64,...">` with `object-contain`.
- A subtle card wrapper with a "Lens Layout" label.
- A refresh/update button overlaid in the top-right corner.

### 2. Bottom Drawer (Specs + Prescription)

A slidable footer with three snap points:

| Snap Point | Height          | Use Case                        |
|------------|-----------------|---------------------------------|
| Collapsed  | ~40px           | Just the handle/tab bar visible |
| Half       | ~40% viewport   | Default on first load           |
| Expanded   | ~70% viewport   | Full editing mode               |

Implementation:
- CSS `translate-y` + pointer-event drag handler (`onPointerDown`/`onPointerMove`).
- No external library needed — a simple `requestAnimationFrame` approach.
- The lens layout area above grows/shrinks inversely (`calc(100vh - drawerHeight)`).

Contains two tabs:
- **System Specs** -> `SpecsConfigurerContainer`
- **Prescription** -> `LensPrescriptionContainer`

### 3. Analysis Panel (Ray Fan / OPD Fan / Spot Diagram)

- **Desktop**: right sidebar (~35% width), scrollable.
- **Mobile**: stacked below the lens layout, above the drawer.

Two dropdowns at the top:

#### Field Selector

Options derived from the specs store (`relativeFields`, `maxField`, `fieldType`):

```ts
relativeFields.map((rf, i) => ({
  label: `${(rf * maxField).toFixed(1)}${fieldType === 'angle' ? 'deg' : ' mm'}`,
  value: i   // fieldIndex passed to plot functions
}))
```

Option labels show absolute field values with units (e.g., "0.0deg", "14.0deg", "20.0deg"), not raw indices.

#### Plot Type Selector

Three options: `Ray Fan | OPD Fan | Spot Diagram`

When either dropdown changes, call the corresponding worker function and show a loading skeleton while awaiting:

| Plot Type    | Worker Call              |
|--------------|--------------------------|
| Ray Fan      | `plotRayFan(fi)`         |
| OPD Fan      | `plotOpdFan(fi)`         |
| Spot Diagram | `plotSpotDiagram(fi)`    |

### 4. First-Order Data Summary

A compact bar below the header showing key values from `getFirstOrderData()`:

```
EFL: 100.2mm | f/4.0 | BFL: 68.1mm | Total Track: 88.0mm
```

Displayed as small chips/badges. Updates whenever the model updates.

---

## Component Tree

```
app/page.tsx
+-- <HeaderBar />                          # Title + first-order data chips
+-- <main className="flex flex-col lg:flex-row">
|   +-- <LensLayoutPanel />                # base64 image + refresh button
|   +-- <AnalysisPanel                     # Dropdowns + plot image
|         relativeFields={...}
|         maxField={...}
|         fieldType={...}
|         onPlotRequest={(type, fi) => ...} />
+-- <BottomDrawer>                         # Slidable, tabbed
    +-- Tab: <SpecsConfigurerContainer />
    +-- Tab: <LensPrescriptionContainer />
    </BottomDrawer>
```

---

## State Flow

The page needs a top-level orchestration layer (local state in `page.tsx` or a dedicated store) that:

1. Holds the current `OpticalModel` (specs + surfaces combined).
2. On any change from `SpecsConfigurerContainer` or `LensPrescriptionContainer`:
   - Calls `worker.setOpticalSurfaces(model)`.
   - Re-fetches the lens layout plot, the currently selected analysis plot, and first-order data.
3. Passes `relativeFields` / `maxField` / `fieldType` down to `AnalysisPanel` for field dropdown labels.

The `AnalysisPanel` is a pure display component — it receives a `plotImage: string` (base64) and calls back when the user changes dropdowns. The page orchestrator calls the worker and feeds the result back.

### Update Debouncing

Debounce model updates (e.g., 300ms after the last surface/spec edit) before calling `setOpticalSurfaces` + re-plotting, to avoid hammering Pyodide during rapid edits.

---

## Tailwind Layout Sketch

```tsx
<div className="h-screen flex flex-col">
  {/* Header */}
  <header className="h-12 shrink-0 border-b px-4 flex items-center gap-4">
    <h1 className="font-semibold">Ray Optics Web</h1>
    <div className="flex gap-2 text-sm text-muted-foreground">
      {/* first-order data chips */}
    </div>
  </header>

  {/* Main content — fills remaining height */}
  <div className="flex-1 flex flex-col lg:flex-row min-h-0">
    {/* Lens layout */}
    <div className="flex-1 lg:w-[65%] p-4 flex items-center justify-center">
      <img
        src={`data:image/png;base64,${layoutImage}`}
        className="max-w-full max-h-full object-contain"
        alt="Lens layout diagram"
      />
    </div>
    {/* Analysis sidebar */}
    <div className="lg:w-[35%] border-l p-4 overflow-y-auto">
      {/* field dropdown + plot type dropdown + plot image */}
    </div>
  </div>

  {/* Bottom drawer */}
  <div className="border-t" style={{ height: drawerHeight }}>
    {/* drag handle + tabs + content */}
  </div>
</div>
```

---

## Implementation Notes

- No external drawer library needed. A pointer-event drag handler with `requestAnimationFrame` and three snap points is sufficient. Store `drawerHeight` in local React state.
- All three analysis plot types share the same field selector. Changing the field re-requests the currently selected plot type.
- The field dropdown labels are computed from the specs store (`relativeFields * maxField` with units), keeping the UX consistent with how optical engineers think.
- Loading states: show a skeleton/spinner overlay on both the lens layout and analysis plot images while awaiting worker responses.
