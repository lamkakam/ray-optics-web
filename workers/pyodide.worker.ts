import { expose } from "comlink";
import { loadPyodide } from "pyodide";
import { type OpticalModel } from "../lib/opticalModel";

let pyodide: Awaited<ReturnType<typeof loadPyodide>> | null = null;

// WARNING: DON'T TOUCH THE FORMATTING OF THE STRING LITERALS BELOW

// ─── DANGEROUS ZONE ────────────────────────────────────────────────────────────────────
// WARNING: DON'T TOUCH THIS PART UNLESS YOU KNOW WHAT YOU ARE DOING
export async function init(): Promise<void> {
  if (pyodide) return;
  try {
    // the version of pyodide must match exactly the one installed
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
    });

    // For the deps of rayoptics and opticalglass (required by rayoptics), see
    // Check https://github.com/mjhoptics/ray-optics/blob/v0.9.4/docs/source/requirements.txt
    // Check https://github.com/mjhoptics/opticalglass/blob/v1.1.0/docs/requirements.txt

    // Load Pyodide pre-installed packages. You can't upgrade them anyway
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

    // Install rayoptics without its dependencies because it requires desktop-only 
    // packages like PySide6, psutil, pyzmq, etc., which don't work in WebAssembly
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

    await pyodide.runPythonAsync(`
    from rayoptics.environment import *
    import json
    `);
  } catch (err) {
    pyodide = null;
    throw err;
  }
}

// ─── End of DANGEROUS ZONE ────────────────────────────────────────────────────────────────────

export async function runPython(code: string): Promise<unknown> {
  if (!pyodide) {
    throw new Error("Pyodide not initialized. Call init() first.");
  }
  return pyodide.runPythonAsync(code);
}

function requirePyodide(): (code: string) => Promise<unknown> {
  if (!pyodide) throw new Error("Pyodide not initialized. Call init() first.");
  return pyodide.runPythonAsync.bind(pyodide);
}

// TODO: Add more functions here

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


export async function setOpticalSurfaces(opticalModel: OpticalModel): Promise<void> {
  await _setOpticalSurfaces(opticalModel, runPython);
  return;
}

expose({
  init,
  setOpticalSurfaces,
});