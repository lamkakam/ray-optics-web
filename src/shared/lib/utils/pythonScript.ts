/**
 * Builds Python source code that reconstructs the definition of an optical system for RayOptics inside the Pyodide worker. It is also used by UI components to let users copy the Python snippet to the clipboard so that users may use the code string for their own RayOptics instance on Jupyter notebook.
 *
 * @remarks
 * Special-material recognition and Python-variable mappings are imported from `specialMaterials.ts` so other UI behavior uses the same definitions. `field.isWideAngle === true` selects `ExactOpticalModel`; opted-in Image Height and Object Height additionally select `ExactImageHeightFieldSpec` and `ExactObjectHeightFieldSpec`, respectively. False or omitted flags use RayOptics' `OpticalModel` and `FieldSpec`. Standalone exports inline the exact-spec implementation from `rayoptics_web_utils/optical_specs.py` only for models that opt in, while worker scripts import the definitions from the local wheel. Final vignetting setup calls `set_vig_with_ronchi_envelopes(...)`, which sizes against every Ronchi ruling's circular envelope and restores its binary bands before analysis. Exact models inject `set_vig_respecting_exact_pupil`, so a passing Object-NA unit boundary receives zero vignetting without RayOptics probing outside the requested angular pupil; other exact pupil modes delegate to native vignetting.
 *
 * ## Edge Cases / Error Handling
 *
 * - Semi-diameter is never emitted as an `sd=` argument. Positive semi-diameters are emitted as explicit clear aperture assignments after each surface is added, with clear aperture offsets when present and `0, 0` otherwise. Circular centered apertures use RayOptics `Circular`; nonzero-offset circular apertures use `OffsetCircular`; annular clear apertures use `Annular`; Ronchi clear apertures use `RonchiRuling`; rectangular clear apertures use `OffsetRotatedRectangular` and do not depend on `semiDiameter`.
 * - Edge aperture assignments are omitted when `edge_aperture` is unset, which represents the default/follow-clear behavior. Centered edge apertures use `Circular`; nonzero-offset edge apertures use `OffsetCircular`; rectangular edge apertures use `OffsetRotatedRectangular`.
 * - Exported `OffsetRotatedRectangular.set_dimension(x, y)` matches the worker helper: non-equal values directly set explicit half widths, while equal values are interpreted as RayOptics auto-aperture radius targets and uniformly scale the existing rectangle so the farthest rotated, offset corner reaches `abs(x)` without changing offsets or rotation.
 * - `polynomialCoefficients` is required for `kind: "EvenAspherical"`, `kind: "RadialPolynomial"`, `kind: "XToroid"`, and `kind: "YToroid"`; conic surfaces use `kind: "Conic"` and emit only `r` and `cc`. `r` must be the same as the curvature radius defined to the same surface.
 * - Toroidal kinds additionally emit `cr=toricSweepRadiusOfCurvature`.
 * - `CaF2`, `Fused Silica`, `Water`, and `D263TECO` media are emitted as the bare variables `caf2`, `fused_silica`, `water`, and `d263teco` (no quotes); `buildExportScript` provides those bindings in its preamble. Callers using `buildScript` in the worker have the same names defined via `_init`.
 * - Custom media are emitted as `user_defined_materials["<label>"]` when the surface manufacturer is `"Custom"`. Worker computations use the user-defined material table initialized by Pyodide; standalone exports initialize their table from the editable version-1.0 `custom-glass.json` path in the `userDefinedMaterials` export section.
 * - Wide-angle Object Angle, Object Height, and Image Height models use `ExactOpticalModel`. Object Height uses `ExactObjectHeightFieldSpec`, Image Height uses `ExactImageHeightFieldSpec`, and Object Angle retains `FieldSpec`. False or omitted flags use RayOptics `OpticalModel` and `FieldSpec`.
 * - `OffsetCircular` is required only when a circular aperture offset is nonzero. `Annular` is required when a clear aperture has `shape: "annular"`. `RonchiRuling` is required when a clear aperture has `shape: "ronchi"`. `OffsetRotatedRectangular` is required when a clear or edge aperture has `shape: "rectangular"`. Worker scripts get these helpers from `rayoptics_web_utils.aperture`; export scripts define them inline from the generated TypeScript string so copied notebook code remains standalone without installing `rayoptics_web_utils`.
 * - Generated helper blocks exactly match their Python sources. NPM lifecycle scripts regenerate both ignored TypeScript outputs before install/check/test/build commands, and Jest keeps the standalone export behavior pinned to those sources.
 * - `JSON.stringify` is used for Python string literals (medium name, manufacturer name, decenter strategy) — this correctly handles strings with special characters by quoting them as JSON strings, which are valid Python string literals.
 */

import type { OpticalModel, AsphericalPolynomialCoeffs, ClearAperture, EdgeAperture } from "@/shared/lib/types/opticalModel";
import { pythonExportApertureHelpers } from "./generated/pythonExportApertureHelpers";
import { pythonExportExactSpecHelpers } from "./generated/pythonExportExactSpecHelpers";
import { builtInSpecialMaterial, nonBuiltInSpecialMaterial } from "./specialMaterials";

type PythonLine = string;
type SurfaceMutationLine = PythonLine;

type SurfaceBuildStep = {
  addSurfaceLine: PythonLine;
  mutationLines: SurfaceMutationLine[];
};
type Surface = OpticalModel["surfaces"][number];

/** The two copyable source-code sections produced for a standalone Python export. */
export interface PythonExportScriptSections {
  /** A self-contained loader for the user's version-1.0 custom-glass JSON file. */
  readonly userDefinedMaterials: string;
  /** The remaining imports, helpers, optical-model construction, and output code. */
  readonly remainingScript: string;
}

/** Returns whether a field explicitly selects the exact real-ray stack. */
function usesExactRealRayStack(opticalModel: OpticalModel): boolean {
  return opticalModel.specs.field.isWideAngle === true;
}

function formattedMedium(medium: string, glassManufacturer: string): { medium: string | number, glassManufacturer: string | number } {
  const refractiveIdxForModalGlass = parseFloat(medium);
  if (!Number.isNaN(refractiveIdxForModalGlass)) {
    // model glass
    const abbeNumber = parseFloat(glassManufacturer);
    
    return {
      medium: refractiveIdxForModalGlass,
      glassManufacturer: !Number.isNaN(abbeNumber) ? `, ${abbeNumber}` : "",
    };
  }

  if (glassManufacturer === "Custom") {
    return {
      medium: `user_defined_materials[${JSON.stringify(medium)}]`,
      glassManufacturer: "",
    };
  }

  // real medium or glass
  return {
    medium: nonBuiltInSpecialMaterial.get(medium) ?? JSON.stringify(medium),
    glassManufacturer: builtInSpecialMaterial.has(medium) || nonBuiltInSpecialMaterial.has(medium)
      ? ""
      : `, ${JSON.stringify(glassManufacturer)}`,
  };
}

function formattedPolynomialCoeffs(coeffs: AsphericalPolynomialCoeffs) {
  return JSON.stringify(coeffs);
}

function formatWavelengthSpec(opticalModel: OpticalModel): PythonLine {
  const {
    specs: {
      wavelengths: { weights, referenceIndex: refWavelengthIdx },
    },
  } = opticalModel;

  const formattedWeights = weights
    .reduce((acc, [wl, weight], idx) => `${acc}(${wl}, ${weight})${idx === weights.length - 1 ? "" : ","}`, "");

  return `osp['wvls'] = WvlSpec([${formattedWeights}], ref_wl=${refWavelengthIdx})`;
}

function formatFieldSpec(opticalModel: OpticalModel): PythonLine {
  const {
    specs: {
      field: {
        space: fieldSpace,
        type: fieldType,
        maxField,
        fields,
        isRelative: isFieldRelative,
        isWideAngle: isFieldWideAngle,
      },
    },
  } = opticalModel;
  const usesExactStack = usesExactRealRayStack(opticalModel);
  const isWideAngleFlag = usesExactStack && isFieldWideAngle === true
    ? ", is_wide_angle=True"
    : "";
  const fieldSpecClass = usesExactStack && fieldSpace === "image"
    ? "ExactImageHeightFieldSpec"
    : usesExactStack && fieldSpace === "object" && fieldType === "height"
      ? "ExactObjectHeightFieldSpec"
      : "FieldSpec";

  return `osp['fov'] = ${fieldSpecClass}(osp, key=['${fieldSpace}', '${fieldType}'], value=${maxField}, flds=${JSON.stringify(fields)}, is_relative=${isFieldRelative ? "True" : "False"}${isWideAngleFlag})`;
}

function formatPupilSpec(opticalModel: OpticalModel): PythonLine {
  const {
    specs: {
      pupil: { space: pupilSpace, type: pupilType, value: pupilValue },
    },
  } = opticalModel;

  return `osp['pupil'] = PupilSpec(osp, key=['${pupilSpace}', '${pupilType}'], value=${pupilValue})`;
}

function formatDecenterAssignment(targetExpr: string, decenter: NonNullable<OpticalModel["image"]["decenter"]>): PythonLine {
  const { coordinateSystemStrategy: posAndOrientation, alpha, beta, gamma, offsetX, offsetY } = decenter;
  return `${targetExpr}.decenter = DecenterData(${JSON.stringify(posAndOrientation)}, alpha=${alpha}, beta=${beta}, gamma=${gamma}, x=${offsetX}, y=${offsetY})`;
}

function formatAsphereAssignment(
  targetExpr: string,
  curvatureRadius: number,
  aspherical: NonNullable<OpticalModel["surfaces"][number]["aspherical"]>,
): PythonLine {
  const { kind } = aspherical;

  if (kind === "Conic") {
    const { conicConstant } = aspherical;
    return `${targetExpr}.profile = EvenPolynomial(r=${curvatureRadius}, cc=${conicConstant})`;
  }

  if (kind === "EvenAspherical") {
    const { conicConstant, polynomialCoefficients } = aspherical;
    const coefsString = formattedPolynomialCoeffs(polynomialCoefficients);
    return `${targetExpr}.profile = EvenPolynomial(r=${curvatureRadius}, cc=${conicConstant}, coefs=${coefsString})`;
  }

  if (kind === "RadialPolynomial") {
    const { conicConstant, polynomialCoefficients } = aspherical;
    const coefsString = formattedPolynomialCoeffs(polynomialCoefficients);
    return `${targetExpr}.profile = RadialPolynomial(r=${curvatureRadius}, cc=${conicConstant}, coefs=${coefsString})`;
  }

  if (kind === "XToroid") {
    const { toricSweepRadiusOfCurvature, conicConstant, polynomialCoefficients } = aspherical;
    const coefsString = formattedPolynomialCoeffs(polynomialCoefficients);
    return `${targetExpr}.profile = XToroid(r=${curvatureRadius}, cc=${conicConstant}, cR=${toricSweepRadiusOfCurvature}, coefs=${coefsString})`;
  }

  const { toricSweepRadiusOfCurvature, conicConstant, polynomialCoefficients } = aspherical;
  const coefsString = formattedPolynomialCoeffs(polynomialCoefficients);
  return `${targetExpr}.profile = YToroid(r=${curvatureRadius}, cc=${conicConstant}, cR=${toricSweepRadiusOfCurvature}, coefs=${coefsString})`;
}

function formatDiffractionGrating(
  targetExpr: string,
  grating: NonNullable<NonNullable<OpticalModel["surfaces"][number]["diffractiveElement"]>["diffractionGrating"]>,
) {
  const { lpmm, order } = grating;
  return `${targetExpr}.phase_element = DiffractionGrating(grating_lpmm=${lpmm}, order=${order})`;
}

function formatCircularApertureAssignment(
  targetExpr: string,
  apertureKind: "clear_apertures" | "edge_apertures",
  radius: number,
  offsetX: number,
  offsetY: number,
): PythonLine {
  const apertureClass = offsetX === 0 && offsetY === 0 ? "Circular" : "OffsetCircular";
  return `${targetExpr}.${apertureKind} = [${apertureClass}(radius=${radius}, x_offset=${offsetX}, y_offset=${offsetY})]`;
}

function formatClearApertureAssignment(
  targetExpr: string,
  semiDiameter: number,
  clearAperture: ClearAperture | undefined,
): PythonLine | undefined {
  const offsetX = clearAperture === undefined ? 0 : clearAperture.offsetX;
  const offsetY = clearAperture === undefined ? 0 : clearAperture.offsetY;

  if (clearAperture?.shape === "rectangular") {
    return `${targetExpr}.clear_apertures = [OffsetRotatedRectangular(x_half_width=${clearAperture.xHalfWidth}, y_half_width=${clearAperture.yHalfWidth}, x_offset=${offsetX}, y_offset=${offsetY}, rotation=${clearAperture.rotation})]`;
  }

  if (semiDiameter <= 0) {
    return undefined;
  }

  if (clearAperture?.shape === "annular") {
    return `${targetExpr}.clear_apertures = [Annular(radius=${semiDiameter}, obstruction_radius=${clearAperture.obstructionRadius}, x_offset=${offsetX}, y_offset=${offsetY})]`;
  }

  if (clearAperture?.shape === "ronchi") {
    return `${targetExpr}.clear_apertures = [RonchiRuling(radius=${semiDiameter}, lpmm=${clearAperture.lpmm}, rotation=${clearAperture.rotation}, x_offset=${offsetX}, y_offset=${offsetY})]`;
  }

  return formatCircularApertureAssignment(
    targetExpr,
    "clear_apertures",
    semiDiameter,
    offsetX,
    offsetY,
  );
}

function formatEdgeApertureAssignment(
  targetExpr: string,
  edgeAperture: EdgeAperture,
): PythonLine {
  if (edgeAperture.shape === "rectangular") {
    return `${targetExpr}.edge_apertures = [OffsetRotatedRectangular(x_half_width=${edgeAperture.xHalfWidth}, y_half_width=${edgeAperture.yHalfWidth}, x_offset=${edgeAperture.offsetX}, y_offset=${edgeAperture.offsetY}, rotation=${edgeAperture.rotation})]`;
  }

  return formatCircularApertureAssignment(
    targetExpr,
    "edge_apertures",
    edgeAperture.radius,
    edgeAperture.offsetX,
    edgeAperture.offsetY,
  );
}

function buildSurfaceStep(surface: Surface): SurfaceBuildStep {
  const {
    label,
    curvatureRadius,
    thickness,
    medium,
    manufacturer,
    semiDiameter,
    clear_aperture,
    edge_aperture,
    aspherical,
    decenter,
    diffractiveElement,
  } = surface;
  const { medium: mediumOption, glassManufacturer } = formattedMedium(medium, manufacturer);
  const mutationLines: SurfaceMutationLine[] = [];
  const currentSurfaceExpr = "sm.ifcs[sm.cur_surface]";

  const clearApertureAssignment = formatClearApertureAssignment(currentSurfaceExpr, semiDiameter, clear_aperture);
  if (clearApertureAssignment !== undefined) {
    mutationLines.push(clearApertureAssignment);
  }

  if (edge_aperture !== undefined) {
    mutationLines.push(formatEdgeApertureAssignment(currentSurfaceExpr, edge_aperture));
  }

  if (aspherical !== undefined) {
    mutationLines.push(formatAsphereAssignment(currentSurfaceExpr, curvatureRadius, aspherical));
  }

  if (decenter !== undefined) {
    mutationLines.push(formatDecenterAssignment(currentSurfaceExpr, decenter));
  }

  if (diffractiveElement?.diffractionGrating !== undefined) {
    mutationLines.push(formatDiffractionGrating(currentSurfaceExpr, diffractiveElement.diffractionGrating));
  }

  if (label === "Stop") {
    mutationLines.push("sm.set_stop()");
  }

  return {
    addSurfaceLine: `sm.add_surface([${curvatureRadius}, ${thickness}, ${mediumOption}${glassManufacturer}])`,
    mutationLines,
  };
}

function buildObjectSetupLines(opticalModel: OpticalModel): PythonLine[] {
  const {
    object: { distance: objectDistance, medium, manufacturer },
  } = opticalModel;

  const { medium: mediumOption, glassManufacturer } = formattedMedium(
    medium.toUpperCase() === "REFL" ? "air" : medium,
    medium.toUpperCase() === "REFL" ? "" : manufacturer,
  );

  return [
    `sm.gaps[0].thi=${objectDistance}`,
    `sm.gaps[0].medium = decode_medium(${mediumOption}${glassManufacturer})`,
  ];
}

function buildImageSetupLines(opticalModel: OpticalModel): PythonLine[] {
  const {
    image: { curvatureRadius: imageCurvatureRadius, decenter: imageDecenter },
  } = opticalModel;
  const lines = [`sm.ifcs[-1].profile.r = ${imageCurvatureRadius}`];

  if (imageDecenter !== undefined) {
    lines.push(formatDecenterAssignment("sm.ifcs[-1]", imageDecenter));
  }

  return lines;
}

function buildOpticalModelLines(opticalModel: OpticalModel): PythonLine[] {
  const { setAutoAperture, surfaces } = opticalModel;
  const doApertureFlag = setAutoAperture === "autoAperture" ? "True" : "False";
  const opticalModelClass = usesExactRealRayStack(opticalModel)
    ? "ExactOpticalModel"
    : "OpticalModel";
  const lines: PythonLine[] = [
    `opm = ${opticalModelClass}()`,
    "sm  = opm['seq_model']",
    "osp = opm['optical_spec']",
    "pm  = opm['parax_model']",
    "",
    "opm.system_spec.dimensions = 'mm'",
    "",
    formatPupilSpec(opticalModel),
    formatFieldSpec(opticalModel),
    formatWavelengthSpec(opticalModel),
    "",
    "opm.radius_mode = True",
    `sm.do_apertures = ${doApertureFlag}`,
    "",
    ...buildObjectSetupLines(opticalModel),
  ];

  for (const surface of surfaces) {
    const step = buildSurfaceStep(surface);
    lines.push(step.addSurfaceLine, ...step.mutationLines);
  }

  lines.push(
    ...buildImageSetupLines(opticalModel),
    "",
    "opm.update_model()",
    usesExactRealRayStack(opticalModel)
      ? "set_vig_with_ronchi_envelopes(opm, set_vig_fn=set_vig_respecting_exact_pupil)"
      : "set_vig_with_ronchi_envelopes(opm)",
  );

  return lines;
}

function renderPythonBlock(lines: PythonLine[]): string {
  return lines.join("\n");
}

function buildUserDefinedMaterialsScript(): string {
  return `import json
from opticalglass.opticalmedium import InterpolatedMedium

custom_glass_json_path = "<PATH TO CUSTOM GLASS JSON FILE>"
with open(custom_glass_json_path, "r", encoding="utf-8") as custom_glass_file:
    custom_glass_data = json.load(custom_glass_file)

user_defined_materials = {
    label: InterpolatedMedium(label, pairs=material["data"], cat="custom")
    for label, material in custom_glass_data["Custom"].items()
}`;
}

function buildRemainingExportScript(opticalModel: OpticalModel): string {
  const exactSpecHelpers = usesExactRealRayStack(opticalModel)
    ? `\n${pythonExportExactSpecHelpers}\n`
    : "";
  return `isdark = False
from rayoptics.environment import *
from rayoptics.raytr.vigcalc import set_vig
from rayoptics.elem.surface import DecenterData, Circular, Aperture, Rectangular
from rayoptics.elem.profiles import XToroid, YToroid
from rayoptics.seq.medium import decode_medium
from opticalglass.rindexinfo import create_material

${pythonExportApertureHelpers}
${exactSpecHelpers}

caf2_url = 'https://refractiveindex.info/database/data/main/CaF2/nk/Malitson.yml'
caf2 = create_glass(caf2_url, "rindexinfo")

fused_silica_url = 'https://refractiveindex.info/database/data/main/SiO2/nk/Malitson.yml'
fused_silica = create_glass(fused_silica_url, "rindexinfo")

water_url = 'https://refractiveindex.info/database/data/main/H2O/nk/Daimon-20.0C.yml'
water = create_glass(water_url, "rindexinfo")

d263teco_url = 'https://refractiveindex.info/database/data/specs/schott/misc/D263TECO.yml'
d263teco = create_glass(d263teco_url, "rindexinfo")`;
}

/**
 *
 * @remarks
 * ### `buildOpticalModelScript(model)`
 * - This function is used by `buildScript` and `buildExportScript`.
 * - Internally, the function builds an ordered list of Python statements grouped into model setup, object setup, sequential surface steps, image setup, and final update calls, then joins them with newlines.
 * - The imperative construction flow is intentional because RayOptics does not support constructing `OpticalModel` directly from a dict payload.
 * - Reads `model.setAutoAperture` to determine `sm.do_apertures`.
 * - Returns a Python string (no leading imports) that:
 *
 * 1. Creates `opm`, `sm`, `osp`, `pm` variables. An explicit `field.isWideAngle === true` uses `ExactOpticalModel()`; false and omitted flags use RayOptics `OpticalModel()`.
 * 2. Sets `opm.system_spec.dimensions = 'MM'`.
 * 3. Configures `osp['pupil']`, `osp['fov']`, `osp['wvls']` from `OpticalSpecs`; opted-in Object Height and Image Height instantiate their exact field classes, while Object Angle and every non-opted-in path instantiate `FieldSpec`.
 * 4. Sets `opm.radius_mode = True`. Sets `sm.do_apertures` based on `model.setAutoAperture`.
 * 5. Sets `sm.gaps[0].thi` to the object distance and `sm.gaps[0].medium = decode_medium(...)` from `model.object.medium` / `model.object.manufacturer`.
 * 6. Calls `sm.add_surface(...)` for each surface in order. Per surface:
 * - Passes `[curvatureRadius, thickness, medium, manufacturer]` (manufacturer omitted for `"air"`, `"REFL"`, `"CaF2"`, `"Fused Silica"`, `"Water"`, `"D263TECO"`, and `Custom` user-defined glass).
 * - Handles `medium = "CaF2"`, `"Fused Silica"`, `"Water"`, and `"D263TECO"` by emitting the variable names `caf2`, `fused_silica`, `water`, and `d263teco` respectively (defined in the export script preamble).
 * - Handles `manufacturer = "Custom"` by emitting `user_defined_materials["<label>"]` as the medium expression.
 * - Does not pass `sd=` to `sm.add_surface(...)`.
 * - Emits `sm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=<semiDiameter>, x_offset=0, y_offset=0)]` after `sm.add_surface(...)` for centered circular clear apertures when `semiDiameter > 0`. If `clear_aperture` is omitted, offsets default to `0`.
 * - Emits `OffsetCircular(...)` instead of `Circular(...)` for circular clear apertures when either `offsetX` or `offsetY` is nonzero, so RayOptics edge ray targets include the aperture offset.
 * - Emits `Annular(radius=<semiDiameter>, obstruction_radius=<obstructionRadius>, x_offset=<offsetX>, y_offset=<offsetY>)` for annular clear apertures.
 * - Emits `RonchiRuling(radius=<semiDiameter>, lpmm=<lpmm>, rotation=<rotation>, x_offset=<offsetX>, y_offset=<offsetY>)` for Ronchi clear apertures. Density and rotation remain independent of the surface semi-diameter.
 * - Emits `OffsetRotatedRectangular(x_half_width=<xHalfWidth>, y_half_width=<yHalfWidth>, x_offset=<offsetX>, y_offset=<offsetY>, rotation=<rotation>)` for rectangular clear apertures, independent of `semiDiameter`.
 * - Emits `sm.ifcs[sm.cur_surface].edge_apertures = [Circular(...)]` only when `edge_aperture` is explicitly set and centered; emits `OffsetCircular(...)` when the edge aperture has a nonzero offset; emits `OffsetRotatedRectangular(...)` for rectangular edge apertures.
 * - Surface-specific follow-up mutations are emitted after `sm.add_surface(...)`, in order, so multiple mutations may coexist on the same surface.
 * - If `aspherical.kind === "Conic"`, emits `sm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=..., cc=...)`.
 * - If `aspherical.kind === "EvenAspherical"`, emits `sm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=..., cc=..., coefs=[...])`.
 * - If `aspherical.kind === "RadialPolynomial"`, emits `sm.ifcs[sm.cur_surface].profile = RadialPolynomial(r=..., cc=..., coefs=[...])`.
 * - If `aspherical.kind === "XToroid"`, emits `sm.ifcs[sm.cur_surface].profile = XToroid(r=..., cc=..., cr=..., coefs=[...])`.
 * - If `aspherical.kind === "YToroid"`, emits `sm.ifcs[sm.cur_surface].profile = YToroid(r=..., cc=..., cr=..., coefs=[...])`.
 * - If `decenter` is set, emits `sm.ifcs[sm.cur_surface].decenter = DecenterData(...)`.
 * - If `diffractiveElement.diffractionGrating` is set, emits `sm.ifcs[sm.cur_surface].phase_element = DiffractionGrating(...)`.
 * - If `label === "Stop"`, emits `sm.set_stop()`.
 * 7. Sets `sm.ifcs[-1].profile.r` to the image surface curvature radius.
 * 8. If the image surface has `decenter`, emits `sm.ifcs[-1].decenter = DecenterData(...)`.
 * 9. Calls the selected model's final `opm.update_model()` before vignetting, so opted-in exact launches or native RayOptics launches are current before analysis. Native models call `set_vig_with_ronchi_envelopes(opm)`. Exact models inject `set_vig_respecting_exact_pupil`; Object NA checks the four radius-one rays and bisects inward only when an aperture blocks a boundary, while every other pupil mode delegates to RayOptics. The outer wrapper temporarily replaces each Ronchi mask with its offset circular envelope while the selected vignetting function finds pupil boundaries, then restores the original mask before returning; internal opaque bands therefore cannot collapse a field's sampled pupil.
 * - The object-side setup is isolated in its own builder phase so future object-gap mutations such as `sm.gaps[0].medium = ...` can be added without changing surface-step logic.
 * - The surface-step structure is intentionally extensible so future interface mutations such as `sm.ifcs[sm.cur_surface].phase_element = DiffractionGrating(...)` can be appended alongside asphere and decenter lines for the same surface.
 * - Clear and edge aperture assignments are formatted through dedicated helpers. The clear-aperture helper accepts an optional aperture and defaults omitted offsets to `0`, while the edge-aperture helper requires a present edge aperture before reading its radius and offsets.
 */
export function buildOpticalModelScript(opticalModel: OpticalModel): string {
  return renderPythonBlock(buildOpticalModelLines(opticalModel));
}

/**
 * Combines the model-build script with a computation into a single Python string suitable for a single `runPythonAsync` call. The model-build code is wrapped in a `def _build_opm():` function so that `opm`, `sm`, `osp`, and `pm` are local variables rather than globals. `buildScript` calls `computation("_build_opm()")`, injecting the expression token so the computation can reference the model inline without hardcoding the function name. Example output:
 *
 * ```python
 * def _build_opm():
 * opm = OpticalModel()  # or ExactOpticalModel() for explicit wide-angle mode
 * ...
 * return opm
 * plot_lens_layout(_build_opm())
 * ```
 *
 * The last expression in the combined script is the return value of `runPythonAsync`.
 */
export function buildScript(
  opticalModel: OpticalModel,
  computation: (opm: string) => string,
): string {
  const modelScript = buildOpticalModelScript(opticalModel);
  const indented = modelScript
    .split('\n')
    .map(line => (line.length > 0 ? `    ${line}` : line))
    .join('\n');
  const opmExpr = '_build_opm()';
  return `def _build_opm():\n${indented}\n    return opm\n${computation(opmExpr)}`;
}

/**
 * Returns a string with:
 * > **Warning**: Not for execution inside the Pyodide worker. This script is intended for copy-paste into a Jupyter / RayOptics notebook environment.
 *
 * `buildExportScriptSections(model)` returns:
 * 1. `userDefinedMaterials`, a self-contained block that imports `json` and `InterpolatedMedium`, exposes the conspicuous editable `custom_glass_json_path = "<PATH TO CUSTOM GLASS JSON FILE>"` placeholder, loads the Import Custom Glass page's strict version-1.0 JSON envelope, and constructs `user_defined_materials`. Every entry in the envelope's `Custom` object becomes `InterpolatedMedium(label, pairs=material["data"], cat="custom")` before model construction. An empty `Custom` object produces an empty registry; a custom surface label absent from the file raises Python `KeyError` during the generated lookup.
 * 2. `remainingScript`, containing the other imports, generated standalone helpers, the full output of `buildOpticalModelScript(model)`, and calls to `sm.list_model()`, `pm.first_order_data()`, and `plt.figure(FigureClass=InteractiveLayout, ...)`.
 *
 * `buildExportScript(model)` preserves the string API by joining these sections with exactly two newline characters. The combined string is therefore the payload used by the modal's `Copy all` action.
 */
export function buildExportScriptSections(opticalModel: OpticalModel): PythonExportScriptSections {
  return {
    userDefinedMaterials: buildUserDefinedMaterialsScript(),
    remainingScript: `${buildRemainingExportScript(opticalModel)}

${buildOpticalModelScript(opticalModel)}

sm.list_model()
pm.first_order_data()

layout_plt = plt.figure(FigureClass=InteractiveLayout, opt_model=opm,do_draw_rays=True, do_paraxial_layout=False,is_dark=isdark).plot()`,
  };
}

/** Joins the standalone export sections into the complete copyable Python script. */
export function buildExportScript(opticalModel: OpticalModel): string {
  const sections = buildExportScriptSections(opticalModel);
  return [sections.userDefinedMaterials, sections.remainingScript].join("\n\n");
}
