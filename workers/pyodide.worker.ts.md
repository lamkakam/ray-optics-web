# `workers/pyodide.worker.ts`

## Purpose

Pyodide web worker that runs RayOptics computations off the main thread. Loads Pyodide v0.27.7, installs `rayoptics_web_utils` (internal Python package in `python/`), `rayoptics` and supporting packages, and exposes a typed API to React components via Comlink. This Pyodide web worker is long living.

## Exports

### Public API (Comlink)

```ts
export async function init(): Promise<void>
export async function setOpticalSurfaces(opticalModel: OpticalModel, setAutoAperture: SetAutoApertureFlag): Promise<void>
export async function getFirstOrderData(): Promise<Record<string, number>>
export async function plotLensLayout(): Promise<string>
export async function plotRayFan(fieldIndex: number): Promise<string>
export async function plotOpdFan(fieldIndex: number): Promise<string>
export async function plotSpotDiagram(fieldIndex: number): Promise<string>
export async function plotSurfaceBySurface3rdOrderAberr(): Promise<string>
export async function get3rdOrderSeidelData(): Promise<SeidelData>
```

### Injectable Variants (for testing)

```ts
export async function _init(runPython: (code: string) => Promise<unknown>, wheelUrl: string): Promise<void>
export async function _setOpticalSurfaces(opticalModel: OpticalModel, setAutoAperture: SetAutoApertureFlag, runPython: (code: string) => Promise<unknown>): Promise<void>
export async function _getFirstOrderData(runPython: (code: string) => Promise<unknown>): Promise<Record<string, number>>
export async function _plotLensLayout(runPython: (code: string) => Promise<unknown>): Promise<string>
export async function _plotRayFan(runPython: (code: string) => Promise<unknown>, fieldIndex: number): Promise<string>
export async function _plotOpdFan(runPython: (code: string) => Promise<unknown>, fieldIndex: number): Promise<string>
export async function _plotSpotDiagram(runPython: (code: string) => Promise<unknown>, fieldIndex: number): Promise<string>
export async function _plotSurfaceBySurface3rdOrderAberr(runPython: (code: string) => Promise<unknown>): Promise<string>
export async function _get3rdOrderSeidelData(runPython: (code: string) => Promise<unknown>): Promise<SeidelData>
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

## Public API (Comlink)

All public functions call `requirePyodide()` to obtain `pyodide.runPythonAsync`, then delegate to the corresponding `_*` injectable variant. All public function calls except `init()` are idempotent.

| Function | Description |
|---|---|
| `init()` | Initializes Pyodide singleton. No-op if already initialized. |
| `setOpticalSurfaces(model, flag)` | Builds and runs the Python script that defines `opm` (the global optical model). Must be called before any data or plot function. |
| `getFirstOrderData()` | Returns optical data from first-order approximation (EFL, f-number, etc.) as `Record<string, number>`. |
| `plotLensLayout()` | Returns a lens layout plot as a string (base64 encoded png). |
| `plotRayFan(fieldIndex)` | Returns a transverse ray fan plot for the given field index (zero-indexed). |
| `plotOpdFan(fieldIndex)` | Returns an OPD fan plot for the given field index (zero-indexed). |
| `plotSpotDiagram(fieldIndex)` | Returns a spot diagram for the given field index (zero-indexed). |
| `plotSurfaceBySurface3rdOrderAberr()` | Returns a surface-by-surface Seidel aberration plot. Field independent. |
| `get3rdOrderSeidelData()` | Returns `SeidelData` with 3rd-order Seidel aberration data. |

## Injectable Variants (for testing)

Each public function has a corresponding `_*` variant that accepts `runPython` as an explicit argument instead of relying on the singleton. This enables unit tests to inject a mock `runPython` without loading Pyodide.

- `_init(runPython, wheelUrl)` — full package installation sequence.
- `_setOpticalSurfaces(model, flag, runPython)` — calls `buildOpticalModelScript` then `runPython`.
- `_getFirstOrderData(runPython)` — runs `json.dumps(get_first_order_data(opm))` and parses JSON.
- `_plotLensLayout(runPython)` — runs `plot_lens_layout(opm)` and returns the result string.
- `_plotRayFan(runPython, fieldIndex)` — runs `plot_ray_fan(fieldIndex, opm)`.
- `_plotOpdFan(runPython, fieldIndex)` — runs `plot_opd_fan(fieldIndex, opm)`.
- `_plotSpotDiagram(runPython, fieldIndex)` — runs `plot_spot_diagram(fieldIndex, opm)`.
- `_plotSurfaceBySurface3rdOrderAberr(runPython)` — runs `plot_surface_by_surface_3rd_order_aberr(opm)`.
- `_get3rdOrderSeidelData(runPython)` — runs `json.dumps(get_3rd_order_seidel_data(opm))` and parses JSON.
- `_resetPyodideForTesting()` — sets `pyodide = null` to allow `init()` to be re-exercised in tests.

## Key Conventions

- **Singleton `pyodide`**: `init()` is a no-op if the singleton is already set.
- **`requirePyodide()` guard**: All public functions call this helper. It throws `"Pyodide not initialized. Call init() first."` if `pyodide` is `null`.
- **`setOpticalSurfaces` ordering**: Must be called before any data or plot function; it sets the global `opm` Python variable used by all subsequent calls.
- **Plot return type**: All plot functions return a `string` (base64-encoded image).
- **`opm` global**: The Python variable `opm` holds the current `OpticalModel` instance and is referenced directly by all analysis and plotting helpers.
- **`caf2` global**: Initialized by `_rwu_init()` during `_init`.

## Edge Cases / Error Handling

- `init()` sets `pyodide = null` and re-throws on any failure, so a failed init can be retried.
- `NEXT_PUBLIC_BASE_PATH` env var is used to prefix the wheel URL path; defaults to `""` when not set.
- Pyodide version is pinned to **v0.27.7** from the jsDelivr CDN — do not change this version.
- `_init` is marked as a "dangerous zone" in comments — package versions are pinned and must not be changed without careful testing.

## Dependencies

- `comlink` — `expose()` to register the worker API.
- `lib/opticalModel` — `OpticalModel`, `SeidelData` (types only).
- `lib/apertureFlag` — `SetAutoApertureFlag` (type only).
- `lib/pythonScript` — `buildOpticalModelScript` (generates the Python script for `setOpticalSurfaces`).

## Usages

- Instantiated as a singleton web worker by `hooks/usePyodide.ts` via a Comlink proxy.
