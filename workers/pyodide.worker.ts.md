# `workers/pyodide.worker.ts`

## Purpose

Pyodide web worker that runs RayOptics computations off the main thread. Loads Pyodide v0.27.7, installs `rayoptics_web_utils` (internal Python package in `python/`), `rayoptics` and supporting packages, and exposes a typed API to React components via Comlink. This Pyodide web worker is long living.

Each exported function (except `init`) is **stateless**: it receives an `OpticalModel`, builds the Python `opm` locally in a single `runPython` call (using `buildScript` from `lib/pythonScript`), runs the computation, and returns the result. No global optical-model state persists between calls.

## Exports

### Public API (Comlink)

```ts
export async function init(): Promise<void>
export async function getFirstOrderData(opticalModel: OpticalModel): Promise<Record<string, number>>
export async function plotLensLayout(opticalModel: OpticalModel): Promise<string>
export async function plotRayFan(opticalModel: OpticalModel, fieldIndex: number): Promise<string>
export async function plotOpdFan(opticalModel: OpticalModel, fieldIndex: number): Promise<string>
export async function plotSpotDiagram(opticalModel: OpticalModel, fieldIndex: number): Promise<string>
export async function plotSurfaceBySurface3rdOrderAberr(opticalModel: OpticalModel): Promise<string>
export async function get3rdOrderSeidelData(opticalModel: OpticalModel): Promise<SeidelData>
export async function getZernikeCoefficients(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, numTerms?: number): Promise<ZernikeData>
```

### Injectable Variants (for testing)

```ts
export async function _init(runPython: (code: string) => Promise<unknown>, wheelUrl: string): Promise<void>
export async function _getFirstOrderData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<Record<string, number>>
export async function _plotLensLayout(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<string>
export async function _plotRayFan(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<string>
export async function _plotOpdFan(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<string>
export async function _plotSpotDiagram(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<string>
export async function _plotSurfaceBySurface3rdOrderAberr(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<string>
export async function _get3rdOrderSeidelData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<SeidelData>
export async function _getZernikeCoefficients(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, numTerms?: number): Promise<ZernikeData>
export function _resetPyodideForTesting(): void
```

## Initialization

`init()` performs the following steps:

1. No-ops if `pyodide` singleton is already set.
2. Loads Pyodide v0.27.7 via `importScripts` from jsDelivr CDN (`https://cdn.jsdelivr.net/pyodide/v0.27.7/full`).
3. Calls `loadPyodide({ indexURL })` to create the Pyodide instance.
4. Loads standard packages: `micropip`, `numpy`, `scipy`, `matplotlib`, `pandas`, `xlrd`, `traitlets`, `packaging`, `pyyaml`, `requests`, `deprecation`.
5. Constructs the wheel URL from `self.location.origin` and the `NEXT_PUBLIC_BASE_PATH` env var (defaults to `""`).
6. Delegates the rest to `_init(pyodide.runPythonAsync, wheelUrl)`.

`_init(runPython, wheelUrl)` performs three `runPython` calls:

1. Installs `rayoptics==0.9.8` and `opticalglass==1.1.1` (both with `deps=False` to avoid futile attempts to install Qt related packages).
2. Installs supporting packages: `anytree`, `transforms3d`, `json-tricks`, `openpyxl`, `parsimonious`, which are required by `rayoptics` and `opticalglass`.
3. Installs the local `rayoptics_web_utils` wheel, runs `_rwu_init()` to get the `caf2` glass object, and imports all symbols from `rayoptics.environment`, `rayoptics_web_utils.analysis`, and `rayoptics_web_utils.plotting`.

## Public API

All public functions call `requirePyodide()` to obtain `pyodide.runPythonAsync`, then delegate to the corresponding `_*` injectable variant.

| Function | Description |
|---|---|
| `init()` | Initializes Pyodide singleton. No-op if already initialized. |
| `getFirstOrderData(model)` | Builds `opm` from model, returns optical data (EFL, f-number, etc.) as `Record<string, number>`. |
| `plotLensLayout(model)` | Builds `opm` from model, returns a lens layout plot as a base64-encoded PNG string. |
| `plotRayFan(model, fieldIndex)` | Builds `opm` from model, returns a transverse ray fan plot for the given field index (zero-indexed). |
| `plotOpdFan(model, fieldIndex)` | Builds `opm` from model, returns an OPD fan plot for the given field index (zero-indexed). |
| `plotSpotDiagram(model, fieldIndex)` | Builds `opm` from model, returns a spot diagram for the given field index (zero-indexed). |
| `plotSurfaceBySurface3rdOrderAberr(model)` | Builds `opm` from model, returns a surface-by-surface Seidel aberration plot. Field independent. |
| `get3rdOrderSeidelData(model)` | Builds `opm` from model, returns `SeidelData` with 3rd-order Seidel aberration data. |
| `getZernikeCoefficients(model, fi, wi, n?)` | Builds `opm` from model, returns `ZernikeData` with Zernike polynomial coefficients. `numTerms` defaults to 56. |

## Injectable Variants (for testing)

Each public function has a corresponding `_*` variant that accepts `runPython` as an explicit first argument instead of relying on the singleton. This enables unit tests to inject a mock `runPython` without loading Pyodide.

Each `_*` variant (except `_init`) calls `buildScript(opticalModel, computation)` to produce a combined Python script (model-build wrapped in `def _build_opm():` + computation using `_build_opm()`) and runs it in a single `runPython` call.

- `_init(runPython, wheelUrl)` — full package installation sequence.
- `_getFirstOrderData(runPython, model)` — runs `buildScript(model, (opm) => \`json.dumps(get_first_order_data(${opm}))\`)`.
- `_plotLensLayout(runPython, model)` — runs `buildScript(model, (opm) => \`plot_lens_layout(${opm})\`)`.
- `_plotRayFan(runPython, model, fieldIndex)` — runs `buildScript(model, (opm) => \`plot_ray_fan(${fieldIndex}, ${opm})\`)`.
- `_plotOpdFan(runPython, model, fieldIndex)` — runs `buildScript(model, (opm) => \`plot_opd_fan(${fieldIndex}, ${opm})\`)`.
- `_plotSpotDiagram(runPython, model, fieldIndex)` — runs `buildScript(model, (opm) => \`plot_spot_diagram(${fieldIndex}, ${opm})\`)`.
- `_plotSurfaceBySurface3rdOrderAberr(runPython, model)` — runs `buildScript(model, (opm) => \`plot_surface_by_surface_3rd_order_aberr(${opm})\`)`.
- `_get3rdOrderSeidelData(runPython, model)` — runs `buildScript(model, (opm) => \`json.dumps(get_3rd_order_seidel_data(${opm}))\`)`.
- `_getZernikeCoefficients(runPython, model, fi, wi, n?)` — runs `buildScript(model, (opm) => ...)` including the import of `get_zernike_coefficients`. `numTerms` defaults to 56.
- `_resetPyodideForTesting()` — sets `pyodide = null` to allow `init()` to be re-exercised in tests.

## Key Conventions

- **Singleton `pyodide`**: `init()` is a no-op if the singleton is already set.
- **`requirePyodide()` guard**: All public functions call this helper. It throws `"Pyodide not initialized. Call init() first."` if `pyodide` is `null`.
- **Stateless**: Each computation function builds `opm` locally from the received `OpticalModel` within a single `runPython` call. No global `opm` state persists between calls.
- **Plot return type**: All plot functions return a `string` (base64-encoded image).
- **`caf2` global**: Initialized by `_rwu_init()` during `_init`.

## Edge Cases / Error Handling

- `init()` sets `pyodide = null` and re-throws on any failure, so a failed init can be retried.
- `NEXT_PUBLIC_BASE_PATH` env var is used to prefix the wheel URL path; defaults to `""` when not set.
- Pyodide version is pinned to **v0.27.7** from the jsDelivr CDN — do not change this version.
- `_init` is marked as a "dangerous zone" in comments — package versions are pinned and must not be changed without careful testing.

## Dependencies

- `comlink` — `expose()` to register the worker API.
- `lib/opticalModel` — `OpticalModel`, `SeidelData` (types only).
- `lib/zernikeData` — `ZernikeData` (type only).
- `lib/pythonScript` — `buildScript` (generates the combined model-build + computation Python script).

## Usages

- Instantiated as a singleton web worker by `hooks/usePyodide.ts` via a Comlink proxy.
