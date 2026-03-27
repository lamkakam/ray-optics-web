import { expose } from "comlink";
import { type OpticalModel, type SeidelData, type FocusingResult } from "../lib/opticalModel";
import { type ZernikeData, type ZernikeOrdering } from "../lib/zernikeData";
import { buildScript } from "../lib/pythonScript";

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

from rayoptics_web_utils.analysis import get_first_order_data, get_3rd_order_seidel_data
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
    const wheelUrl = `${self.location.origin}${basePath}/rayoptics_web_utils-0.2.7-py3-none-any.whl`;

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

export async function _plotLensLayout(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel): Promise<string> {
  return (await runPython(buildScript(opticalModel, (opm) => `plot_lens_layout(${opm})`))) as string;
}

export async function _plotRayFan(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<string> {
  return (await runPython(buildScript(opticalModel, (opm) => `plot_ray_fan(${fieldIndex}, ${opm})`))) as string;
}

export async function _plotOpdFan(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<string> {
  return (await runPython(buildScript(opticalModel, (opm) => `plot_opd_fan(${fieldIndex}, ${opm})`))) as string;
}

export async function _plotSpotDiagram(runPython: (code: string) => Promise<unknown>, opticalModel: OpticalModel, fieldIndex: number): Promise<string> {
  return (await runPython(buildScript(opticalModel, (opm) => `plot_spot_diagram(${fieldIndex}, ${opm})`))) as string;
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

export async function _plotGeoPSF(
  runPython: (code: string) => Promise<unknown>,
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 64,
): Promise<string> {
  return (await runPython(buildScript(opticalModel, (opm) => `plot_geo_psf(${fieldIndex}, ${wavelengthIndex}, ${opm}, num_rays=${numRays})`))) as string;
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


// ─── Public API (exposed via Comlink) ─────────────────────────────────────────

export async function getFirstOrderData(opticalModel: OpticalModel): Promise<Record<string, number>> {
  return await _getFirstOrderData(requirePyodide(), opticalModel);
}

export async function plotLensLayout(opticalModel: OpticalModel): Promise<string> {
  return await _plotLensLayout(requirePyodide(), opticalModel);
}

export async function plotRayFan(opticalModel: OpticalModel, fieldIndex: number): Promise<string> {
  return await _plotRayFan(requirePyodide(), opticalModel, fieldIndex);
}

export async function plotOpdFan(opticalModel: OpticalModel, fieldIndex: number): Promise<string> {
  return await _plotOpdFan(requirePyodide(), opticalModel, fieldIndex);
}

export async function plotSpotDiagram(opticalModel: OpticalModel, fieldIndex: number): Promise<string> {
  return await _plotSpotDiagram(requirePyodide(), opticalModel, fieldIndex);
}

export async function plotSurfaceBySurface3rdOrderAberr(opticalModel: OpticalModel): Promise<string> {
  return await _plotSurfaceBySurface3rdOrderAberr(requirePyodide(), opticalModel);
}

export async function plotWavefrontMap(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 64,
): Promise<string> {
  return await _plotWavefrontMap(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, numRays);
}

export async function plotGeoPSF(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 64,
): Promise<string> {
  return await _plotGeoPSF(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, numRays);
}

export async function plotDiffractionPSF(
  opticalModel: OpticalModel,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays: number = 64,
  maxDims: number = 256,
): Promise<string> {
  return await _plotDiffractionPSF(requirePyodide(), opticalModel, fieldIndex, wavelengthIndex, numRays, maxDims);
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

expose({
  init,
  getFirstOrderData,
  plotLensLayout,
  plotRayFan,
  plotOpdFan,
  plotSpotDiagram,
  plotSurfaceBySurface3rdOrderAberr,
  plotWavefrontMap,
  plotGeoPSF,
  plotDiffractionPSF,
  get3rdOrderSeidelData,
  getZernikeCoefficients,
  focusByMonoRmsSpot,
  focusByMonoStrehl,
  focusByPolyRmsSpot,
  focusByPolyStrehl,
});