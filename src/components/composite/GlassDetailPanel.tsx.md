# GlassDetailPanel.tsx

## Purpose
Displays details for the currently selected glass point. Shows a placeholder when no glass is selected.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `selectedGlass` | `SelectedGlass \| undefined` | Glass to display; `undefined` shows placeholder |

## Behavior
- When `selectedGlass` is `undefined`: renders "Select a glass point on the chart to see details."
- When `selectedGlass` is set: renders catalog name, glass name, and a property table with:
  - N_d, N_e, V_d, V_e
  - P_{g,F}
  - P_{F,d}
  - P_{F,e}
- Numeric formatting: refractive indices (N_d, N_e) to **5 decimal places**, Abbe numbers (V_d, V_e) to **2 decimal places**, partial dispersions to **4 decimal places**.
- All property labels are rendered via `MathJax inline` for proper subscript notation (e.g. `\(N_d\)`, `\(P_{g,F}\)`).
- **The component does not own a `MathJaxContext`** — the context is provided by the parent (`GlassMapView`).
- Each label cell contains a `<span data-testid="label-{key}">` (e.g. `label-Nd`, `label-P_g_F`) for testing.
- Property table is rendered using the `Table` micro-component (`headers={[]}`, rows are `[labelSpan, value]` pairs).

## Usages

```tsx
import { GlassDetailPanel } from "@/components/composite/GlassDetailPanel";

// In a page component (e.g., GlassMapView)
const selectedGlass = useStore(store, (s) => s.selectedGlass);

return (
  <div>
    <GlassDetailPanel selectedGlass={selectedGlass} />
  </div>
);
```
