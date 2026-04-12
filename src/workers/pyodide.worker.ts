import { expose } from "comlink";
import { type DiffractionPsfData, type GeoPsfData, type OpdFanData, type OpticalModel, type RayFanData, type SeidelData, type FocusingResult, type SpotDiagramData, type WavefrontMapData } from "@/shared/lib/types/opticalModel";
import { type ZernikeData, type ZernikeOrdering } from "@/shared/lib/types/zernikeData";
import { buildScript } from "@/shared/lib/utils/pythonScript";
import { type RawAllGlassCatalogsData } from "@/shared/lib/types/glassMap";

declare function importScripts(...urls: string[]): void;
declare function loadPyodide(opts: { indexURL: string }): Promise<any>;

const CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full";

let pyodide: any = null;

/** For testing only — resets the singleton so init() can be re-tested. */
export function _resetPyodideForTesting(): void {
  pyodide = null;
}

// ─── DANGEROUS ZONE ────────────────────────────────────────────────────────────────────
// WARNING: DON'T TOUCH THIS PART UNLESS YOU KNOW WHAT YOU ARE DOING

// export for testing
export async function _init(
  runPython: (code: string) => Promise<unknown>,
  wheelUrl: string
): Promise<void> {
  await runPython(`
import micropip
await micropip.install("rayoptics==0.9.8", deps=False)
await micropip.install("opticalglass==1.1.1", deps=False)
`);

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

  await runPython(`
import micropip
await micropip.install("${wheelUrl}", deps=False)
from rayoptics_web_utils import init as _rwu_init
_rwu_init_result = _rwu_init()
caf2 = _rwu_init_result['caf2']

import json
from rayoptics.environment import *
from rayoptics.raytr.vigcalc import set_vig
from rayoptics.elem.surface import DecenterData
from rayoptics.elem.profiles import XToroid, YToroid

from rayoptics_web_utils.analysis import get_first_order_data, get_3rd_order_seidel_data, get_ray_fan_data, get_opd_fan_data, get_spot_data, get_wavefront_data, get_geo_psf_data, get_diffraction_psf_data
from rayoptics_web_utils.plotting import (
    plot_lens_layout,
    plot_ray_fan,
    plot_opd_fan,
    plot_spot_diagram,
    plot_surface_by_surface_3rd_order_aberr,
    plot_wavefront_map,
    plot_geo_psf,
    plot_diffraction_psf,
)
from rayoptics_web_utils.focusing import focus_by_mono_rms_spot, focus_by_mono_strehl, focus_by_poly_rms_spot, focus_by_poly_strehl
from rayoptics_web_utils.glass.glass import get_all_glass_catalogs_data
`);
}

export async function init(): Promise<void> {
  if (pyodide) return;
  try {
    importScripts(`${CDN}/pyodide.js`);
    pyodide = await loadPyodide({ indexURL: `${CDN}/` });

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
    const wheelUrl = `${self.location.origin}${basePath}/rayoptics_web_utils-0.2.11-py3-none-any.whl`;

    await _init(pyodide.runPythonAsync.bind(pyodide), wheelUrl);
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


// ─── Injectable variants for testing ─────────────────────────────────────────

export async function _getFirstOrderData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<Record<string, number>> {
  const json = (await runPython(buildScript(opticalModel, (opm) => `json.dumps(get_first_order_data(${opm}))`))) as string;
  return JSON.parse(json);
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

export async function _plotRayFan(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<string> {
  return (await runPython(buildScript(opticalModel, (opm) => `plot_ray_fan(${fieldIndex}, ${opm})`))) as string;
}

export async function _getRayFanData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
): Promise<RayFanData> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(get_ray_fan_data(${opm}, ${fieldIndex}))`),
  )) as string;
  return JSON.parse(json) as RayFanData;
}

export async function _plotOpdFan(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<string> {
  return (await runPython(buildScript(opticalModel, (opm) => `plot_opd_fan(${fieldIndex}, ${opm})`))) as string;
}

export async function _getOpdFanData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
): Promise<OpdFanData> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(get_opd_fan_data(${opm}, ${fieldIndex}))`),
  )) as string;
  return JSON.parse(json) as OpdFanData;
}

export async function _plotSpotDiagram(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<string> {
  return (await runPython(buildScript(opticalModel, (opm) => `plot_spot_diagram(${fieldIndex}, ${opm})`))) as string;
}

export async function _getSpotDiagramData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
): Promise<SpotDiagramData> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `json.dumps(get_spot_data(${opm}, ${fieldIndex}))`),
  )) as string;
  return JSON.parse(json) as SpotDiagramData;
}

export async function _plotSurfaceBySurface3rdOrderAberr(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<string> {
  return (await runPython(buildScript(opticalModel, (opm) => `plot_surface_by_surface_3rd_order_aberr(${opm})`))) as string;
}

export async function _get3rdOrderSeidelData(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<SeidelData> {
  const json = (await runPython(buildScript(opticalModel, (opm) => `json.dumps(get_3rd_order_seidel_data(${opm}))`))) as string;
  return JSON.parse(json) as SeidelData;
}

export async function _plotWavefrontMap(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 64,
): Promise<string> {
  return (await runPython(buildScript(opticalModel, (opm) => `plot_wavefront_map(${fieldIndex}, ${wavelengthIndex}, ${opm}, num_rays=${numRays})`))) as string;
}

export async function _getWavefrontData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 64,
): Promise<WavefrontMapData> {
  const json = (await runPython(
    buildScript(
      opticalModel,
      (opm) => `json.dumps(get_wavefront_data(${opm}, ${fieldIndex}, ${wavelengthIndex}, num_rays=${numRays}))`,
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

export async function _plotGeoPSF(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 64,
): Promise<string> {
  return (await runPython(buildScript(opticalModel, (opm) => `plot_geo_psf(${fieldIndex}, ${wavelengthIndex}, ${opm}, num_rays=${numRays})`))) as string;
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

export async function _plotDiffractionPSF(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 64,
  maxDims: number = 256,
): Promise<string> {
  return (await runPython(
    buildScript(
      opticalModel, 
      (opm) => `plot_diffraction_psf(${fieldIndex}, ${wavelengthIndex}, ${opm}, num_rays=${numRays}, max_dims=${maxDims})`,
    ),
  )) as string;
}

export async function _getDiffractionPSFData(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 64,
  maxDims: number = 256,
): Promise<DiffractionPsfData> {
  const json = (await runPython(
    buildScript(
      opticalModel,
      (opm) => `json.dumps(get_diffraction_psf_data(${opm}, ${fieldIndex}, ${wavelengthIndex}, num_rays=${numRays}, max_dims=${maxDims}))`,
    ),
  )) as string;
  return JSON.parse(json) as DiffractionPsfData;
}

export async function _getZernikeCoefficients(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  wvlIndex: number,
  numTerms: number = 37,
  ordering: ZernikeOrdering = "noll",
): Promise<ZernikeData> {
  const json = (await runPython(
    buildScript(opticalModel, (opm) => `from rayoptics_web_utils.zernike import get_zernike_coefficients\njson.dumps(get_zernike_coefficients(${opm}, ${fieldIndex}, ${wvlIndex}, num_terms=${numTerms}, ordering='${ordering}'))`)
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
): Promise<RawAllGlassCatalogsData> {
  const json = (await runPython(`json.dumps(get_all_glass_catalogs_data())`)) as string;
  return JSON.parse(json) as RawAllGlassCatalogsData;
}


// ─── Public API (exposed via Comlink) ─────────────────────────────────────────

export async function getFirstOrderData(opticalModel: OpticalModel): Promise<Record<string, number>> {
  return await _getFirstOrderData(requirePyodide(), opticalModel);
}

export async function plotLensLayout(opticalModel: OpticalModel, isDark: boolean): Promise<string> {
  return await _plotLensLayout(requirePyodide(), opticalModel, isDark);
}

export async function plotRayFan(opticalModel: OpticalModel, fieldIndex: number): Promise<string> {
  return await _plotRayFan(requirePyodide(), opticalModel, fieldIndex);
}

export async function getRayFanData(opticalModel: OpticalModel, fieldIndex: number): Promise<RayFanData> {
  return await _getRayFanData(requirePyodide(), opticalModel, fieldIndex);
}

export async function plotOpdFan(opticalModel: OpticalModel, fieldIndex: number): Promise<string> {
  return await _plotOpdFan(requirePyodide(), opticalModel, fieldIndex);
}

export async function getOpdFanData(opticalModel: OpticalModel, fieldIndex: number): Promise<OpdFanData> {
  return await _getOpdFanData(requirePyodide(), opticalModel, fieldIndex);
}

export async function plotSpotDiagram(opticalModel: OpticalModel, fieldIndex: number): Promise<string> {
  return await _plotSpotDiagram(requirePyodide(), opticalModel, fieldIndex);
}

export async function getSpotDiagramData(opticalModel: OpticalModel, fieldIndex: number): Promise<SpotDiagramData> {
  return await _getSpotDiagramData(requirePyodide(), opticalModel, fieldIndex);
}

export async function plotSurfaceBySurface3rdOrderAberr(opticalModel: OpticalModel): Promise<string> {
  return await _plotSurfaceBySurface3rdOrderAberr(requirePyodide(), opticalModel);
}

export async function plotWavefrontMap(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 128,
): Promise<string> {
  return await _plotWavefrontMap(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, numRays);
}

export async function getWavefrontData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 128,
): Promise<WavefrontMapData> {
  return await _getWavefrontData(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, numRays);
}

export async function plotGeoPSF(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 128,
): Promise<string> {
  return await _plotGeoPSF(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, numRays);
}

export async function getGeoPSFData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 128,
): Promise<GeoPsfData> {
  return await _getGeoPSFData(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, numRays);
}

export async function plotDiffractionPSF(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 128,
  maxDims: number = 256,
): Promise<string> {
  return await _plotDiffractionPSF(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, numRays, maxDims);
}

export async function getDiffractionPSFData(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 128,
  maxDims: number = 256,
): Promise<DiffractionPsfData> {
  return await _getDiffractionPSFData(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, numRays, maxDims);
}


export async function get3rdOrderSeidelData(opticalModel: OpticalModel): Promise<SeidelData> {
  return await _get3rdOrderSeidelData(requirePyodide(), opticalModel);
}

export async function getZernikeCoefficients(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wvlIndex: number,
  numTerms?: number,
  ordering?: ZernikeOrdering,
): Promise<ZernikeData> {
  return await _getZernikeCoefficients(requirePyodide(), opticalModel, fieldIndex, wvlIndex, numTerms, ordering);
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

export async function getAllGlassCatalogsData(): Promise<RawAllGlassCatalogsData> {
  return await _getAllGlassCatalogsData(requirePyodide());
}

expose({
  init,
  getFirstOrderData,
  plotLensLayout,
  plotRayFan,
  getRayFanData,
  plotOpdFan,
  getOpdFanData,
  plotSpotDiagram,
  getSpotDiagramData,
  plotSurfaceBySurface3rdOrderAberr,
  plotWavefrontMap,
  getWavefrontData,
  getGeoPSFData,
  plotGeoPSF,
  plotDiffractionPSF,
  getDiffractionPSFData,
  get3rdOrderSeidelData,
  getZernikeCoefficients,
  focusByMonoRmsSpot,
  focusByMonoStrehl,
  focusByPolyRmsSpot,
  focusByPolyStrehl,
  getAllGlassCatalogsData,
});
