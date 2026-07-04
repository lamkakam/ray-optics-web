# `workers/pyodide.worker.ts`

## Purpose

Pyodide module worker that runs RayOptics computations off the main thread. Loads Pyodide v314.0.0, installs `rayoptics_web_utils` (internal Python package in `python/`), `rayoptics` and supporting packages, and exposes a typed API to React components via Comlink. This Pyodide web worker is long living.

Each exported function (except `init`) is **stateless**: it receives an `OpticalModel`, builds the Python `opm` locally in a single `runPython` call (using `buildScript` from `lib/pythonScript`), runs the computation, and returns the result. No global optical-model state persists between calls.

## Exports

### Public API (Comlink)

```ts
interface InitProgress {
  readonly value: number;
  readonly status: string;
}

export async function init(onProgress?: (progress: InitProgress) => void | Promise<void>): Promise<void>
export async function getFirstOrderData(opticalModel: OpticalModel): Promise<Record<string, number>>
export async function plotLensLayout(opticalModel: OpticalModel, isDark: boolean): Promise<string>
export async function getRayFanData(opticalModel: OpticalModel, fieldIndex: number, imagePoint?: ImagePoint): Promise<RayFanData>
export async function getOpdFanData(opticalModel: OpticalModel, fieldIndex: number, imagePoint?: ImagePoint): Promise<OpdFanData>
export async function getSpotDiagramData(opticalModel: OpticalModel, fieldIndex: number): Promise<SpotDiagramData>
export async function getFieldCurvatureData(opticalModel: OpticalModel, wavelengthIndex: number): Promise<FieldCurveData>
export async function getAstigmatismCurveData(opticalModel: OpticalModel, wavelengthIndex: number): Promise<AstigmatismCurveData>
export async function getLSAData(opticalModel: OpticalModel): Promise<LongitudinalSphericalAberrationData>
export async function getWavefrontData(opticalModel: OpticalModel, fieldIndex: number, wavelengthIndex: number, imagePoint?: ImagePoint, numRays?: number): Promise<WavefrontMapData>
export async function getStrehlVsWavelengthData(opticalModel: OpticalModel, fieldIndex: number, imagePoint?: ImagePoint, wavelengthSamples?: number, numRays?: number): Promise<StrehlVsWavelengthData>
export async function getGeoPSFData(opticalModel: OpticalModel, fieldIndex: number, wavelengthIndex: number, numRays?: number): Promise<GeoPsfData>
export async function getDiffractionPSFData(opticalModel: OpticalModel, fieldIndex: number, wavelengthIndex: number, imagePoint?: ImagePoint, numRays?: number, maxDims?: number): Promise<DiffractionPsfData>
export async function getDiffractionMTFData(opticalModel: OpticalModel, fieldIndex: number, wavelengthIndex: number, imagePoint?: ImagePoint, numRays?: number, maxDims?: number): Promise<DiffractionMtfData>
export async function get3rdOrderSeidelData(opticalModel: OpticalModel): Promise<SeidelData>
export async function getZernikeCoefficients(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, imagePoint?: ImagePoint, numTerms?: number, ordering?: ZernikeOrdering): Promise<ZernikeData>
export async function focusByMonoRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>
export async function focusByMonoStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>
export async function focusByPolyRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>
export async function focusByPolyStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>
export async function getAllGlassCatalogsData(): Promise<CompleteGlassCatalogsData>
export async function addUserDefinedGlasses(materials: readonly UserDefinedGlassInput[]): Promise<UserDefinedMaterialsData>
export async function deleteUserDefinedGlasses(names: readonly string[]): Promise<void>
export async function updateUserDefinedGlasses(materials: readonly UserDefinedGlassInput[]): Promise<UserDefinedMaterialsData>
export async function getUserDefinedGlasses(names: readonly string[]): Promise<UserDefinedMaterialsData>
export async function canInterruptOptimization(): Promise<boolean>
export async function requestOptimizationStop(runId: string): Promise<{ readonly signaled: boolean }>
export async function evaluateOptimizationProblem(opticalModel: OpticalModel, config: OptimizationConfig, imagePoint?: ImagePoint): Promise<OptimizationReport>
export async function optimizeOpm(
  opticalModel: OpticalModel,
  config: OptimizationConfig,
  imagePoint?: ImagePoint,
  onProgress?: (progress: ReadonlyArray<OptimizationProgressEntry>) => void | Promise<void>,
  runId?: string,
  interruptBuffer?: SharedArrayBuffer,
): Promise<OptimizationReport>
```

### Injectable Variants (for testing)

```ts
export async function _init(
  runPython: (code: string) => Promise<unknown>,
  wheelUrl: string,
  onProgress?: (progress: InitProgress) => void | Promise<void>,
): Promise<void>
export async function _getFirstOrderData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<Record<string, number>>
export async function _plotLensLayout(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, isDark: boolean): Promise<string>
export async function _getRayFanData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number, imagePoint?: ImagePoint): Promise<RayFanData>
export async function _getOpdFanData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<OpdFanData>
export async function _getSpotDiagramData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<SpotDiagramData>
export async function _getFieldCurvatureData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, wavelengthIndex: number): Promise<FieldCurveData>
export async function _getAstigmatismCurveData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, wavelengthIndex: number): Promise<AstigmatismCurveData>
export async function _getLSAData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<LongitudinalSphericalAberrationData>
export async function _getWavefrontData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number, wavelengthIndex: number, imagePoint?: ImagePoint, numRays?: number): Promise<WavefrontMapData>
export async function _getStrehlVsWavelengthData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number, imagePoint?: ImagePoint, wavelengthSamples?: number, numRays?: number): Promise<StrehlVsWavelengthData>
export async function _getGeoPSFData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number, wavelengthIndex: number, numRays?: number): Promise<GeoPsfData>
export async function _getDiffractionPSFData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number, wavelengthIndex: number, imagePoint?: ImagePoint, numRays?: number, maxDims?: number): Promise<DiffractionPsfData>
export async function _getDiffractionMTFData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number, wavelengthIndex: number, imagePoint?: ImagePoint, numRays?: number, maxDims?: number): Promise<DiffractionMtfData>
export async function _get3rdOrderSeidelData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<SeidelData>
export async function _getZernikeCoefficients(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, imagePoint?: ImagePoint, numTerms?: number, ordering?: ZernikeOrdering): Promise<ZernikeData>
export async function _focusByMonoRmsSpot(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>
export async function _focusByMonoStrehl(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>
export async function _focusByPolyRmsSpot(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>
export async function _focusByPolyStrehl(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>
export async function _getAllGlassCatalogsData(runPython: (code: string) => Promise<unknown>): Promise<CompleteGlassCatalogsData>
export async function _addUserDefinedGlasses(runPython: (code: string) => Promise<unknown>, materials: readonly UserDefinedGlassInput[]): Promise<UserDefinedMaterialsData>
export async function _deleteUserDefinedGlasses(runPython: (code: string) => Promise<unknown>, names: readonly string[]): Promise<void>
export async function _updateUserDefinedGlasses(runPython: (code: string) => Promise<unknown>, materials: readonly UserDefinedGlassInput[]): Promise<UserDefinedMaterialsData>
export async function _getUserDefinedGlasses(runPython: (code: string) => Promise<unknown>, names: readonly string[]): Promise<UserDefinedMaterialsData>
export async function _evaluateOptimizationProblem(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, config: OptimizationConfig): Promise<OptimizationReport>
export async function _optimizeOpm(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  config: OptimizationConfig,
  imagePoint?: ImagePoint,
  onProgress?: (progress: ReadonlyArray<OptimizationProgressEntry>) => void | Promise<void>,
  runId?: string,
  interruptBuffer?: SharedArrayBuffer,
): Promise<OptimizationReport>
export function _resetPyodideForTesting(): void
export function _setPyodideForTesting(nextPyodide: unknown | undefined): void
export function _getOptimizationInterruptStateForTesting(): { activeRunId?: string; interruptBuffer?: SharedArrayBuffer }
```

## Initialization

`init()` performs the following steps:

1. No-ops if `pyodide` singleton is already set.
2. Emits `0%` with `"Starting worker"`.
3. Emits `10%` with `"Loading Pyodide loader"`. The worker imports `loadPyodide` and `version` from the pinned npm package; it does not use `importScripts`.
4. Emits `25%` with `"Starting Pyodide runtime"`, natively imports `pyodide.asm.mjs` from `https://cdn.jsdelivr.net/pyodide/v314.0.0/full/` with webpack processing disabled, and passes its module factory to `loadPyodide({ indexURL, createPyodideModule })`. This prevents webpack from converting Pyodide's computed CDN import into a local context lookup.
5. Emits `40%` with `"Loading Pyodide packages"` and loads standard packages: `micropip`, `numpy`, `scipy`, `matplotlib`, `pandas`, `xlrd`, `traitlets`, `packaging`, `pyyaml`, `requests`, `deprecation`.
6. Constructs the wheel URL from `self.location.origin` and the `NEXT_PUBLIC_BASE_PATH` env var (defaults to `""`), targeting `rayoptics_web_utils-0.17.0-py3-none-any.whl`.
7. Delegates the rest to `_init(pyodide.runPythonAsync, wheelUrl, onProgress)`.
8. Emits `100%` with `"Ready"`.

`_init(runPython, wheelUrl)` performs three `runPython` calls:

1. Emits `60%` with `"Installing RayOptics packages"` and installs `rayoptics==0.9.8` and `opticalglass==1.1.1` (both with `deps=False` to avoid futile attempts to install Qt related packages).
2. Emits `75%` with `"Installing supporting packages"` and installs supporting packages: `anytree`, `transforms3d`, `json-tricks`, `openpyxl`, `parsimonious`, which are required by `rayoptics` and `opticalglass`.
3. Emits `85%` with `"Loading local wheel and imports"` and installs the local `rayoptics_web_utils` wheel, runs `_rwu_init()` to get the `caf2`, `fused_silica`, `water`, and `d263teco` glass objects, and imports the needed symbols from `rayoptics.environment`, `rayoptics.elem.surface` (`DecenterData`, `Circular`), `rayoptics_web_utils.aperture` (`Annular`, `OffsetCircular`, `OffsetRotatedRectangular`), `rayoptics_web_utils.analysis`, `rayoptics_web_utils.plotting`, `rayoptics_web_utils.focusing`, `rayoptics_web_utils.glass.glass`, and `rayoptics_web_utils.optimization`, including `evaluate_optimization_problem` and `optimize_opm`.

## Public API

All public functions call `requirePyodide()` to obtain `pyodide.runPythonAsync`, then delegate to the corresponding `_*` injectable variant.

| Function | Description |
|---|---|
| `init(onProgress?)` | Initializes Pyodide singleton and optionally emits determinate startup milestones. No-op if already initialized, except it can emit `100%` ready to a supplied callback. |
| `getFirstOrderData(model)` | Builds `opm` from model, returns optical data (EFL, f-number, etc.) as `Record<string, number>`. |
| `plotLensLayout(model, isDark)` | Builds `opm` from model, derives `show_ray_fan_vs_wvls` from any `surface.diffractionGrating`, forwards `is_dark`, and returns a lens layout plot as a base64-encoded PNG string. |
| `getRayFanData(model, fieldIndex, imagePoint?)` | Builds `opm` from model, returns grouped transverse ray-fan line data for all wavelengths at the selected field and image reference. Blocked samples are normalized to `undefined` gaps for ECharts. Used by the ECharts Ray Fan view. |
| `getOpdFanData(model, fieldIndex, imagePoint?)` | Builds `opm` from model, returns grouped OPD-fan line data for all wavelengths at the selected field. Blocked samples are normalized to `undefined` gaps for ECharts. Used by the ECharts OPD Fan view. |
| `getSpotDiagramData(model, fieldIndex, imagePoint?)` | Returns per-wavelength spot-diagram point clouds using `json.dumps(get_spot_data(..., image_point=...))`. Used by the ECharts Spot Diagram view. |
| `getFieldCurvatureData(model, wi)` | Returns `FieldCurveData` with sagittal/tangential focus-shift curves for the selected wavelength. |
| `getAstigmatismCurveData(model, wi)` | Returns `AstigmatismCurveData` with one `Astigmatism` separation curve for the selected wavelength. |
| `getWavefrontData(model, fi, wi, imagePoint?, numRays?)` | Returns `WavefrontMapData` for the given field and wavelength index using `json.dumps(get_wavefront_data(...))`. Used by the deck.gl Wavefront Map view. |
| `getStrehlVsWavelengthData(model, fi, imagePoint?, wavelengthSamples?, numRays?)` | Returns `StrehlVsWavelengthData` for the selected field using `json.dumps(get_strehl_vs_wavelength_data(...))`. Defaults to 100 wavelength samples and 21 rays. Used by the ECharts Strehl vs Wavelength view. |
| `getGeoPSFData(model, fi, wi, numRays?)` | Returns `GeoPsfData` for the given field and wavelength index using `json.dumps(get_geo_psf_data(...))`. Used by the deck.gl Geometric PSF view. |
| `getDiffractionPSFData(model, fi, wi, imagePoint?, numRays?, maxDims?)` | Returns `DiffractionPsfData` for the given field and wavelength index using `json.dumps(get_diffraction_psf_data(...))`. Defaults to 128 rays and `maxDims=1024`, with Python returning the cropped central PSF data. Used by the deck.gl Diffraction PSF view. |
| `getDiffractionMTFData(model, fi, wi, imagePoint?, numRays?, maxDims?)` | Returns `DiffractionMtfData` for the given field and wavelength index using `json.dumps(get_diffraction_mtf_data(...))`. Used by the ECharts Diffraction MTF view. |
| `get3rdOrderSeidelData(model)` | Builds `opm` from model, returns `SeidelData` with 3rd-order Seidel aberration data. |
| `getZernikeCoefficients(model, fi, wi, imagePoint?, n?, ordering?)` | Builds `opm` from model, converts `ordering`/`numTerms` to an explicit `(n, m)` term list in TypeScript, and returns `ZernikeData`. `numTerms` defaults to 37 and `ordering` defaults to `"noll"`. |
| `focusByMonoRmsSpot(model, fieldIndex)` | Focuses by minimizing monochromatic RMS spot radius. Returns `FocusingResult` with `delta_thi` and `metric_value`. |
| `focusByMonoStrehl(model, fieldIndex)` | Focuses by maximizing monochromatic Strehl ratio. Returns `FocusingResult`. |
| `focusByPolyRmsSpot(model, fieldIndex)` | Focuses by minimizing polychromatic RMS spot radius. Returns `FocusingResult`. |
| `focusByPolyStrehl(model, fieldIndex)` | Focuses by maximizing polychromatic Strehl ratio. Returns `FocusingResult`. |
| `getAllGlassCatalogsData()` | Returns glass catalog data for all 6 catalogs as `AllGlassCatalogsData`. No optical model required. |
| `addUserDefinedGlasses(materials)` | Adds user-defined tabulated materials through the Python `user_defined_materials` singleton after pre-validating existing names. Returns the bare material map for added names using NumPy-safe JSON serialization. |
| `deleteUserDefinedGlasses(names)` | Deletes user-defined materials after pre-validating missing names. Resolves with no payload. |
| `updateUserDefinedGlasses(materials)` | Replaces existing user-defined materials after pre-validating missing names. Deletes each existing entry, sets the replacement pairs, and returns the bare material map for updated names using NumPy-safe JSON serialization. |
| `getUserDefinedGlasses(names)` | Returns the bare material map from `user_defined_materials.get_materials_data(names)` using NumPy-safe JSON serialization. Missing names propagate Python `KeyError`. |
| `canInterruptOptimization()` | Returns whether the initialized Pyodide instance exposes `setInterruptBuffer` and the browser exposes `SharedArrayBuffer`. |
| `requestOptimizationStop(runId)` | Signals the active interrupt buffer only when `runId` matches the currently active optimization run; returns `{ signaled: false }` for late or stale requests. |
| `evaluateOptimizationProblem(model, config, imagePoint?)` | Builds `opm` from the model, calls Python `evaluate_optimization_problem(opm, config, image_point=...)`, and returns the parsed JSON-safe residual report without running SciPy. |
| `optimizeOpm(model, config, imagePoint?, onProgress?, runId?, interruptBuffer?)` | Builds `opm` from the model, optionally bridges a streamed progress callback into Python, optionally installs a per-run Pyodide interrupt buffer, calls `optimize_opm(opm, config, image_point=..., ...)`, and returns the parsed JSON-safe optimization report. |

## Injectable Variants (for testing)

Each public function has a corresponding `_*` variant that accepts `runPython` as an explicit first argument instead of relying on the singleton. This enables unit tests to inject a mock `runPython` without loading Pyodide.

Each `_*` variant (except `_init`) calls `buildScript(opticalModel, computation)` to produce a combined Python script (model-build wrapped in `def _build_opm():` + computation using `_build_opm()`) and runs it in a single `runPython` call.

- `_init(runPython, wheelUrl, onProgress?)` — full package installation sequence with package-install progress milestones.
- `_getFirstOrderData(runPython, model)` — runs `buildScript(model, (opm) => \`json.dumps(get_first_order_data(${opm}))\`)`.
- `_plotLensLayout(runPython, model, isDark)` — checks `model.surfaces` for any `diffractionGrating` and runs `buildScript(model, (opm) => \`plot_lens_layout(${opm}, show_ray_fan_vs_wvls=..., is_dark=...)\`)`.
- `_getRayFanData(runPython, model, fieldIndex, imagePoint?)` — runs `buildScript(model, (opm) => \`json.dumps(get_ray_fan_data(${opm}, ${fieldIndex}, image_point=...))\`)`, parses the JSON, and normalizes JSON `null` fan ordinates to `undefined` gaps.
- `_getOpdFanData(runPython, model, fieldIndex, imagePoint?)` — runs `buildScript(model, (opm) => \`json.dumps(get_opd_fan_data(${opm}, ${fieldIndex}, image_point=...))\`)`, parses the JSON, and normalizes JSON `null` fan ordinates to `undefined` gaps.
- `_getSpotDiagramData(runPython, model, fieldIndex, imagePoint?)` — runs `buildScript(model, (opm) => \`json.dumps(get_spot_data(${opm}, ${fieldIndex}, image_point=...))\`)` and parses the JSON into `SpotDiagramData`.
- `_getFieldCurvatureData(runPython, model, wi)` — runs `buildScript(model, (opm) => \`json.dumps(get_field_curvature_data(${opm}, ${wi}))\`)` and parses the JSON into `FieldCurveData`.
- `_getAstigmatismCurveData(runPython, model, wi)` — runs `buildScript(model, (opm) => \`json.dumps(get_astigmatism_curve_data(${opm}, ${wi}))\`)` and parses the JSON into `AstigmatismCurveData`.
- `_getLSAData(runPython, model)` — runs `buildScript(model, (opm) => \`json.dumps(get_lsa_data(${opm}))\`)` and parses all wavelength series into `LongitudinalSphericalAberrationData`.
- `_getStrehlVsWavelengthData(runPython, model, fi, imagePoint?, wavelengthSamples?, numRays?)` — runs `buildScript(model, (opm) => \`json.dumps(get_strehl_vs_wavelength_data(${opm}, ${fi}, wavelength_samples=${wavelengthSamples}, num_rays=${numRays}, image_point=...))\`)` and parses the JSON into `StrehlVsWavelengthData`.
- `_getGeoPSFData(runPython, model, fi, wi, numRays?)` — runs `buildScript(model, (opm) => \`json.dumps(get_geo_psf_data(${opm}, ${fi}, ${wi}, num_rays=${numRays}))\`)` and parses the JSON into `GeoPsfData`.
- `_getDiffractionPSFData(runPython, model, fi, wi, imagePoint?, numRays?, maxDims?)` — runs `buildScript(model, (opm) => \`json.dumps(get_diffraction_psf_data(${opm}, ${fi}, ${wi}, num_rays=${numRays}, max_dims=${maxDims}, image_point=...))\`)` and parses the JSON into `DiffractionPsfData`; the public wrapper defaults diffraction PSF calls to `numRays=128` and `maxDims=1024`.
- `_getDiffractionMTFData(runPython, model, fi, wi, imagePoint?, numRays?, maxDims?)` — runs `buildScript(model, (opm) => \`json.dumps(get_diffraction_mtf_data(${opm}, ${fi}, ${wi}, num_rays=${numRays}, max_dims=${maxDims}, image_point=...))\`)` and parses the JSON into `DiffractionMtfData`.
- `_get3rdOrderSeidelData(runPython, model)` — runs `buildScript(model, (opm) => \`json.dumps(get_3rd_order_seidel_data(${opm}))\`)`.
- `_getZernikeCoefficients(runPython, model, fi, wi, imagePoint?, n?, ordering?)` — computes `zernikeTermsForOrdering(ordering, numTerms)`, reconstructs it in Python with `json.loads(...)`, and calls `get_zernike_coefficients(..., zernike_terms=zernike_terms, image_point=...)`. Python does not receive an ordering name.
- `_addUserDefinedGlasses(runPython, materials)` — reconstructs the material request with `json.loads(...)`, pre-validates existing names, sets `user_defined_materials[name] = pairs`, and parses `json.dumps(user_defined_materials.get_materials_data(names), default=_json_default)`.
- `_deleteUserDefinedGlasses(runPython, names)` — reconstructs names with `json.loads(...)`, pre-validates missing names, then deletes each entry with `del user_defined_materials[name]`. It does not parse or return a Python payload.
- `_updateUserDefinedGlasses(runPython, materials)` — reconstructs the material request with `json.loads(...)`, pre-validates missing names, deletes and re-sets each material, and parses `json.dumps(user_defined_materials.get_materials_data(names), default=_json_default)`.
- `_getUserDefinedGlasses(runPython, names)` — reconstructs names with `json.loads(...)`, calls `user_defined_materials.get_materials_data(names)`, and parses the bare material map through `json.dumps(..., default=_json_default)`.
- `_evaluateOptimizationProblem(runPython, model, config, imagePoint?)` — serializes `config` with `JSON.stringify`, reconstructs it with `json.loads(...)` inside the generated Python script, runs `evaluate_optimization_problem(..., image_point=...)`, and parses the returned report.
- `_optimizeOpm(runPython, model, config, imagePoint?, onProgress?, runId?, interruptBuffer?)` — serializes `config` with `JSON.stringify`, reconstructs it with `json.loads(...)` inside the generated Python script, and when a live callback is available binds `_optimization_progress_callback` through `pyodide.globals` so Python can push JSON snapshots back to JS while `optimize_opm(..., image_point=...)` is still running. When `runId`, `interruptBuffer`, and `pyodide.setInterruptBuffer` are available, it creates an `Int32Array` view over the buffer, resets the first cell, stores the active run id, installs the typed view before the Python call, and clears all interrupt state in `finally`.
- `_resetPyodideForTesting()` — sets `pyodide = null` and clears optimization interrupt state to allow `init()` to be re-exercised in tests.
- `_setPyodideForTesting(...)` and `_getOptimizationInterruptStateForTesting()` are test-only helpers for interrupt lifecycle coverage.

## Key Conventions

- **Singleton `pyodide`**: `init()` is a no-op if the singleton is already set.
- **`requirePyodide()` guard**: All public functions call this helper. It throws `"Pyodide not initialized. Call init() first."` if `pyodide` is `null`.
- **Stateless**: Each computation function builds `opm` locally from the received `OpticalModel` within a single `runPython` call. No global `opm` state persists between calls.
- **Optimization progress bridging**: `_optimizeOpm(...)` is the only exception to the fully fire-and-return pattern; when a progress callback is supplied, it temporarily installs `_optimization_progress_callback` in Pyodide globals for that single optimization call and removes it in `finally`.
- **Optimization stop signaling**: stoppable runs are identified by a per-run string id and a shared interrupt buffer. `_optimizeOpm(...)` installs the buffer only for the matching active run and clears it in `finally` for success, stopped, failed, and thrown-error paths. `requestOptimizationStop(...)` is idempotent and returns a no-op result for stale or late run ids.
- **Plot return type**: `plotLensLayout` returns a `string` (base64-encoded image), while `getRayFanData`, `getOpdFanData`, `getSpotDiagramData`, `getFieldCurvatureData`, `getAstigmatismCurveData`, `getLSAData`, `getWavefrontData`, `getStrehlVsWavelengthData`, `getGeoPSFData`, `getDiffractionPSFData`, and `getDiffractionMTFData` return typed data for frontend rendering.
- **Custom material globals**: `_init()` binds `caf2`, `fused_silica`, `water`, `d263teco`, and `user_defined_materials` from `_rwu_init()` so worker-side Python scripts can reference the same runtime materials loaded by `rayoptics_web_utils.env.init()`.
- **User-defined materials**: Add/update pre-validate existence before mutating the Python singleton; delete pre-validates missing names. Add/update/get return `UserDefinedMaterialsData`, a bare `{ glassName: rawGlassData }` map with `"tabulated"` dispersion data. The worker readback snippets define `_json_default` so NumPy arrays and scalar values from `InterpolatedMedium` are serialized through `.tolist()` / `.item()` rather than failing plain `json.dumps`.
- **Offset aperture globals**: `_init()` imports `OffsetCircular` from `rayoptics_web_utils.aperture` so generated worker-side scripts can use offset-aware circular aperture edge targets.

## Edge Cases / Error Handling

- `init()` sets `pyodide = null` and re-throws on any failure, so a failed init can be retried.
- `NEXT_PUBLIC_BASE_PATH` env var is used to prefix the wheel URL path; defaults to `""` when not set.
- Pyodide is pinned to **v314.0.0**. The npm package supplies the bundled loader and its exported `version` builds the matching jsDelivr runtime URL.
- `_init` is marked as a "dangerous zone" in comments — package versions are pinned and must not be changed without careful testing.

## Dependencies

- `comlink` — `expose()` to register the worker API.
- `shared/lib/types/opticalModel` — `OpticalModel` (type only).
- `features/lens-editor/types/focusingResult` — `FocusingResult` (type only).
- `features/lens-editor/types/seidelData` — `SeidelData` (type only).
- `features/lens-editor/types/zernikeData` — `ZernikeData` and `ZernikeOrdering` (type only).
- `features/lens-editor/lib/zernikeData` — `zernikeTermsForOrdering`, the TypeScript-owned Noll/Fringe term-list generator.
- `lib/pythonScript` — `buildScript` (generates the combined model-build + computation Python script).
- `features/glass-map/types/glassMap` — catalog and user-defined glass data types plus `UserDefinedGlassInput` (type only).
- `features/optimization/types/optimizationWorkerTypes` — optimization config, report, and progress types (type only).

## Usages

The worker is accessed via the `usePyodide` hook (see `hooks/usePyodide.ts.md`):

```tsx
"use client";

import { usePyodide } from "@/shared/hooks/usePyodide";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

export function AnalysisPanel({ opticalModel }: { opticalModel: OpticalModel }) {
  const { proxy, isReady, error } = usePyodide();

  const handleComputeLayout = async () => {
    if (!proxy) return;

    // Call a worker function
    const layoutBase64 = await proxy.plotLensLayout(opticalModel, false);
    console.log("Lens layout image:", layoutBase64);

    // Get first-order data
    const firstOrder = await proxy.getFirstOrderData(opticalModel);
    console.log("EFL:", firstOrder.EFL);

    // Get Seidel aberrations
    const seidel = await proxy.get3rdOrderSeidelData(opticalModel);
    console.log("Seidel data:", seidel);
  };

  if (!isReady) return <div>Loading Pyodide...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <button onClick={handleComputeLayout}>
      Compute Analysis
    </button>
  );
}
```

The worker is instantiated as a singleton by `hooks/usePyodide.ts` via Comlink RPC.
