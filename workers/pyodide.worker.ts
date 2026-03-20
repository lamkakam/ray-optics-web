import { expose } from "comlink";
import { type OpticalModel, type SeidelData } from "../lib/opticalModel";
import { type ZernikeData } from "../lib/zernikeData";
import { type SetAutoApertureFlag } from "../lib/apertureFlag";
import { buildOpticalModelScript } from "../lib/pythonScript";

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
from rayoptics.raytr.trace import apply_paraxial_vignetting
from rayoptics.elem.surface import DecenterData

from rayoptics_web_utils.analysis import get_first_order_data, get_3rd_order_seidel_data
from rayoptics_web_utils.plotting import plot_lens_layout, plot_ray_fan, plot_opd_fan, plot_spot_diagram, plot_surface_by_surface_3rd_order_aberr
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
    const wheelUrl = `${self.location.origin}${basePath}/rayoptics_web_utils-0.1.0-py3-none-any.whl`;

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


// export for testing
export async function _setOpticalSurfaces(opticalModel: OpticalModel, setAutoAperture: SetAutoApertureFlag, runPython: (code: string) => Promise<unknown>): Promise<void> {
  await runPython(
    buildOpticalModelScript(opticalModel, setAutoAperture),
  );
}


/** ONLY USE AFTER setting the optical surfaces */
export async function _getFirstOrderData(runPython: (code: string) => Promise<unknown>): Promise<Record<string, number>> {
  const json = (await runPython("json.dumps(get_first_order_data(opm))")) as string;
  return JSON.parse(json);
}


// ─── Plot Functions (injectable for testing) ─────────────────────────────────

export async function _plotLensLayout(runPython: (code: string) => Promise<unknown>): Promise<string> {
  return (await runPython("plot_lens_layout(opm)")) as string;
}

export async function _plotRayFan(runPython: (code: string) => Promise<unknown>, fieldIndex: number): Promise<string> {
  return (await runPython(`plot_ray_fan(${fieldIndex}, opm)`)) as string;
}

export async function _plotOpdFan(runPython: (code: string) => Promise<unknown>, fieldIndex: number): Promise<string> {
  return (await runPython(`plot_opd_fan(${fieldIndex}, opm)`)) as string;
}

export async function _plotSpotDiagram(runPython: (code: string) => Promise<unknown>, fieldIndex: number): Promise<string> {
  return (await runPython(`plot_spot_diagram(${fieldIndex}, opm)`)) as string;
}

export async function _plotSurfaceBySurface3rdOrderAberr(runPython: (code: string) => Promise<unknown>): Promise<string> {
  return (await runPython("plot_surface_by_surface_3rd_order_aberr(opm)")) as string;
}

export async function _get3rdOrderSeidelData(runPython: (code: string) => Promise<unknown>): Promise<SeidelData> {
  const json = (await runPython("json.dumps(get_3rd_order_seidel_data(opm))")) as string;
  return JSON.parse(json) as SeidelData;
}


// Expose for Components
export async function setOpticalSurfaces(opticalModel: OpticalModel, setAutoAperture: SetAutoApertureFlag): Promise<void> {
  await _setOpticalSurfaces(opticalModel, setAutoAperture, requirePyodide());
}

export async function getFirstOrderData(): Promise<Record<string, number>> {
  return await _getFirstOrderData(requirePyodide());
}

export async function plotLensLayout(): Promise<string> {
  return await _plotLensLayout(requirePyodide());
}

export async function plotRayFan(fieldIndex: number): Promise<string> {
  return await _plotRayFan(requirePyodide(), fieldIndex);
}

export async function plotOpdFan(fieldIndex: number): Promise<string> {
  return await _plotOpdFan(requirePyodide(), fieldIndex);
}

export async function plotSpotDiagram(fieldIndex: number): Promise<string> {
  return await _plotSpotDiagram(requirePyodide(), fieldIndex);
}

export async function plotSurfaceBySurface3rdOrderAberr(): Promise<string> {
  return await _plotSurfaceBySurface3rdOrderAberr(requirePyodide());
}

export async function get3rdOrderSeidelData(): Promise<SeidelData> {
  return await _get3rdOrderSeidelData(requirePyodide());
}

export async function _getZernikeCoefficients(
  runPython: (code: string) => Promise<unknown>,
  fieldIndex: number,
  wvlIndex: number,
  numTerms: number = 56,
): Promise<ZernikeData> {
  const json = (await runPython(
    `from rayoptics_web_utils.zernike import get_zernike_coefficients\njson.dumps(get_zernike_coefficients(opm, ${fieldIndex}, ${wvlIndex}, num_terms=${numTerms}))`
  )) as string;
  return JSON.parse(json) as ZernikeData;
}

export async function getZernikeCoefficients(
  fieldIndex: number,
  wvlIndex: number,
  numTerms?: number,
): Promise<ZernikeData> {
  return await _getZernikeCoefficients(requirePyodide(), fieldIndex, wvlIndex, numTerms);
}

expose({
  init,
  setOpticalSurfaces,
  getFirstOrderData,
  plotLensLayout,
  plotRayFan,
  plotOpdFan,
  plotSpotDiagram,
  plotSurfaceBySurface3rdOrderAberr,
  get3rdOrderSeidelData,
  getZernikeCoefficients,
});