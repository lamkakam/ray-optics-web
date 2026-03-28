# GlassScatterPlot.tsx

## Purpose
Interactive zoomable scatter plot of glass data using `@visx` libraries. Renders all `PlotPoint` entries as colored circles, supports zoom/pan via mouse wheel and drag, and shows a tooltip on hover.

## Props
| Prop | Type | Description |
|------|------|-------------|
| `points` | `readonly PlotPoint[]` | Data points to render |
| `selectedGlass` | `SelectedGlass \| undefined` | Currently selected glass; rendered with larger radius and stroke |
| `xAxisLabel` | `string` | Label for x-axis (e.g. "Vd") |
| `yAxisLabel` | `string` | Label for y-axis (e.g. "Nd") |
| `onPointClick` | `(glass: SelectedGlass) => void` | Called when a circle is clicked |

## Implementation
- `@visx/responsive` `<ParentSize>` fills container; renders `InnerPlot` when width/height > 0
- `@visx/zoom` `<Zoom>` wraps SVG; `zoom.transformMatrix` drives zoom/pan
- Circles placed inside `<g transform={zoom.toString()}>` under `<clipPath>` on data area
- Axes (`@visx/axis` `<AxisBottom>` + `<AxisLeft>`) outside zoom group with derived visible domain from transform matrix
- Hover tooltip via `@visx/tooltip` `useTooltip<PlotPoint>()`
- `data-testid="glass-point"` on each circle for test selection
- Circle radius: 4 (default), 6 + stroke (selected)
- x-axis domain reversed (high Abbe number on left, low on right — standard glass map convention)
- Margins: `{ top: 20, right: 20, bottom: 50, left: 60 }`

## Key Notes
- `@visx/responsive` requires `ResizeObserver` — mocked in test environment via `jest.setup.ts`
- Module-level mock `src/__mocks__/@visx/responsive.tsx` provides fixed 800×600 size in tests
