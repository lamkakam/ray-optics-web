# `shared/lib/utils/pythonScript.ts`

## Purpose

Builds the Python source code string that reconstructs the definition of an optical system for RayOptics inside the Pyodide worker. It is also for UI components to let users copy the Python snippet to the clipboard so that users may use the code string for their own RayOptics instance on Jupyter notebook.

Special-material recognition and Python-variable mappings are imported from `specialMaterials.ts` so other UI behavior uses the same definitions. Export-only aperture helper definitions are imported from the generated `generated/pythonExportApertureHelpers.ts` string, which is produced automatically from the Python helper sources under `src/python/src/rayoptics_web_utils/aperture/`.

## Exports

```ts
export function buildOpticalModelScript(opticalModel: OpticalModel): string;

export function buildScript(opticalModel: OpticalModel, computation: (opm: string) => string): string;

export function buildExportScript(opticalModel: OpticalModel): string;
```

## Behavior

### `buildOpticalModelScript(model)`
- This function is used by `buildScript` and `buildExportScript`.
- Internally, the function builds an ordered list of Python statements grouped into model setup, object setup, sequential surface steps, image setup, and final update calls, then joins them with newlines.
- The imperative construction flow is intentional because RayOptics does not support constructing `OpticalModel` directly from a dict payload.
- Reads `model.setAutoAperture` to determine `sm.do_apertures`.
- Returns a Python string (no leading imports) that:

1. Creates `opm`, `sm`, `osp`, `pm` variables from `OpticalModel()`, as a recommended practice mentioned in the official docs of RayOptics.
2. Sets `opm.system_spec.dimensions = 'MM'`.
3. Configures `osp['pupil']`, `osp['fov']`, `osp['wvls']` from `OpticalSpecs`.
4. Sets `opm.radius_mode = True`. Sets `sm.do_apertures` based on `model.setAutoAperture`.
5. Sets `sm.gaps[0].thi` to the object distance and `sm.gaps[0].medium = decode_medium(...)` from `model.object.medium` / `model.object.manufacturer`.
6. Calls `sm.add_surface(...)` for each surface in order. Per surface:
   - Passes `[curvatureRadius, thickness, medium, manufacturer]` (manufacturer omitted for `"air"`, `"REFL"`, `"CaF2"`, `"Fused Silica"`, `"Water"`, and `"D263TECO"`).
   - Handles `medium = "CaF2"`, `"Fused Silica"`, `"Water"`, and `"D263TECO"` by emitting the variable names `caf2`, `fused_silica`, `water`, and `d263teco` respectively (defined in the export script preamble).
   - Does not pass `sd=` to `sm.add_surface(...)`.
   - Emits `sm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=<semiDiameter>, x_offset=0, y_offset=0)]` after `sm.add_surface(...)` for centered circular clear apertures when `semiDiameter > 0`. If `clear_aperture` is omitted, offsets default to `0`.
   - Emits `OffsetCircular(...)` instead of `Circular(...)` for circular clear apertures when either `offsetX` or `offsetY` is nonzero, so RayOptics edge ray targets include the aperture offset.
   - Emits `Annular(radius=<semiDiameter>, obstruction_radius=<obstructionRadius>, x_offset=<offsetX>, y_offset=<offsetY>)` for annular clear apertures.
   - Emits `OffsetRotatedRectangular(x_half_width=<xHalfWidth>, y_half_width=<yHalfWidth>, x_offset=<offsetX>, y_offset=<offsetY>, rotation=<rotation>)` for rectangular clear apertures, independent of `semiDiameter`.
   - Emits `sm.ifcs[sm.cur_surface].edge_apertures = [Circular(...)]` only when `edge_aperture` is explicitly set and centered; emits `OffsetCircular(...)` when the edge aperture has a nonzero offset; emits `OffsetRotatedRectangular(...)` for rectangular edge apertures.
   - Surface-specific follow-up mutations are emitted after `sm.add_surface(...)`, in order, so multiple mutations may coexist on the same surface.
   - If `aspherical.kind === "Conic"`, emits `sm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=..., cc=...)`.
   - If `aspherical.kind === "EvenAspherical"`, emits `sm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=..., cc=..., coefs=[...])`.
   - If `aspherical.kind === "RadialPolynomial"`, emits `sm.ifcs[sm.cur_surface].profile = RadialPolynomial(r=..., cc=..., coefs=[...])`.
   - If `aspherical.kind === "XToroid"`, emits `sm.ifcs[sm.cur_surface].profile = XToroid(r=..., cc=..., cr=..., coefs=[...])`.
   - If `aspherical.kind === "YToroid"`, emits `sm.ifcs[sm.cur_surface].profile = YToroid(r=..., cc=..., cr=..., coefs=[...])`.
   - If `decenter` is set, emits `sm.ifcs[sm.cur_surface].decenter = DecenterData(...)`.
   - If `diffractionGrating` is set, emits `sm.ifcs[sm.cur_surface].phase_element = DiffractionGrating(...)`.
   - If `label === "Stop"`, emits `sm.set_stop()`.
7. Sets `sm.ifcs[-1].profile.r` to the image surface curvature radius.
8. If the image surface has `decenter`, emits `sm.ifcs[-1].decenter = DecenterData(...)`.
9. Calls `opm.update_model()` then `set_vig(opm)`.
- The object-side setup is isolated in its own builder phase so future object-gap mutations such as `sm.gaps[0].medium = ...` can be added without changing surface-step logic.
- The surface-step structure is intentionally extensible so future interface mutations such as `sm.ifcs[sm.cur_surface].phase_element = DiffractionGrating(...)` can be appended alongside asphere and decenter lines for the same surface.
- Clear and edge aperture assignments are formatted through dedicated helpers. The clear-aperture helper accepts an optional aperture and defaults omitted offsets to `0`, while the edge-aperture helper requires a present edge aperture before reading its radius and offsets.

### `buildScript(model, computation)`

Combines the model-build script with a computation into a single Python string suitable for a single `runPythonAsync` call. The model-build code is wrapped in a `def _build_opm():` function so that `opm`, `sm`, `osp`, and `pm` are local variables rather than globals. `buildScript` calls `computation("_build_opm()")`, injecting the expression token so the computation can reference the model inline without hardcoding the function name. Example output:

```python
def _build_opm():
    opm = OpticalModel()
    ...
    return opm
plot_lens_layout(_build_opm())
```

The last expression in the combined script is the return value of `runPythonAsync`.

### `buildExportScript(model)`

Returns a string with:
> **Warning**: Not for execution inside the Pyodide worker. This script is intended for copy-paste into a Jupyter / RayOptics notebook environment.

1. A preamble that sets `isdark = False` and imports from `rayoptics.environment`, `rayoptics.raytr.vigcalc`, `rayoptics.elem.surface` (`DecenterData`, `Circular`, `Aperture`, `Rectangular`), `rayoptics.elem.profiles`, `rayoptics.seq.medium`, and `opticalglass.rindexinfo`. It interpolates the generated standalone aperture helper source, defining `Annular(Aperture)`, `OffsetCircular(Circular)`, and `OffsetRotatedRectangular(Rectangular)` classes for copied notebook use, then creates `caf2`, `fused_silica`, `water`, and `d263teco` glass objects from `refractiveindex.info`. The helper source is generated from the Python implementation files, including their math imports and geometry comments.
2. The full output of `buildOpticalModelScript(model)`.
3. Calls to `sm.list_model()`, `pm.first_order_data()`, and `plt.figure(FigureClass=InteractiveLayout, ...)`.

The import preamble is built separately from the model-construction lines so future export-only dependencies, such as a `DiffractionGrating` import, can be added without changing model-step generation.

## Edge Cases / Error Handling

- Semi-diameter is never emitted as an `sd=` argument. Positive semi-diameters are emitted as explicit clear aperture assignments after each surface is added, with clear aperture offsets when present and `0, 0` otherwise. Circular centered apertures use RayOptics `Circular`; nonzero-offset circular apertures use `OffsetCircular`; annular clear apertures use `Annular`; rectangular clear apertures use `OffsetRotatedRectangular` and do not depend on `semiDiameter`.
- Edge aperture assignments are omitted when `edge_aperture` is unset, which represents the default/follow-clear behavior. Centered edge apertures use `Circular`; nonzero-offset edge apertures use `OffsetCircular`; rectangular edge apertures use `OffsetRotatedRectangular`.
- Exported `OffsetRotatedRectangular.set_dimension(x, y)` matches the worker helper: non-equal values directly set explicit half widths, while equal values are interpreted as RayOptics auto-aperture radius targets and uniformly scale the existing rectangle so the farthest rotated, offset corner reaches `abs(x)` without changing offsets or rotation.
- `polynomialCoefficients` is required for `kind: "EvenAspherical"`, `kind: "RadialPolynomial"`, `kind: "XToroid"`, and `kind: "YToroid"`; conic surfaces use `kind: "Conic"` and emit only `r` and `cc`. `r` must be the same as the curvature radius defined to the same surface.
- Toroidal kinds additionally emit `cr=toricSweepRadiusOfCurvature`.
- `CaF2`, `Fused Silica`, `Water`, and `D263TECO` media are emitted as the bare variables `caf2`, `fused_silica`, `water`, and `d263teco` (no quotes); `buildExportScript` provides those bindings in its preamble. Callers using `buildScript` in the worker have the same names defined via `_init`.
- `OffsetCircular` is required only when a circular aperture offset is nonzero. `Annular` is required when a clear aperture has `shape: "annular"`. `OffsetRotatedRectangular` is required when a clear or edge aperture has `shape: "rectangular"`. Worker scripts get these helpers from `rayoptics_web_utils.aperture`; export scripts define them inline from the generated TypeScript string so copied notebook code remains standalone without installing `rayoptics_web_utils`.
- The generated helper block is expected to match the concatenation of `annular.py`, `offset_circular.py`, and `offset_rotated_rectangular.py` in that order, separated by a single newline. NPM lifecycle scripts regenerate the ignored TypeScript output before install/check/test/build commands, and the Jest tests keep the export behavior pinned to the Python sources.
- `JSON.stringify` is used for Python string literals (medium name, manufacturer name, decenter strategy) — this correctly handles strings with special characters by quoting them as JSON strings, which are valid Python string literals.

## Usages

```ts
import { buildScript, buildExportScript, buildOpticalModelScript } from "@/shared/lib/utils/pythonScript";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

// Inside worker: build model + computation in one script
const computation = (opm: string) => `
  first_order = get_first_order_data(${opm})
  json.dumps(first_order)
`;
const script = buildScript(model, computation);
const result = await pyodide.runPythonAsync(script); // Returns first-order data

// Export to notebook: generate a copyable Python snippet
const notebookScript = buildExportScript(model);
console.log(notebookScript); // Can be copied to Jupyter notebook

// Build just the model definition (used internally)
const modelDef = buildOpticalModelScript(model);
```

- `buildScript` is called by `workers/pyodide.worker.ts` to produce combined model + computation Python code.
- `buildExportScript` is called by "Export to notebook" UI action to generate copyable snippets.
