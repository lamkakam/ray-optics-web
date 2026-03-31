# `shared/lib/utils/plotFunctions.ts`

## Purpose

Shared utility that maps `PlotType` values to Pyodide worker proxy calls. Eliminates duplication between `app/page.tsx` and `AnalysisPlotContainer.tsx`.

## Exports

### `PlotFn`

```ts
type PlotFn = (fieldIndex: number, wavelengthIndex: number) => Promise<string>;
```

A unified function signature for all plot types. `fieldIndex` and `wavelengthIndex` are always passed; implementations that don't need them simply ignore the unused parameter.

### `PLOT_FUNCTION_BUILDERS`

```ts
const PLOT_FUNCTION_BUILDERS: Record<PlotType, (proxy: PyodideWorkerAPI, model: OpticalModel) => PlotFn>
```

A lookup table mapping each `PlotType` to a curried builder that takes `(proxy, model)` and returns a `PlotFn`.

| PlotType | Proxy call |
|---|---|
| `rayFan` | `proxy.plotRayFan(model, fi)` |
| `opdFan` | `proxy.plotOpdFan(model, fi)` |
| `spotDiagram` | `proxy.plotSpotDiagram(model, fi)` |
| `surfaceBySurface3rdOrder` | `proxy.plotSurfaceBySurface3rdOrderAberr(model)` |
| `wavefrontMap` | `proxy.plotWavefrontMap(model, fi, wi)` |
| `geoPSF` | `proxy.plotGeoPSF(model, fi, wi)` |
| `diffractionPSF` | `proxy.plotDiffractionPSF(model, fi, wi)` |

### `buildPlotFn`

```ts
function buildPlotFn(
  plotType: PlotType,
  proxy: PyodideWorkerAPI | undefined,
  model: OpticalModel | undefined
): PlotFn | undefined
```

Convenience wrapper around `PLOT_FUNCTION_BUILDERS`. Returns `undefined` if `proxy` or `model` is absent; otherwise delegates to the appropriate builder.

## Dependencies

- `PlotType` (type-only) from `@/features/analysis/components/AnalysisPlotView`
- `OpticalModel` (type-only) from `@/shared/lib/types/opticalModel`
- `PyodideWorkerAPI` (type-only) from `@/hooks/usePyodide`

## Usages

```tsx
import { buildPlotFn } from "@/shared/lib/utils/plotFunctions";
import type { PlotType } from "@/features/analysis/components/AnalysisPlotView";

// In a plot rendering component
function AnalysisPlotView({
  plotType,
  proxy,
  model,
}: {
  plotType: PlotType;
  proxy: PyodideWorkerAPI | undefined;
  model: OpticalModel | undefined;
}) {
  const [image, setImage] = useState<string>();

  // Build the appropriate plot function
  const plotFn = buildPlotFn(plotType, proxy, model);

  const handleRenderPlot = async () => {
    if (!plotFn) {
      console.log("Worker not ready or invalid inputs");
      return;
    }

    // Call the plot function with field and wavelength indices
    const base64Image = await plotFn(0, 0);
    setImage(base64Image);
  };

  return (
    <div>
      <button onClick={handleRenderPlot}>Render {plotType}</button>
      {image && <img src={`data:image/png;base64,${image}`} />}
    </div>
  );
}
```

- Used in `app/page.tsx` to obtain plot function after "Update System".
- Used in `AnalysisPlotContainer.tsx` when field/wavelength/plot-type changes.
