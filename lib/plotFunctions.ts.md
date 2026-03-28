# `lib/plotFunctions.ts`

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

- `PlotType` (type-only) from `@/components/composite/AnalysisPlotView`
- `OpticalModel` (type-only) from `@/lib/opticalModel`
- `PyodideWorkerAPI` (type-only) from `@/hooks/usePyodide`

## Usages

- `app/page.tsx` — called in `handleSubmit` to obtain the plot function for the initial render after "Update System".
- `components/container/AnalysisPlotContainer.tsx` — called in `handleFieldChange`, `handleWavelengthChange`, and `handlePlotTypeChange`.
