# `features/analysis/lib/plotFunctions.ts`

## Purpose

Shared utility that maps `PlotType` values to Pyodide worker proxy calls and commits typed plot load results into the analysis plot store. Eliminates duplication between `LensEditor.tsx`, `applyExampleSystem.ts`, and `AnalysisPlotContainer.tsx`.

## Exports

### `AnalysisPlotLoadResult`

```ts
type AnalysisPlotLoadResult =
  | { kind: "surfaceBySurface3rdOrder"; surfaceBySurface3rdOrderData: SeidelSurfaceBySurfaceData }
  | { kind: "rayFan"; rayFanData: RayFanData }
  | { kind: "opdFan"; opdFanData: OpdFanData }
  | { kind: "spotDiagram"; spotDiagramData: SpotDiagramData }
  | { kind: "geoPSF"; geoPsfData: GeoPsfData }
  | { kind: "wavefrontMap"; wavefrontMapData: WavefrontMapData }
  | { kind: "diffractionPSF"; diffractionPsfData: DiffractionPsfData }
  | { kind: "diffractionMTF"; diffractionMtfData: DiffractionMtfData };
```

Discriminated result returned by the shared analysis-plot loader. It makes the worker-call branching explicit so callers can store typed chart data without duplicating plot-type conditionals.

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
- Calls `proxy.get3rdOrderSeidelData(model)` for `surfaceBySurface3rdOrder` and returns `surfaceBySurface`.
- Calls `proxy.getOpdFanData(model, fi)` for `opdFan`.
- Calls `proxy.getSpotDiagramData(model, fi)` for `spotDiagram`.
- Calls `proxy.getWavefrontData(...)` for `wavefrontMap`.
- Calls `proxy.getGeoPSFData(...)` for `geoPSF`.
- Calls `proxy.getDiffractionPSFData(...)` for `diffractionPSF`.
- Calls `proxy.getDiffractionMTFData(...)` for `diffractionMTF`.
- Centralizes the plot-type to worker-API mapping so submit-time updates and in-panel plot changes stay consistent.

### `commitAnalysisPlotResult`

```ts
function commitAnalysisPlotResult(
  plotResult: AnalysisPlotLoadResult | undefined,
  analysisPlotStore: StoreApi<AnalysisPlotState>,
): void
```

Commits a loaded analysis plot payload to the matching `AnalysisPlotState` setter.

- No-ops when `plotResult` is `undefined`.
- No-ops for `"surfaceBySurface3rdOrder"` because Seidel surface-by-surface data is committed through `AnalysisDataState`.
- Calls the matching plot-store setter for `"rayFan"`, `"opdFan"`, `"spotDiagram"`, `"geoPSF"`, `"wavefrontMap"`, `"diffractionPSF"`, and `"diffractionMTF"`.
- Uses an exhaustive `switch` so future `AnalysisPlotLoadResult` variants must be handled explicitly.

## Dependencies

- `OpticalModel` (type-only) from `@/shared/lib/types/opticalModel`
- `PlotType` (type-only) from `@/features/analysis/components`
- `RayFanData`, `DiffractionPsfData`, `DiffractionMtfData`, and `WavefrontMapData` (type-only) from `@/features/analysis/types/plotData`
- `SeidelSurfaceBySurfaceData` (type-only) from `@/features/lens-editor/types/seidelData`
- `PyodideWorkerAPI` (type-only) from `@/shared/hooks/usePyodide`
- `StoreApi` (type-only) from `zustand`
- `AnalysisPlotState` (type-only) from `@/features/analysis/stores/analysisPlotStore`

- Used in `LensEditor.tsx` after "Update System" completes.
- Used in `applyExampleSystem.ts` after bundled example-system computation completes.
- Used in `AnalysisPlotContainer.tsx` when field/wavelength/plot-type changes.
- `loadAnalysisPlot(...)` is the preferred API for any code path that needs the correct worker call for every `PlotType`.
- `commitAnalysisPlotResult(...)` is the preferred API for storing every plot-store-backed `AnalysisPlotLoadResult`.
