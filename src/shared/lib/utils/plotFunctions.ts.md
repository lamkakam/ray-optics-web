# `shared/lib/utils/plotFunctions.ts`

## Purpose

Shared utility that maps `PlotType` values to Pyodide worker proxy calls. Eliminates duplication between `LensEditor.tsx` and `AnalysisPlotContainer.tsx`.

## Exports

### `PlotFn`

```ts
type PlotFn = (fieldIndex: number, wavelengthIndex: number) => Promise<string>;
```

A unified function signature for all plot types. `fieldIndex` and `wavelengthIndex` are always passed; implementations that don't need them simply ignore the unused parameter.

### `AnalysisPlotLoadResult`

```ts
type AnalysisPlotLoadResult =
  | { kind: "image"; image: string }
  | { kind: "rayFan"; rayFanData: RayFanData }
  | { kind: "opdFan"; opdFanData: OpdFanData }
  | { kind: "spotDiagram"; spotDiagramData: SpotDiagramData }
  | { kind: "geoPSF"; geoPsfData: GeoPsfData }
  | { kind: "wavefrontMap"; wavefrontMapData: WavefrontMapData }
  | { kind: "diffractionPSF"; diffractionPsfData: DiffractionPsfData };
```

Discriminated result returned by the shared analysis-plot loader. It makes the worker-call branching explicit so callers can store either a base64 PNG or typed chart data without duplicating plot-type conditionals.

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
| `wavefrontMap` | Throws; the analysis container must use `proxy.getWavefrontData(model, fi, wi)` instead of the generic PNG path |
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

### `loadAnalysisPlot`

```ts
async function loadAnalysisPlot({
  plotType,
  proxy,
  model,
  fieldIndex,
  wavelengthIndex,
}: {
  plotType: PlotType;
  proxy: PyodideWorkerAPI | undefined;
  model: OpticalModel | undefined;
  fieldIndex: number;
  wavelengthIndex: number;
}): Promise<AnalysisPlotLoadResult | undefined>
```

Shared async loader used by both `LensEditor.tsx` and `AnalysisPlotContainer.tsx`.

- Returns `undefined` when `proxy` or `model` is missing.
- Calls `proxy.getRayFanData(model, fi)` for `rayFan`.
- Calls `proxy.getOpdFanData(model, fi)` for `opdFan`.
- Calls `proxy.getSpotDiagramData(model, fi)` for `spotDiagram`.
- Calls `proxy.getWavefrontData(...)` for `wavefrontMap`.
- Calls `proxy.getGeoPSFData(...)` for `geoPSF`.
- Calls `proxy.getDiffractionPSFData(...)` for `diffractionPSF`.
- Uses `buildPlotFn(...)` only for PNG-backed plot types and returns `{ kind: "image", image }`. `rayFan` is intentionally not part of that PNG path anymore even though `buildPlotFn("rayFan", ...)` still exists for compatibility.
- Centralizes the plot-type to worker-API mapping so submit-time updates and in-panel plot changes stay consistent.

## Dependencies

- `PlotType` (type-only) from `@/features/analysis/components/AnalysisPlotView`
- `OpticalModel` (type-only) from `@/shared/lib/types/opticalModel`
- `RayFanData`, `DiffractionPsfData`, and `WavefrontMapData` (type-only) from `@/shared/lib/types/opticalModel`
- `PyodideWorkerAPI` (type-only) from `@/shared/hooks/usePyodide`

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

- Used in `LensEditor.tsx` after "Update System" completes.
- Used in `AnalysisPlotContainer.tsx` when field/wavelength/plot-type changes.
- `loadAnalysisPlot(...)` is the preferred API for any code path that needs the correct worker call for every `PlotType`, including typed-data chart modes.
