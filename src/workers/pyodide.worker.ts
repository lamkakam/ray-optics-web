/**
 * Long-lived Pyodide module worker for off-main-thread RayOptics computation.
 *
 * @remarks
 * Public computations are stateless: each builds an optical model inside one
 * `runPython` call. The singleton owns only the initialized runtime, user-defined
 * material registry, and active optimization-interrupt lifecycle shared by
 * continuous and glass-expert runs.
 *
 * `init` reports deterministic startup milestones while loading the pinned Pyodide
 * runtime, Python dependencies, and local wheel. Injectable `_*` variants accept a
 * `runPython` dependency for isolated testing; their individual contracts live on
 * their declarations. Comlink exposes the public wrappers at the end of this module.
 *
 * All public computations obtain the executor through `requirePyodide`, which throws
 * until initialization succeeds. Initialization clears the singleton on failure so
 * callers can retry, and prefixes the pinned `rayoptics_web_utils-0.24.0` wheel
 * URL with `NEXT_PUBLIC_BASE_PATH`.
 * User-defined glass mutations share the Python material registry and use NumPy-safe
 * JSON serialization. Both optimization RPCs temporarily own the same progress
 * callback and interrupt-buffer lifecycle, clearing both on every completion path;
 * stop requests affect only the matching active run id.
 */
import { expose } from "comlink";
import { loadPyodide, version } from "pyodide";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { FocusingResult } from "@/features/lens-editor/types/focusingResult";
import type { AstigmatismCurveData, DiffractionMtfData, DiffractionPsfData, FieldCurveData, GeoPsfData, LongitudinalSphericalAberrationData, OpdFanData, RayFanData, SpotDiagramData, StrehlVsWavelengthData, WavefrontMapData } from "@/features/analysis/types/plotData";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import {
  type GlassOptimizationConfig,
  type GlassOptimizationReport,
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

/** Injects or clears the Pyodide singleton and resets all optimization-interrupt state for tests. */
export function _setPyodideForTesting(nextPyodide: any | undefined): void {
  pyodide = nextPyodide ?? null;
  activeOptimizationRunId = undefined;
  activeOptimizationInterruptBuffer = undefined;
  activeOptimizationInterruptView = undefined;
}

/** Returns the active optimization run id and interrupt buffer for lifecycle assertions. */
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
/**
 * Installs pinned RayOptics and support packages, installs the local wheel, and
 * binds the Python globals required by generated scripts.
 *
 * @param runPython - Injected asynchronous Python executor.
 * @param wheelUrl - Absolute URL of the local `rayoptics_web_utils` wheel.
 * @param onProgress - Optional receiver for the 60%, 75%, and 85% milestones.
 */
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
from rayoptics_web_utils.optimization import evaluate_optimization_problem, optimize_glasses, optimize_opm
`);
}

/**
 * Initializes the singleton Pyodide runtime and reports determinate milestones.
 * Repeated calls are no-ops except for reporting the ready milestone.
 */
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
    const wheelUrl = `${self.location.origin}${basePath}/rayoptics_web_utils-0.24.0-py3-none-any.whl`;

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

/** Runs `get_first_order_data` for an injected Python executor and parses the JSON result. */
export async function _getFirstOrderData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<Record<string, number>> {
  const json = (await runPython(buildScript(opticalModel, (opm) => `json.dumps(get_first_order_data(${opm}))`))) as string;
  return JSON.parse(json);
}

/** Builds and updates the model with an injected executor, then parses ordered surface semi-diameters. */
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

/** Plots a lens layout with injected execution, deriving the wavelength-overlay flag from diffraction gratings. */
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

/** Loads transverse ray-fan data with injected execution and normalizes blocked ordinates to `undefined` gaps. */
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

/** Loads OPD-fan data with injected execution and normalizes blocked ordinates to `undefined` gaps. */
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

/** Loads and parses per-wavelength spot-diagram points with injected execution. */
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

/** Loads and parses sagittal and tangential field-curvature data with injected execution. */
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

/** Loads and parses the astigmatic-separation curve with injected execution. */
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

/** Loads and parses all-wavelength longitudinal spherical-aberration data with injected execution. */
export async function _getLSAData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
): Promise<LongitudinalSphericalAberrationData> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(get_lsa_data(${opm}))`),
  )) as string;
  return JSON.parse(json) as LongitudinalSphericalAberrationData;
}

/** Loads and parses third-order Seidel data with injected execution. */
export async function _get3rdOrderSeidelData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<SeidelData> {
  const json = (await runPython(buildScript(opticalModel, (opm) => `json.dumps(get_3rd_order_seidel_data(${opm}))`))) as string;
  return JSON.parse(json) as SeidelData;
}

/** Loads and parses a wavefront map for one field, wavelength, and image reference with injected execution. */
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

/**
 * Loads and parses sampled Strehl-versus-wavelength data with injected execution.
 *
 * @param wavelengthSamples - Number of wavelength samples; defaults to 100.
 * @param numRays - Ray-grid size; defaults to 21.
 */
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

/** Loads and parses geometric-PSF points with injected execution. */
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

/**
 * Loads and parses a cropped central diffraction-PSF grid with injected execution.
 *
 * @param imagePoint - Image reference passed to Python; defaults to the chief ray.
 * @param numRays - Ray-grid size; defaults to 128.
 * @param maxDims - Maximum returned grid dimension; defaults to 1024.
 */
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

/**
 * Loads and parses diffraction-MTF sagittal and tangential series with injected execution.
 *
 * @param imagePoint - Image reference passed to Python; defaults to the chief ray.
 * @param numRays - Ray-grid size; defaults to 128.
 * @param maxDims - Maximum sampled grid dimension; defaults to 1024.
 */
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

/**
 * Converts the requested ordering to explicit Zernike terms, reconstructs them in
 * Python, and parses the returned coefficients. Python receives the explicit term
 * list rather than the ordering name.
 *
 * @param numTerms - Number of coefficients; defaults to 37.
 * @param ordering - TypeScript-owned term ordering; defaults to Noll ordering.
 */
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


/** Focuses with an injected executor by minimizing monochromatic RMS spot radius. */
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

/** Focuses with an injected executor by maximizing monochromatic Strehl ratio. */
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

/** Focuses with an injected executor by minimizing polychromatic RMS spot radius. */
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

/** Focuses with an injected executor by maximizing polychromatic Strehl ratio. */
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

/** Loads and parses all built-in glass catalogs with injected execution. */
export async function _getAllGlassCatalogsData(
  runPython: (code: string) => Promise<unknown>
): Promise<CompleteGlassCatalogsData> {
  const json = (await runPython(`json.dumps(get_all_glass_catalogs_data())`)) as string;
  return JSON.parse(json) as CompleteGlassCatalogsData;
}

/** Prevalidates absent names, adds tabulated materials, and returns NumPy-safe serialized material data. */
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

/** Prevalidates existing names and deletes user-defined materials without a return payload. */
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

/** Prevalidates existing names, replaces their pairs, and returns NumPy-safe serialized material data. */
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

/** Reads named user-defined materials and returns their NumPy-safe serialized data. */
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

/** Serializes the config into Python, evaluates residuals without solving, and parses the report. */
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

/**
 * Runs optimization with injected execution, optional streamed progress, and
 * optional per-run interruption. The serialized config is reconstructed in Python;
 * temporary callback globals and interrupt state are always cleared in `finally`.
 *
 * @param onProgress - Optional live receiver for parsed optimization snapshots.
 * @param runId - Identifier used to reject stale stop requests.
 * @param interruptBuffer - Shared buffer installed only for an interrupt-capable run.
 * @returns The parsed JSON-safe optimization report.
 */
export async function _optimizeOpm(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  config: OptimizationConfig,
  imagePoint: ImagePoint = "chief_ray",
  onProgress?: (progress: ReadonlyArray<OptimizationProgressEntry>) => void | Promise<void>,
  runId?: string,
  interruptBuffer?: SharedArrayBuffer,
): Promise<OptimizationReport> {
  return await runOptimization(
    runPython,
    opticalModel,
    config,
    "optimize_opm",
    imagePoint,
    onProgress,
    runId,
    interruptBuffer,
  );
}

/**
 * Runs glass-expert optimization with the shared callback/interrupt lifecycle.
 * The flat config is JSON-reconstructed inside Python and the candidate-aware
 * progress history is parsed without replacing absent optional fields with null.
 */
export async function _optimizeGlasses(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  config: GlassOptimizationConfig,
  imagePoint: ImagePoint = "chief_ray",
  onProgress?: (progress: ReadonlyArray<OptimizationProgressEntry>) => void | Promise<void>,
  runId?: string,
  interruptBuffer?: SharedArrayBuffer,
): Promise<GlassOptimizationReport> {
  return await runOptimization(
    runPython,
    opticalModel,
    config,
    "optimize_glasses",
    imagePoint,
    onProgress,
    runId,
    interruptBuffer,
  );
}

/** Owns temporary Pyodide progress globals and per-run interrupt state for either optimizer RPC. */
async function runOptimization<TReport extends OptimizationReport | GlassOptimizationReport>(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  config: OptimizationConfig | GlassOptimizationConfig,
  pythonFunction: "optimize_opm" | "optimize_glasses",
  imagePoint: ImagePoint,
  onProgress?: (progress: ReadonlyArray<OptimizationProgressEntry>) => void | Promise<void>,
  runId?: string,
  interruptBuffer?: SharedArrayBuffer,
): Promise<TReport> {
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

  const canBindInterruptBuffer = runId !== undefined
    && interruptBuffer !== undefined
    && pyodide !== null
    && typeof pyodide.setInterruptBuffer === "function";
  let progressBindingStarted = false;
  let interruptBindingStarted = false;
  try {
    if (canBindProgressCallback) {
      progressBindingStarted = true;
      pyodide.globals.set("_optimization_progress_callback", reportProgress);
    }
    if (canBindInterruptBuffer) {
      const interruptView = new Int32Array(interruptBuffer);
      Atomics.store(interruptView, 0, 0);
      activeOptimizationRunId = runId;
      activeOptimizationInterruptBuffer = interruptBuffer;
      activeOptimizationInterruptView = interruptView;
      interruptBindingStarted = true;
      pyodide.setInterruptBuffer(interruptView);
    }
    const json = (await runPython(
      buildScript(
        opticalModel,
        (opm) => !canBindProgressCallback
          ? `json.dumps(${pythonFunction}(${opm}, json.loads(${JSON.stringify(configJson)}), image_point='${imagePoint}'))`
          : `
def _report_optimization_progress(progress):
    _optimization_progress_callback(json.dumps(progress))
json.dumps(${pythonFunction}(${opm}, json.loads(${JSON.stringify(configJson)}), image_point='${imagePoint}', progress_reporter=_report_optimization_progress))
`,
      ),
    )) as string;
    return JSON.parse(json) as TReport;
  } finally {
    try {
      if (interruptBindingStarted) {
        try {
          pyodide.setInterruptBuffer(undefined);
        } finally {
          if (activeOptimizationInterruptView !== undefined) {
            Atomics.store(activeOptimizationInterruptView, 0, 0);
          }
          activeOptimizationRunId = undefined;
          activeOptimizationInterruptBuffer = undefined;
          activeOptimizationInterruptView = undefined;
        }
      }
    } finally {
      if (progressBindingStarted) {
        pyodide.globals.delete("_optimization_progress_callback");
      }
    }
  }
}

/** Signals the active interrupt view only when the requested run id still matches. */
export async function _requestOptimizationStop(runId: string): Promise<{ readonly signaled: boolean }> {
  if (runId !== activeOptimizationRunId || activeOptimizationInterruptView === undefined) {
    return { signaled: false };
  }

  Atomics.store(activeOptimizationInterruptView, 0, PYODIDE_INTERRUPT_SIGNAL);
  return { signaled: true };
}


// ─── Public API (exposed via Comlink) ─────────────────────────────────────────

/** Returns first-order optical data, including EFL and f-number. */
export async function getFirstOrderData(opticalModel: OpticalModel): Promise<Record<string, number>> {
  return await _getFirstOrderData(requirePyodide(), opticalModel);
}

/** Builds and updates the model, then returns ordered surface semi-diameters. */
export async function getSurfaceSemiDiameters(opticalModel: OpticalModel): Promise<number[]> {
  return await _getSurfaceSemiDiameters(requirePyodide(), opticalModel);
}

/** Returns a base64 lens-layout PNG with theme and diffraction overlays applied. */
export async function plotLensLayout(opticalModel: OpticalModel, isDark: boolean): Promise<string> {
  return await _plotLensLayout(requirePyodide(), opticalModel, isDark);
}

/** Returns all-wavelength transverse ray-fan series with blocked samples represented as gaps. */
export async function getRayFanData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  imagePoint: ImagePoint = "chief_ray",
): Promise<RayFanData> {
  return await _getRayFanData(requirePyodide(), opticalModel, fieldIndex, imagePoint);
}

/** Returns all-wavelength OPD-fan series with blocked samples represented as gaps. */
export async function getOpdFanData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  imagePoint: ImagePoint = "chief_ray",
): Promise<OpdFanData> {
  return await _getOpdFanData(requirePyodide(), opticalModel, fieldIndex, imagePoint);
}

/** Returns per-wavelength spot-diagram point clouds. */
export async function getSpotDiagramData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  imagePoint: ImagePoint = "chief_ray",
): Promise<SpotDiagramData> {
  return await _getSpotDiagramData(requirePyodide(), opticalModel, fieldIndex, imagePoint);
}

/** Returns sagittal and tangential field-curvature data for one wavelength. */
export async function getFieldCurvatureData(opticalModel: OpticalModel, wavelengthIndex: number): Promise<FieldCurveData> {
  return await _getFieldCurvatureData(requirePyodide(), opticalModel, wavelengthIndex);
}

/** Returns the astigmatic-separation curve for one wavelength. */
export async function getAstigmatismCurveData(opticalModel: OpticalModel, wavelengthIndex: number): Promise<AstigmatismCurveData> {
  return await _getAstigmatismCurveData(requirePyodide(), opticalModel, wavelengthIndex);
}

/** Returns longitudinal spherical aberration series for all wavelengths. */
export async function getLSAData(opticalModel: OpticalModel): Promise<LongitudinalSphericalAberrationData> {
  return await _getLSAData(requirePyodide(), opticalModel);
}

/** Returns a wavefront-map grid for one field, wavelength, and image reference. */
export async function getWavefrontData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  imagePoint: ImagePoint = "chief_ray",
  numRays: number = 128,
): Promise<WavefrontMapData> {
  return await _getWavefrontData(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, imagePoint, numRays);
}

/** Returns sampled Strehl values across wavelength for one field, using 100 wavelength samples and 21 rays by default. */
export async function getStrehlVsWavelengthData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  imagePoint: ImagePoint = "chief_ray",
  wavelengthSamples: number = 100,
  numRays: number = 21,
): Promise<StrehlVsWavelengthData> {
  return await _getStrehlVsWavelengthData(requirePyodide(), opticalModel, fieldIndex, imagePoint, wavelengthSamples, numRays);
}

/** Returns geometric-PSF points for one field and wavelength. */
export async function getGeoPSFData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 128,
): Promise<GeoPsfData> {
  return await _getGeoPSFData(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, numRays);
}

/** Returns the cropped central diffraction-PSF grid, using 128 rays and a 1024-pixel maximum dimension by default. */
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

/** Returns diffraction-MTF sagittal and tangential series, using 128 rays and a 1024-pixel maximum dimension by default. */
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


/** Returns third-order Seidel aberration data for the model. */
export async function get3rdOrderSeidelData(opticalModel: OpticalModel): Promise<SeidelData> {
  return await _get3rdOrderSeidelData(requirePyodide(), opticalModel);
}

/** Returns explicitly ordered Zernike coefficients for one field and wavelength, defaulting to 37 Noll-ordered terms. */
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

/** Focuses by minimizing monochromatic RMS spot radius. */
export async function focusByMonoRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult> {
  return await _focusByMonoRmsSpot(requirePyodide(), opticalModel, fieldIndex);
}

/** Focuses by maximizing monochromatic Strehl ratio. */
export async function focusByMonoStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult> {
  return await _focusByMonoStrehl(requirePyodide(), opticalModel, fieldIndex);
}

/** Focuses by minimizing polychromatic RMS spot radius. */
export async function focusByPolyRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult> {
  return await _focusByPolyRmsSpot(requirePyodide(), opticalModel, fieldIndex);
}

/** Focuses by maximizing polychromatic Strehl ratio. */
export async function focusByPolyStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult> {
  return await _focusByPolyStrehl(requirePyodide(), opticalModel, fieldIndex);
}

/** Returns normalized data for every built-in glass catalog. */
export async function getAllGlassCatalogsData(): Promise<AllGlassCatalogsData> {
  return await _getAllGlassCatalogsData(requirePyodide());
}

/** Adds prevalidated user-defined materials and returns their serialized data. */
export async function addUserDefinedGlasses(materials: readonly UserDefinedGlassInput[]): Promise<UserDefinedMaterialsData> {
  return await _addUserDefinedGlasses(requirePyodide(), materials);
}

/** Deletes user-defined materials after verifying that every name exists. */
export async function deleteUserDefinedGlasses(names: readonly string[]): Promise<void> {
  await _deleteUserDefinedGlasses(requirePyodide(), names);
}

/** Replaces existing user-defined materials and returns their serialized data. */
export async function updateUserDefinedGlasses(materials: readonly UserDefinedGlassInput[]): Promise<UserDefinedMaterialsData> {
  return await _updateUserDefinedGlasses(requirePyodide(), materials);
}

/** Returns serialized data for named user-defined materials. */
export async function getUserDefinedGlasses(names: readonly string[]): Promise<UserDefinedMaterialsData> {
  return await _getUserDefinedGlasses(requirePyodide(), names);
}

/** Reports whether Pyodide and the browser support shared-buffer interruption. */
export async function canInterruptOptimization(): Promise<boolean> {
  return pyodide !== null
    && typeof pyodide.setInterruptBuffer === "function"
    && typeof SharedArrayBuffer !== "undefined";
}

/** Signals only the matching active optimization run. */
export async function requestOptimizationStop(runId: string): Promise<{ readonly signaled: boolean }> {
  return await _requestOptimizationStop(runId);
}

/** Evaluates and returns the optimization residual report without running SciPy. */
export async function evaluateOptimizationProblem(
  opticalModel: OpticalModel,
  config: OptimizationConfig,
  imagePoint: ImagePoint = "chief_ray",
): Promise<OptimizationReport> {
  return await _evaluateOptimizationProblem(requirePyodide(), opticalModel, config, imagePoint);
}

/** Runs optimization with optional streamed progress and per-run interruption. */
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

/** Runs mixed glass/continuous optimization with optional progress and interruption. */
export async function optimizeGlasses(
  opticalModel: OpticalModel,
  config: GlassOptimizationConfig,
  imagePoint: ImagePoint = "chief_ray",
  onProgress?: (progress: ReadonlyArray<OptimizationProgressEntry>) => void | Promise<void>,
  runId?: string,
  interruptBuffer?: SharedArrayBuffer,
): Promise<GlassOptimizationReport> {
  return await _optimizeGlasses(requirePyodide(), opticalModel, config, imagePoint, onProgress, runId, interruptBuffer);
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
  optimizeGlasses,
  optimizeOpm,
});
