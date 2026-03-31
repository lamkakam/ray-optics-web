# `features/glass-map/components/GlassScatterPlot.tsx`

## Purpose
Interactive zoomable scatter plot of glass data using `@visx` libraries. Renders all `PlotPoint` entries as colored circles, supports zoom/pan via mouse wheel and drag, shows grid lines on both axes, shows a tooltip on hover (mouse) or touch, and draws crosshair lines for the selected glass.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `points` | `readonly PlotPoint[]` | Data points to render |
| `selectedGlass` | `SelectedGlass \| undefined` | Currently selected glass; rendered with larger radius, stroke, and crosshair lines |
| `xAxisLabel` | `string` | Label for x-axis (e.g. "Vd") |
| `yAxisLabel` | `string` | Label for y-axis (e.g. "Nd") |
| `onPointClick` | `(glass: SelectedGlass) => void` | Called when a circle is clicked or touched |
| `yDomainMin` | `number \| undefined` | Optional forced minimum for y-axis domain (e.g. `1.4` for refractive index plots) |
| `yDomainMax` | `number \| undefined` | Optional forced maximum for y-axis domain (e.g. `2.0` for refractive index plots) |

## Implementation
- `@visx/responsive` `<ParentSize>` fills container; renders `InnerPlot` when width/height > 0
- `@visx/zoom` `<Zoom>` wraps SVG; `zoom.transformMatrix` drives zoom/pan
- Circles placed inside `<g transform={zoom.toString()}>` under `<clipPath>` on data area
- Axes (`@visx/axis` `<AxisBottom>` + `<AxisLeft>`) outside zoom group with derived visible domain from transform matrix; use `stroke="currentColor"`, `tickStroke="currentColor"`, and `tickLabelProps={{ fill: "currentColor" }}` for dark mode support
- Grid lines (`@visx/grid` `<GridRows>` + `<GridColumns>`) use `axisYScale`/`axisXScale` (zoom-aware), clipped to inner area, `stroke="currentColor"` with `strokeOpacity={0.12}`
- Hover tooltip via `@visx/tooltip` `useTooltip<PlotPoint>()`; shows glass name and catalog name with solid background card (CSS variables `--tooltip-bg`, `--tooltip-fg`, `--tooltip-border`, `--tooltip-shadow` defined in `globals.css` for light/dark mode)
- Touch tooltip via `onTouchStart` on circles; calls `showTooltip` and also fires `handlePointClick`
- Tooltip uses `position: fixed` (viewport-relative) to avoid container-offset issues from `<Zoom>`'s internal `<div class="visx-zoom-g">` wrapper
- Tooltip coordinates come from `e.currentTarget.getBoundingClientRect()` on the circle element: `left = rect.right + 8`, `top = rect.top`; this correctly accounts for SVG zoom transforms
- Crosshair lines: when `selectedGlass` is set and its matching `PlotPoint` is found in `points`, two dashed `<line>` elements are rendered inside the clip group at `axisXScale(point.x)` (vertical) and `axisYScale(point.y)` (horizontal); stroke uses CSS variable `--crosshair-stroke` (defined in `globals.css`)
- `data-testid="glass-point"` on each circle for test selection
- `data-testid="crosshair-h"` / `data-testid="crosshair-v"` on crosshair lines for test selection
- Circle radius: 4 (default), 6 + stroke (selected)
- x-axis domain reversed (high Abbe number on left, low on right — standard glass map convention)
- y-axis: lower position = lower value (standard orientation). `visYMin`/`visYMax` derived from zoom transform so that the axis labels track the zoom-transformed data range correctly.
- y-axis domain: data-driven by default; `yDomainMin`/`yDomainMax` props optionally enforce bounds (e.g. 1.4–2.0 for refractive index, omitted for partial dispersion where the tight data range should govern the axis)
- Margins: `{ top: 20, right: 20, bottom: 50, left: 60 }`

## Tooltip Theming
CSS variables in `globals.css`:
- `:root` → `--tooltip-bg: #ffffff`, `--tooltip-fg: #111827`, `--tooltip-border: #e5e7eb`, `--tooltip-shadow` (light drop shadow)
- `.dark` → `--tooltip-bg: #1f2937`, `--tooltip-fg: #f9fafb`, `--tooltip-border: #374151`, `--tooltip-shadow` (heavier dark drop shadow)

## Crosshair Theming
CSS variables in `globals.css`:
- `:root` → `--crosshair-stroke: #4b5563` (gray-600, visible on light backgrounds)
- `.dark` → `--crosshair-stroke: #9ca3af` (gray-400, visible on dark backgrounds)

## Key Notes
- `@visx/responsive` requires `ResizeObserver` — mocked in test environment via `jest.setup.ts`
- Module-level mock `src/__mocks__/@visx/responsive.tsx` provides fixed 800×600 size in tests
- Crosshair lines are not rendered when the selected glass is not found in the current `points` array (e.g. its catalog is disabled)

## Usages

```tsx
import { GlassScatterPlot } from "@/features/glass-map/components/GlassScatterPlot";

// In a page component (e.g., GlassMapView)
const points = useMemo(
  () =>
    catalogsData
      ? computePlotPoints(catalogsData, enabledCatalogs, plotType, abbeNumCenterLine, partialDispersionType)
      : [],
  [catalogsData, enabledCatalogs, plotType, abbeNumCenterLine, partialDispersionType]
);

const { xLabel, yLabel } = axisLabels(plotType, abbeNumCenterLine, partialDispersionType);

const handlePointClick = (glass: SelectedGlass) => {
  setSelectedGlass(glass);
};

return (
  <GlassScatterPlot
    points={points}
    selectedGlass={selectedGlass}
    xAxisLabel={xLabel}
    yAxisLabel={yLabel}
    onPointClick={handlePointClick}
    yDomainMin={plotType === "refractiveIndex" ? 1.4 : undefined}
    yDomainMax={plotType === "refractiveIndex" ? 2.0 : undefined}
  />
);
```
