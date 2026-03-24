# `lib/pythonScript.ts`

## Purpose

Builds the Python source code string that reconstructs the definition of an optical system for RayOptics inside the Pyodide worker. It is also for UI components to let users copy the Python snippet to the clipboard so that users may use the code string for their own RayOptics instance on Jupyter notebook.

## Exports

```ts
export function buildOpticalModelScript(opticalModel: OpticalModel): string;

export function buildScript(opticalModel: OpticalModel, computation: string): string;

export function buildExportScript(opticalModel: OpticalModel): string;
```

## Behavior

### `buildOpticalModelScript(model)`
- This function is used by `buildScript` and `buildExportScript`.
- Reads `model.setAutoAperture` to determine `sm.do_apertures`.
- Returns a Python string (no leading imports) that:

1. Creates `opm`, `sm`, `osp`, `pm` variables from `OpticalModel()`, as a recommended practice mentioned in the official docs of RayOptics.
2. Sets `opm.system_spec.dimensions = 'MM'`.
3. Configures `osp['pupil']`, `osp['fov']`, `osp['wvls']` from `OpticalSpecs`.
4. Sets `opm.radius_mode = True`. Sets `sm.do_apertures` based on `model.setAutoAperture`.
5. Sets `sm.gaps[0].thi` to the object distance.
6. Calls `sm.add_surface(...)` for each surface in order. Per surface:
   - Passes `[curvatureRadius, thickness, medium, manufacturer]` (manufacturer omitted for `"air"`, `"REFL"`, `"CaF2"`).
   - Handles `medium = "CaF2"` by emitting the variable name `caf2` (defined in the export script preamble).
   - Appends `sd=semiDiameter` when non-zero.
   - If `aspherical` is set, emits `sm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=..., cc=...[, coefs=[...]])`.
   - If `decenter` is set, emits `sm.ifcs[sm.cur_surface].decenter = DecenterData(...)`.
   - If `label === "Stop"`, emits `sm.set_stop()`.
7. Sets `sm.ifcs[-1].profile.r` to the image surface curvature radius.
8. If the image surface has `decenter`, emits `sm.ifcs[-1].decenter = DecenterData(...)`.
9. Calls `opm.update_model()` then `apply_paraxial_vignetting(opm)`.

> **Warning**: The indentation and whitespace in the template literal are intentional — do not reformat them. Python is whitespace-sensitive.

### `buildScript(model, computation)`

Combines the model-build script with a computation snippet into a single Python string suitable for a single `runPythonAsync` call. The computation is appended after `opm.update_model()` / `apply_paraxial_vignetting`. The last expression in the combined script is the return value of `runPythonAsync`.

### `buildExportScript(model)`

Returns a string with:
> **Warning**: Not for execution inside the Pyodide worker. This script is intended for copy-paste into a Jupyter / RayOptics notebook environment.

1. A preamble that sets `isdark = False` and imports from `rayoptics.environment`, `rayoptics.raytr.trace`, `rayoptics.elem.surface`, and `opticalglass.rindexinfo`. Also creates a `caf2` glass object from `refractiveindex.info`.
2. The full output of `buildOpticalModelScript(model)`.
3. Calls to `sm.list_model()`, `pm.first_order_data()`, and `plt.figure(FigureClass=InteractiveLayout, ...)`.

## Edge Cases / Error Handling

- The argument for semi-diameter is omitted from `sm.add_surface(...)` when `semiDiameter` is falsy (zero) — this lets RayOptics use the default value defined by RayOptics itself.
- `polynomialCoefficients` in the aspherical config is optional; when absent only `r` and `cc` are passed to `EvenPolynomial`. `r` must be the same as the curvature radius defined to the same surface.
- `CaF2` medium is emitted as the bare variable `caf2` (no quotes); `buildExportScript` provides the `caf2` binding in its preamble. Callers using `buildScript` in the worker have `caf2` defined via `_init`.
- `JSON.stringify` is used for Python string literals (medium name, manufacturer name, decenter strategy) — this correctly handles strings with special characters by quoting them as JSON strings, which are valid Python string literals.

## Usages

- `buildScript` is called by all `_*` injectable functions in `workers/pyodide.worker.ts` to produce the combined model + computation Python script.
- `buildExportScript` is called by a UI action (e.g. "Export to notebook") to produce a copyable Python snippet.
