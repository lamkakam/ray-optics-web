import { expose } from "comlink";
import { type OpticalModel } from "../lib/opticalModel";

declare function importScripts(...urls: string[]): void;
declare function loadPyodide(opts: { indexURL: string }): Promise<any>;

const CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full";

let pyodide: any = null;

// WARNING: DON'T TOUCH THE FORMATTING OF THE STRING LITERALS BELOW

// ─── DANGEROUS ZONE ────────────────────────────────────────────────────────────────────
// WARNING: DON'T TOUCH THIS PART UNLESS YOU KNOW WHAT YOU ARE DOING
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
    ]);

    await pyodide.runPythonAsync(`
import sys, types
for m in ['PySide6','PySide6.QtWidgets','PySide6.QtCore',
          'PySide6.QtGui','psutil','zmq','pyzmq',
          'tornado','tornado.ioloop']:
    sys.modules[m] = types.ModuleType(m)
`);

    await pyodide.runPythonAsync(`
import micropip
await micropip.install("rayoptics==0.9.4", deps=False)
await micropip.install("opticalglass==1.1.0", deps=False)
`);

    await pyodide.runPythonAsync(`
import micropip
await micropip.install([
  'attrs',
  'anytree',
  'transforms3d',
  'traitlets',
  'json5',
  'packaging',
  'json-tricks',
  'deprecation',
  'pyyaml',
  'requests',
  'openpyxl',
  'parsimonious',
])
`);

    await pyodide.runPythonAsync("import json\nfrom rayoptics.environment import *");
  } catch (err) {
    pyodide = null;
    throw err;
  }
}

// ─── End of DANGEROUS ZONE ────────────────────────────────────────────────────────────────────

function requirePyodide(): (code: string) => Promise<unknown> {
  if (!pyodide) throw new Error("Pyodide not initialized. Call init() first.");
  return pyodide.runPythonAsync.bind(pyodide);
}


// export for testing
export async function _setOpticalSurfaces(opticalModel: OpticalModel, runPython: (code: string) => Promise<unknown>): Promise<void> {
  const { specs, surfaces } = opticalModel;
  const {
    pupil: { space: pupilSpace, type: pupilType, value: pupilValue },
    field: { space: fieldSpace, type: fieldType, maxField, fields, isRelative: isFieldRelative },
    wavelengths: { weights, referenceIndex: refWavelengthIdx }
  } = specs;

  const formattedWeights = weights
    .reduce((acc, [wl, weight], idx) => `${acc}(${wl}, ${weight})${idx === weights.length - 1 ? "" : ","}`, "");

  const addSurfaceCommands = surfaces.reduce((acc, surface, idx) => {
    const { label, curvatureRadius, thickness, medium, manufacturer, semiDiameter, aspherical } = surface;
    if (idx === 0) {
      // first surface is always the Object
      return `${acc}\nsm.gaps[0].thi=${thickness}`;
    }


    // common surface
    const semiDiameterArg = semiDiameter ? `, sd=${semiDiameter}` : "";
    const glassManufacturer = medium === "air" || medium === "REFL" ? "" : `, '${manufacturer}'`;
    const setStop = label === "Stop" ? "\nsm.set_stop()" : "";
    const asphericalCommands = aspherical === undefined ? "" : `\nsm.ifcs[sm.cur_surface].profile = RadialPolynomial(r=${curvatureRadius}, cc=${aspherical.conicConstant}, coefs=${JSON.stringify(aspherical.polynomialCoefficients)})`;
    return `${acc}\nsm.add_surface([${curvatureRadius}, ${thickness}, '${medium}'${glassManufacturer}]${semiDiameterArg})${asphericalCommands}${setStop}`;
  }, "");

  await runPython(`
opm = OpticalModel()
sm  = opm['seq_model']
osp = opm['optical_spec']
pm  = opm['parax_model']

osp['pupil'] = PupilSpec(osp, key=['${pupilSpace}', '${pupilType}'], value=${pupilValue})
osp['fov'] = FieldSpec(osp, key=['${fieldSpace}', '${fieldType}'], value=${maxField}, flds=${JSON.stringify(fields)}, is_relative=${isFieldRelative ? "True" : "False"})
osp['wvls'] = WvlSpec([${formattedWeights}], ref_wl=${refWavelengthIdx})

opm.radius_mode = True
${addSurfaceCommands}
opm.update_model()`);
}


/** Use AFTER setting the optical surfaces */
export async function _getFirstOrderData(runPython: (code: string) => Promise<unknown>): Promise<Record<string, number>> {
  const json = (await runPython(`
fod = pm.opt_model['analysis_results']['parax_data'].fod

json.dumps({k: float(v) for k, v in fod.__dict__.items() if isinstance(v, (int, float))})
`)) as string;
  return JSON.parse(json);
}


// Expose for Components
export async function setOpticalSurfaces(opticalModel: OpticalModel): Promise<void> {
  await _setOpticalSurfaces(opticalModel, requirePyodide());
  return;
}

export async function getFirstOrderData(): Promise<Record<string, number>> {
  return await _getFirstOrderData(requirePyodide());
}

expose({
  init,
  setOpticalSurfaces,
  getFirstOrderData,
});