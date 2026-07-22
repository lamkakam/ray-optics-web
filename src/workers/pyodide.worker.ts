/**
Pyodide module worker that runs RayOptics computations off the main thread. Loads Pyodide v314.0.0, installs `rayoptics_web_utils` (internal Python package in `python/`), `rayoptics` and supporting packages, and exposes a typed API to React components via Comlink. This Pyodide web worker is long living.

Each exported function (except `init`) is **stateless**: it receives an `OpticalModel`, builds the Python `opm` locally in a single `runPython` call (using `buildScript` from `lib/pythonScript`), runs the computation, and returns the result. No global optical-model state persists between calls.

## Initialization

`init()` performs the following steps:

1. No-ops if `pyodide` singleton is already set.
2. Emits `0%` with `"Starting worker"`.
3. Emits `10%` with `"Loading Pyodide loader"`. The worker imports `loadPyodide` and `version` from the pinned npm package; it does not use `importScripts`.
4. Emits `25%` with `"Starting Pyodide runtime"`, natively imports `pyodide.asm.mjs` from `https://cdn.jsdelivr.net/pyodide/v314.0.0/full/` with webpack processing disabled, and passes its module factory to `loadPyodide({ indexURL, createPyodideModule })`. This prevents webpack from converting Pyodide's computed CDN import into a local context lookup.
5. Emits `40%` with `"Loading Pyodide packages"` and loads standard packages: `micropip`, `numpy`, `scipy`, `matplotlib`, `pandas`, `xlrd`, `traitlets`, `packaging`, `pyyaml`, `requests`, `deprecation`.
6. Constructs the wheel URL from `self.location.origin` and the `NEXT_PUBLIC_BASE_PATH` env var (defaults to `""`), targeting `rayoptics_web_utils-0.22.0-py3-none-any.whl`.

The public API includes `getSurfaceSemiDiameters(model)`, which builds and updates the model, invokes the Python helper, and parses the ordered JSON array.
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

The worker is instantiated as a singleton by `hooks/usePyodide.ts` via Comlink RPC.
*/
import { expose } from "comlink";
import { loadPyodide, version } from "pyodide";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { FocusingResult } from "@/features/lens-editor/types/focusingResult";
import type { AstigmatismCurveData, DiffractionMtfData, DiffractionPsfData, FieldCurveData, GeoPsfData, LongitudinalSphericalAberrationData, OpdFanData, RayFanData, SpotDiagramData, StrehlVsWavelengthData, WavefrontMapData } from "@/features/analysis/types/plotData";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import {
  type OptimizationConfig,
  type OptimizationProgressEntry,
  type OptimizationReport,
} from "@/features/optimization/types/optimizationWorkerTypes";
import { type ZernikeData, type ZernikeOrdering } from "@/features/lens-editor/types/zernikeData";
import { zernikeTermsForOrdering } from "@/features/lens-editor/lib/zernikeData";
import { buildScript } from "@/shared/lib/utils/pythonScript";
import {
  type AllGlassCatalogsData,
  type CompleteGlassCatalogsData,
  type UserDefinedMaterialsData,
  type UserDefinedGlassInput,
} from "@/features/glass-map/types/glassMap";
import type { InitProgress } from "@/shared/hooks/usePyodide";
import type { ImagePoint } from "@/shared/components/providers/ImagePointProvider";
import { loadPyodideModule } from "@/workers/loadPyodideModule";

const CDN = `https://cdn.jsdelivr.net/pyodide/v${version}/full`;

let pyodide: any = null;
let activeOptimizationRunId: string | undefined;
let activeOptimizationInterruptBuffer: SharedArrayBuffer | undefined;
let activeOptimizationInterruptView: Int32Array | undefined;

const PYODIDE_INTERRUPT_SIGNAL = 2;
const USER_DEFINED_MATERIALS_JSON_DEFAULT = `
def _json_default(value):
    if hasattr(value, "tolist"):
        return value.tolist()
    if hasattr(value, "item"):
        return value.item()
    raise TypeError(f"Object of type {value.__class__.__name__} is not JSON serializable")
`;

type InitProgressCallback = (progress: InitProgress) => void | Promise<void>;
type RawFanAxisData = {
  readonly x: number[];
  readonly y: ReadonlyArray<number | null | undefined>;
};
type RawFanSeriesData = {
  readonly fieldIdx: number;
  readonly wvlIdx: number;
  readonly Sagittal: RawFanAxisData;
  readonly Tangential: RawFanAxisData;
  readonly unitX: string;
  readonly unitY: string;
};

async function emitInitProgress(
  onProgress: InitProgressCallback | undefined,
  value: number,
  status: string,
): Promise<void> {
  await onProgress?.({ value, status });
}

/** For testing only — resets the singleton so init() can be re-tested. */
export function _resetPyodideForTesting(): void {
  pyodide = null;
  activeOptimizationRunId = undefined;
  activeOptimizationInterruptBuffer = undefined;
  activeOptimizationInterruptView = undefined;
}

export function _setPyodideForTesting(nextPyodide: any | undefined): void {
  pyodide = nextPyodide ?? null;
  activeOptimizationRunId = undefined;
  activeOptimizationInterruptBuffer = undefined;
  activeOptimizationInterruptView = undefined;
}

export function _getOptimizationInterruptStateForTesting(): {
  readonly activeRunId: string | undefined;
  readonly interruptBuffer: SharedArrayBuffer | undefined;
} {
  return {
    activeRunId: activeOptimizationRunId,
    interruptBuffer: activeOptimizationInterruptBuffer,
  };
}

// ─── DANGEROUS ZONE ────────────────────────────────────────────────────────────────────
// WARNING: DON'T TOUCH THIS PART UNLESS YOU KNOW WHAT YOU ARE DOING

// export for testing
export async function _init(
  runPython: (code: string) => Promise<unknown>,
  wheelUrl: string,
  onProgress?: InitProgressCallback,
): Promise<void> {
  await emitInitProgress(onProgress, 60, "Installing RayOptics packages");
  await runPython(`
import micropip
await micropip.install("rayoptics==0.9.8", deps=False)
await micropip.install("opticalglass==1.1.1", deps=False)
`);

  await emitInitProgress(onProgress, 75, "Installing supporting packages");
  await runPython(`
import micropip
await micropip.install([
    'anytree==2.13.0',
    'transforms3d==0.4.2',
    'json-tricks==3.17.3',
    'openpyxl==3.1.5',
    'parsimonious==0.10.0',
])
`);

  await emitInitProgress(onProgress, 85, "Loading local wheel and imports");
  await runPython(`
import micropip
await micropip.install("${wheelUrl}", deps=False)
from rayoptics_web_utils import init as _rwu_init
_rwu_init_result = _rwu_init()
caf2 = _rwu_init_result['caf2']
fused_silica = _rwu_init_result['fused_silica']
water = _rwu_init_result['water']
d263teco = _rwu_init_result['d263teco']

user_defined_materials = _rwu_init_result['user_defined']

import json
from rayoptics.environment import *
from rayoptics.raytr.vigcalc import set_vig
from rayoptics.elem.surface import DecenterData, Circular
from rayoptics.elem.profiles import XToroid, YToroid
from rayoptics.seq.medium import decode_medium

from rayoptics_web_utils.aperture import Annular, OffsetCircular, OffsetRotatedRectangular
from rayoptics_web_utils.analysis import get_first_order_data, get_3rd_order_seidel_data, get_ray_fan_data, get_opd_fan_data, get_spot_data, get_wavefront_data, get_strehl_vs_wavelength_data, get_geo_psf_data, get_diffraction_psf_data, get_diffraction_mtf_data, get_field_curvature_data, get_astigmatism_curve_data, get_lsa_data, get_surface_semi_diameters
from rayoptics_web_utils.plotting import (
    plot_lens_layout,
)
from rayoptics_web_utils.focusing import focus_by_mono_rms_spot, focus_by_mono_strehl, focus_by_poly_rms_spot, focus_by_poly_strehl
from rayoptics_web_utils.glass.glass import get_all_glass_catalogs_data
from rayoptics_web_utils.optimization import evaluate_optimization_problem, optimize_opm
`);
}

export async function init(onProgress?: InitProgressCallback): Promise<void> {
  if (pyodide) {
    await emitInitProgress(onProgress, 100, "Ready");
    return;
  }
  try {
    await emitInitProgress(onProgress, 0, "Starting worker");
    await emitInitProgress(onProgress, 10, "Loading Pyodide loader");
    await emitInitProgress(onProgress, 25, "Starting Pyodide runtime");
    const createPyodideModule = await loadPyodideModule(CDN);
    pyodide = await loadPyodide({
      indexURL: `${CDN}/`,
      createPyodideModule,
    });

    await emitInitProgress(onProgress, 40, "Loading Pyodide packages");
    await pyodide.loadPackage([
      "micropip",
      "numpy",
      "scipy",
      "matplotlib",
      "pandas",
      "xlrd",
      "traitlets",
      "packaging",
      "pyyaml",
      "requests",
      "deprecation",
    ]);

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const wheelUrl = `${self.location.origin}${basePath}/rayoptics_web_utils-0.22.0-py3-none-any.whl`;

    await _init(pyodide.runPythonAsync.bind(pyodide), wheelUrl, onProgress);
    await emitInitProgress(onProgress, 100, "Ready");
  } catch (err) {
    pyodide = null;
    console.error(err);
    throw err;
  }
}

// ─── End of DANGEROUS ZONE ────────────────────────────────────────────────────────────────────

function requirePyodide(): (code: string) => Promise<unknown> {
  if (!pyodide) throw new Error("Pyodide not initialized. Call init() first.");
  return pyodide.runPythonAsync.bind(pyodide);
}

function normalizeFanAxis(axis: RawFanAxisData): {
  readonly x: number[];
  readonly y: Array<number | undefined>;
} {
  return {
    x: axis.x,
    y: axis.y.map((value) => value ?? undefined),
  };
}

function normalizeFanData<TFanData extends RayFanData | OpdFanData>(rawData: RawFanSeriesData[]): TFanData {
  return rawData.map((entry) => ({
    ...entry,
    Sagittal: normalizeFanAxis(entry.Sagittal),
    Tangential: normalizeFanAxis(entry.Tangential),
  })) as TFanData;
}


// ─── Injectable variants for testing ─────────────────────────────────────────

export async function _getFirstOrderData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<Record<string, number>> {
  const json = (await runPython(buildScript(opticalModel, (opm) => `json.dumps(get_first_order_data(${opm}))`))) as string;
  return JSON.parse(json);
}

export async function _getSurfaceSemiDiameters(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
): Promise<number[]> {
  const json = (await runPython(buildScript(
    opticalModel,
    (opm) => `json.dumps(get_surface_semi_diameters(${opm}))`,
  ))) as string;
  return JSON.parse(json) as number[];
}

export async function _plotLensLayout(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  isDark: boolean,
): Promise<string> {
  const showRayFanVsWvls = opticalModel.surfaces.some((surface) => surface.diffractionGrating !== undefined);
  return (await runPython(
    buildScript(
      opticalModel,
      (opm) => `plot_lens_layout(${opm}, show_ray_fan_vs_wvls=${showRayFanVsWvls ? "True" : "False"}, is_dark=${isDark ? "True" : "False"})`,
    ),
  )) as string;
}

export async function _getRayFanData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  imagePoint: ImagePoint = "chief_ray",
): Promise<RayFanData> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(get_ray_fan_data(${opm}, ${fieldIndex}, image_point='${imagePoint}'))`),
  )) as string;
  return normalizeFanData<RayFanData>(JSON.parse(json) as RawFanSeriesData[]);
}

export async function _getOpdFanData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  imagePoint: ImagePoint = "chief_ray",
): Promise<OpdFanData> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(get_opd_fan_data(${opm}, ${fieldIndex}, image_point='${imagePoint}'))`),
  )) as string;
  return normalizeFanData<OpdFanData>(JSON.parse(json) as RawFanSeriesData[]);
}

export async function _getSpotDiagramData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  imagePoint: ImagePoint = "chief_ray",
): Promise<SpotDiagramData> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(get_spot_data(${opm}, ${fieldIndex}, image_point='${imagePoint}'))`),
  )) as string;
  return JSON.parse(json) as SpotDiagramData;
}

export async function _getFieldCurvatureData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  wavelengthIndex: number,
): Promise<FieldCurveData> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(get_field_curvature_data(${opm}, ${wavelengthIndex}))`),
  )) as string;
  return JSON.parse(json) as FieldCurveData;
}

export async function _getAstigmatismCurveData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  wavelengthIndex: number,
): Promise<AstigmatismCurveData> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(get_astigmatism_curve_data(${opm}, ${wavelengthIndex}))`),
  )) as string;
  return JSON.parse(json) as AstigmatismCurveData;
}

export async function _getLSAData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
): Promise<LongitudinalSphericalAberrationData> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(get_lsa_data(${opm}))`),
  )) as string;
  return JSON.parse(json) as LongitudinalSphericalAberrationData;
}

export async function _get3rdOrderSeidelData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<SeidelData> {
  const json = (await runPython(buildScript(opticalModel, (opm) => `json.dumps(get_3rd_order_seidel_data(${opm}))`))) as string;
  return JSON.parse(json) as SeidelData;
}

export async function _getWavefrontData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  imagePoint: ImagePoint = "chief_ray",
  numRays: number = 64,
): Promise<WavefrontMapData> {
  const json = (await runPython(
    buildScript(
      opticalModel,
      (opm) => `json.dumps(get_wavefront_data(${opm}, ${fieldIndex}, ${wavelengthIndex}, num_rays=${numRays}, image_point='${imagePoint}'))`,
    ),
  )) as string;
  const parsed = JSON.parse(json) as {
    fieldIdx: number;
    wvlIdx: number;
    x: number[];
    y: number[];
    z: (number | null)[][];
    unitX: string;
    unitY: string;
    unitZ: string;
  };

  return {
    ...parsed,
    z: parsed.z.map((row) => row.map((value) => value ?? undefined)),
  };
}

export async function _getStrehlVsWavelengthData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  imagePoint: ImagePoint = "chief_ray",
  wavelengthSamples: number = 100,
  numRays: number = 21,
): Promise<StrehlVsWavelengthData> {
  const json = (await runPython(
    buildScript(
      opticalModel,
      (opm) => `json.dumps(get_strehl_vs_wavelength_data(${opm}, ${fieldIndex}, wavelength_samples=${wavelengthSamples}, num_rays=${numRays}, image_point='${imagePoint}'))`,
    ),
  )) as string;
  return JSON.parse(json) as StrehlVsWavelengthData;
}

export async function _getGeoPSFData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 64,
): Promise<GeoPsfData> {
  const json = (await runPython(
    buildScript(
      opticalModel,
      (opm) => `json.dumps(get_geo_psf_data(${opm}, ${fieldIndex}, ${wavelengthIndex}, num_rays=${numRays}))`,
    ),
  )) as string;
  return JSON.parse(json) as GeoPsfData;
}

export async function _getDiffractionPSFData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  imagePoint: ImagePoint = "chief_ray",
  numRays: number = 64,
  maxDims: number = 256,
): Promise<DiffractionPsfData> {
  const json = (await runPython(
    buildScript(
      opticalModel,
      (opm) => `json.dumps(get_diffraction_psf_data(${opm}, ${fieldIndex}, ${wavelengthIndex}, num_rays=${numRays}, max_dims=${maxDims}, image_point='${imagePoint}'))`,
    ),
  )) as string;
  return JSON.parse(json) as DiffractionPsfData;
}

export async function _getDiffractionMTFData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  imagePoint: ImagePoint = "chief_ray",
  numRays: number = 64,
  maxDims: number = 256,
): Promise<DiffractionMtfData> {
  const json = (await runPython(
    buildScript(
      opticalModel,
      (opm) => `json.dumps(get_diffraction_mtf_data(${opm}, ${fieldIndex}, ${wavelengthIndex}, num_rays=${numRays}, max_dims=${maxDims}, image_point='${imagePoint}'))`,
    ),
  )) as string;
  return JSON.parse(json) as DiffractionMtfData;
}

export async function _getZernikeCoefficients(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  wvlIndex: number,
  imagePoint: ImagePoint = "chief_ray",
  numTerms: number = 37,
  ordering: ZernikeOrdering = "noll",
): Promise<ZernikeData> {
  const zernikeTermsJson = JSON.stringify(zernikeTermsForOrdering(ordering, numTerms));
  const json = (await runPython(
    buildScript(
      opticalModel,
      (opm) => `from rayoptics_web_utils.zernike import get_zernike_coefficients\nzernike_terms=json.loads(${JSON.stringify(zernikeTermsJson)})\njson.dumps(get_zernike_coefficients(${opm}, ${fieldIndex}, ${wvlIndex}, zernike_terms=zernike_terms, image_point='${imagePoint}'))`,
    )
  )) as string;
  return JSON.parse(json) as ZernikeData;
}


export async function _focusByMonoRmsSpot(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
): Promise<FocusingResult> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(focus_by_mono_rms_spot(${opm}, field_indices=[${fieldIndex}]))`)
  )) as string;
  return JSON.parse(json) as FocusingResult;
}

export async function _focusByMonoStrehl(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
): Promise<FocusingResult> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(focus_by_mono_strehl(${opm}, field_indices=[${fieldIndex}]))`)
  )) as string;
  return JSON.parse(json) as FocusingResult;
}

export async function _focusByPolyRmsSpot(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
): Promise<FocusingResult> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(focus_by_poly_rms_spot(${opm}, field_indices=[${fieldIndex}]))`)
  )) as string;
  return JSON.parse(json) as FocusingResult;
}

export async function _focusByPolyStrehl(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
): Promise<FocusingResult> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(focus_by_poly_strehl(${opm}, field_indices=[${fieldIndex}]))`)
  )) as string;
  return JSON.parse(json) as FocusingResult;
}

export async function _getAllGlassCatalogsData(
  runPython: (code: string) => Promise<unknown>
): Promise<CompleteGlassCatalogsData> {
  const json = (await runPython(`json.dumps(get_all_glass_catalogs_data())`)) as string;
  return JSON.parse(json) as CompleteGlassCatalogsData;
}

export async function _addUserDefinedGlasses(
  runPython: (code: string) => Promise<unknown>,
  materials: readonly UserDefinedGlassInput[],
): Promise<UserDefinedMaterialsData> {
  const materialsJson = JSON.stringify(materials);
  const json = (await runPython(`
${USER_DEFINED_MATERIALS_JSON_DEFAULT}
materials = json.loads(${JSON.stringify(materialsJson)})
names = [material["name"] for material in materials]
for material in materials:
    name = material["name"]
    if name in user_defined_materials:
        raise ValueError(f"User-defined glass already exists: {name}")
for material in materials:
    name = material["name"]
    pairs = material["pairs"]
    user_defined_materials[name] = pairs
json.dumps(user_defined_materials.get_materials_data(names), default=_json_default)
`)) as string;
  return JSON.parse(json) as UserDefinedMaterialsData;
}

export async function _deleteUserDefinedGlasses(
  runPython: (code: string) => Promise<unknown>,
  names: readonly string[],
): Promise<void> {
  const namesJson = JSON.stringify(names);
  await runPython(`
names = json.loads(${JSON.stringify(namesJson)})
for name in names:
    if name not in user_defined_materials:
        raise KeyError(name)
for name in names:
    del user_defined_materials[name]
`);
}

export async function _updateUserDefinedGlasses(
  runPython: (code: string) => Promise<unknown>,
  materials: readonly UserDefinedGlassInput[],
): Promise<UserDefinedMaterialsData> {
  const materialsJson = JSON.stringify(materials);
  const json = (await runPython(`
${USER_DEFINED_MATERIALS_JSON_DEFAULT}
materials = json.loads(${JSON.stringify(materialsJson)})
names = [material["name"] for material in materials]
for material in materials:
    name = material["name"]
    if name not in user_defined_materials:
        raise KeyError(name)
for material in materials:
    name = material["name"]
    pairs = material["pairs"]
    del user_defined_materials[name]
    user_defined_materials[name] = pairs
json.dumps(user_defined_materials.get_materials_data(names), default=_json_default)
`)) as string;
  return JSON.parse(json) as UserDefinedMaterialsData;
}

export async function _getUserDefinedGlasses(
  runPython: (code: string) => Promise<unknown>,
  names: readonly string[],
): Promise<UserDefinedMaterialsData> {
  const namesJson = JSON.stringify(names);
  const json = (await runPython(`
${USER_DEFINED_MATERIALS_JSON_DEFAULT}
names = json.loads(${JSON.stringify(namesJson)})
json.dumps(user_defined_materials.get_materials_data(names), default=_json_default)
`)) as string;
  return JSON.parse(json) as UserDefinedMaterialsData;
}

export async function _evaluateOptimizationProblem(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  config: OptimizationConfig,
  imagePoint: ImagePoint = "chief_ray",
): Promise<OptimizationReport> {
  const configJson = JSON.stringify(config);
  const json = (await runPython(
    buildScript(
      opticalModel,
      (opm) => `json.dumps(evaluate_optimization_problem(${opm}, json.loads(${JSON.stringify(configJson)}), image_point='${imagePoint}'))`,
    ),
  )) as string;
  return JSON.parse(json) as OptimizationReport;
}

export async function _optimizeOpm(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  config: OptimizationConfig,
  imagePoint: ImagePoint = "chief_ray",
  onProgress?: (progress: ReadonlyArray<OptimizationProgressEntry>) => void | Promise<void>,
  runId?: string,
  interruptBuffer?: SharedArrayBuffer,
): Promise<OptimizationReport> {
  const progressCallback = onProgress;
  const configJson = JSON.stringify(config);
  const reportProgress = (progressJson: string) => {
    if (progressCallback === undefined) {
      return;
    }

    const progress = JSON.parse(progressJson) as OptimizationProgressEntry[];
    void progressCallback(progress);
  };

  const canBindProgressCallback = progressCallback !== undefined
    && pyodide !== null
    && typeof pyodide.globals?.set === "function"
    && typeof pyodide.globals?.delete === "function";

  if (canBindProgressCallback) {
    pyodide.globals.set("_optimization_progress_callback", reportProgress);
  }
  const canBindInterruptBuffer = runId !== undefined
    && interruptBuffer !== undefined
    && pyodide !== null
    && typeof pyodide.setInterruptBuffer === "function";

  if (canBindInterruptBuffer) {
    const interruptView = new Int32Array(interruptBuffer);
    Atomics.store(interruptView, 0, 0);
    activeOptimizationRunId = runId;
    activeOptimizationInterruptBuffer = interruptBuffer;
    activeOptimizationInterruptView = interruptView;
    pyodide.setInterruptBuffer(interruptView);
  }
  try {
    const json = (await runPython(
      buildScript(
        opticalModel,
        (opm) => !canBindProgressCallback
          ? `json.dumps(optimize_opm(${opm}, json.loads(${JSON.stringify(configJson)}), image_point='${imagePoint}'))`
          : `
def _report_optimization_progress(progress):
    _optimization_progress_callback(json.dumps(progress))
json.dumps(optimize_opm(${opm}, json.loads(${JSON.stringify(configJson)}), image_point='${imagePoint}', progress_reporter=_report_optimization_progress))
`,
      ),
    )) as string;
    return JSON.parse(json) as OptimizationReport;
  } finally {
    if (canBindInterruptBuffer) {
      pyodide.setInterruptBuffer(undefined);
      if (activeOptimizationInterruptView !== undefined) {
        Atomics.store(activeOptimizationInterruptView, 0, 0);
      }
      activeOptimizationRunId = undefined;
      activeOptimizationInterruptBuffer = undefined;
      activeOptimizationInterruptView = undefined;
    }
    if (canBindProgressCallback) {
      pyodide.globals.delete("_optimization_progress_callback");
    }
  }
}

export async function _requestOptimizationStop(runId: string): Promise<{ readonly signaled: boolean }> {
  if (runId !== activeOptimizationRunId || activeOptimizationInterruptView === undefined) {
    return { signaled: false };
  }

  Atomics.store(activeOptimizationInterruptView, 0, PYODIDE_INTERRUPT_SIGNAL);
  return { signaled: true };
}


// ─── Public API (exposed via Comlink) ─────────────────────────────────────────

export async function getFirstOrderData(opticalModel: OpticalModel): Promise<Record<string, number>> {
  return await _getFirstOrderData(requirePyodide(), opticalModel);
}

export async function getSurfaceSemiDiameters(opticalModel: OpticalModel): Promise<number[]> {
  return await _getSurfaceSemiDiameters(requirePyodide(), opticalModel);
}

export async function plotLensLayout(opticalModel: OpticalModel, isDark: boolean): Promise<string> {
  return await _plotLensLayout(requirePyodide(), opticalModel, isDark);
}

export async function getRayFanData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  imagePoint: ImagePoint = "chief_ray",
): Promise<RayFanData> {
  return await _getRayFanData(requirePyodide(), opticalModel, fieldIndex, imagePoint);
}

export async function getOpdFanData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  imagePoint: ImagePoint = "chief_ray",
): Promise<OpdFanData> {
  return await _getOpdFanData(requirePyodide(), opticalModel, fieldIndex, imagePoint);
}

export async function getSpotDiagramData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  imagePoint: ImagePoint = "chief_ray",
): Promise<SpotDiagramData> {
  return await _getSpotDiagramData(requirePyodide(), opticalModel, fieldIndex, imagePoint);
}

export async function getFieldCurvatureData(opticalModel: OpticalModel, wavelengthIndex: number): Promise<FieldCurveData> {
  return await _getFieldCurvatureData(requirePyodide(), opticalModel, wavelengthIndex);
}

export async function getAstigmatismCurveData(opticalModel: OpticalModel, wavelengthIndex: number): Promise<AstigmatismCurveData> {
  return await _getAstigmatismCurveData(requirePyodide(), opticalModel, wavelengthIndex);
}

export async function getLSAData(opticalModel: OpticalModel): Promise<LongitudinalSphericalAberrationData> {
  return await _getLSAData(requirePyodide(), opticalModel);
}

export async function getWavefrontData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  imagePoint: ImagePoint = "chief_ray",
  numRays: number = 128,
): Promise<WavefrontMapData> {
  return await _getWavefrontData(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, imagePoint, numRays);
}

export async function getStrehlVsWavelengthData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  imagePoint: ImagePoint = "chief_ray",
  wavelengthSamples: number = 100,
  numRays: number = 21,
): Promise<StrehlVsWavelengthData> {
  return await _getStrehlVsWavelengthData(requirePyodide(), opticalModel, fieldIndex, imagePoint, wavelengthSamples, numRays);
}

export async function getGeoPSFData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 128,
): Promise<GeoPsfData> {
  return await _getGeoPSFData(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, numRays);
}

export async function getDiffractionPSFData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  imagePoint: ImagePoint = "chief_ray",
  numRays: number = 128,
  maxDims: number = 1024,
): Promise<DiffractionPsfData> {
  return await _getDiffractionPSFData(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, imagePoint, numRays, maxDims);
}

export async function getDiffractionMTFData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  imagePoint: ImagePoint = "chief_ray",
  numRays: number = 128,
  maxDims: number = 256,
): Promise<DiffractionMtfData> {
  return await _getDiffractionMTFData(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, imagePoint, numRays, maxDims);
}


export async function get3rdOrderSeidelData(opticalModel: OpticalModel): Promise<SeidelData> {
  return await _get3rdOrderSeidelData(requirePyodide(), opticalModel);
}

export async function getZernikeCoefficients(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wvlIndex: number,
  imagePoint: ImagePoint = "chief_ray",
  numTerms?: number,
  ordering?: ZernikeOrdering,
): Promise<ZernikeData> {
  return await _getZernikeCoefficients(requirePyodide(), opticalModel, fieldIndex, wvlIndex, imagePoint, numTerms, ordering);
}

export async function focusByMonoRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult> {
  return await _focusByMonoRmsSpot(requirePyodide(), opticalModel, fieldIndex);
}

export async function focusByMonoStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult> {
  return await _focusByMonoStrehl(requirePyodide(), opticalModel, fieldIndex);
}

export async function focusByPolyRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult> {
  return await _focusByPolyRmsSpot(requirePyodide(), opticalModel, fieldIndex);
}

export async function focusByPolyStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult> {
  return await _focusByPolyStrehl(requirePyodide(), opticalModel, fieldIndex);
}

export async function getAllGlassCatalogsData(): Promise<AllGlassCatalogsData> {
  return await _getAllGlassCatalogsData(requirePyodide());
}

export async function addUserDefinedGlasses(materials: readonly UserDefinedGlassInput[]): Promise<UserDefinedMaterialsData> {
  return await _addUserDefinedGlasses(requirePyodide(), materials);
}

export async function deleteUserDefinedGlasses(names: readonly string[]): Promise<void> {
  await _deleteUserDefinedGlasses(requirePyodide(), names);
}

export async function updateUserDefinedGlasses(materials: readonly UserDefinedGlassInput[]): Promise<UserDefinedMaterialsData> {
  return await _updateUserDefinedGlasses(requirePyodide(), materials);
}

export async function getUserDefinedGlasses(names: readonly string[]): Promise<UserDefinedMaterialsData> {
  return await _getUserDefinedGlasses(requirePyodide(), names);
}

export async function canInterruptOptimization(): Promise<boolean> {
  return pyodide !== null
    && typeof pyodide.setInterruptBuffer === "function"
    && typeof SharedArrayBuffer !== "undefined";
}

export async function requestOptimizationStop(runId: string): Promise<{ readonly signaled: boolean }> {
  return await _requestOptimizationStop(runId);
}

export async function evaluateOptimizationProblem(
  opticalModel: OpticalModel,
  config: OptimizationConfig,
  imagePoint: ImagePoint = "chief_ray",
): Promise<OptimizationReport> {
  return await _evaluateOptimizationProblem(requirePyodide(), opticalModel, config, imagePoint);
}

export async function optimizeOpm(
  opticalModel: OpticalModel,
  config: OptimizationConfig,
  imagePoint: ImagePoint = "chief_ray",
  onProgress?: (progress: ReadonlyArray<OptimizationProgressEntry>) => void | Promise<void>,
  runId?: string,
  interruptBuffer?: SharedArrayBuffer,
): Promise<OptimizationReport> {
  return await _optimizeOpm(requirePyodide(), opticalModel, config, imagePoint, onProgress, runId, interruptBuffer);
}

expose({
  init,
  getFirstOrderData,
  getSurfaceSemiDiameters,
  plotLensLayout,
  getRayFanData,
  getOpdFanData,
  getSpotDiagramData,
  getFieldCurvatureData,
  getAstigmatismCurveData,
  getLSAData,
  getWavefrontData,
  getStrehlVsWavelengthData,
  getGeoPSFData,
  getDiffractionPSFData,
  getDiffractionMTFData,
  get3rdOrderSeidelData,
  getZernikeCoefficients,
  focusByMonoRmsSpot,
  focusByMonoStrehl,
  focusByPolyRmsSpot,
  focusByPolyStrehl,
  getAllGlassCatalogsData,
  addUserDefinedGlasses,
  deleteUserDefinedGlasses,
  updateUserDefinedGlasses,
  getUserDefinedGlasses,
  canInterruptOptimization,
  requestOptimizationStop,
  evaluateOptimizationProblem,
  optimizeOpm,
});
