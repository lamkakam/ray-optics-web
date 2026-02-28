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

    await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
import base64
import rayoptics.optical.model_constants as mc
from rayoptics.raytr.waveabr import wave_abr_full_calc

def _fig_to_base64(fig, dpi=150):
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=dpi, bbox_inches='tight')
    buf.seek(0)
    data = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    plt.close(fig)
    return data
`);
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


// ─── Plot Functions (injectable for testing) ─────────────────────────────────

export async function _plotLensLayout(runPython: (code: string) => Promise<unknown>): Promise<string> {
  return (await runPython(`
fig = plt.figure(FigureClass=InteractiveLayout, opt_model=opm,
                 do_draw_rays=True, do_paraxial_layout=False, is_dark=False)
fig.plot()
_fig_to_base64(fig)
`)) as string;
}

export async function _plotRayFan(runPython: (code: string) => Promise<unknown>, fieldIndex: number): Promise<string> {
  return (await runPython(`
def _ray_abr(p, xy, ray_pkg, fld, wvl, foc):
    if ray_pkg[mc.ray] is not None:
        image_pt = fld.ref_sphere[0]
        ray = ray_pkg[mc.ray]
        dist = foc / ray[-1][mc.d][2]
        defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
        t_abr = defocused_pt - image_pt
        return t_abr[xy]
    return None

fi = ${fieldIndex}
fig, (ax_y, ax_x) = plt.subplots(1, 2, figsize=(8, 4))

for xy, ax, title in [(1, ax_y, 'Tangential'), (0, ax_x, 'Sagittal')]:
    fans_x, fans_y, (max_rho, max_val), colors = sm.trace_fan(_ray_abr, fi, xy)
    for k in range(len(fans_x)):
        ax.plot(fans_x[k], fans_y[k], color=colors[k])
    ax.set_title(title)
    ax.axhline(0, color='black', linewidth=0.5)
    ax.axvline(0, color='black', linewidth=0.5)

fig.tight_layout()
_fig_to_base64(fig)
`)) as string;
}

export async function _plotOpdFan(runPython: (code: string) => Promise<unknown>, fieldIndex: number): Promise<string> {
  return (await runPython(`
def _opd_abr(p, xy, ray_pkg, fld, wvl, foc):
    if ray_pkg[mc.ray] is not None:
        fod = opm['analysis_results']['parax_data'].fod
        opd_val = wave_abr_full_calc(fod, fld, wvl, foc, ray_pkg,
                                     fld.chief_ray, fld.ref_sphere)
        return opd_val / opm.nm_to_sys_units(wvl)
    return None

fi = ${fieldIndex}
fig, (ax_y, ax_x) = plt.subplots(1, 2, figsize=(8, 4))

for xy, ax, title in [(1, ax_y, 'Tangential'), (0, ax_x, 'Sagittal')]:
    fans_x, fans_y, (max_rho, max_val), colors = sm.trace_fan(_opd_abr, fi, xy)
    for k in range(len(fans_x)):
        ax.plot(fans_x[k], fans_y[k], color=colors[k])
    ax.set_title(title)
    ax.axhline(0, color='black', linewidth=0.5)
    ax.axvline(0, color='black', linewidth=0.5)

fig.tight_layout()
_fig_to_base64(fig)
`)) as string;
}

export async function _plotSpotDiagram(runPython: (code: string) => Promise<unknown>, fieldIndex: number): Promise<string> {
  return (await runPython(`
fi = ${fieldIndex}
fig, ax = plt.subplots(1, 1, figsize=(5, 5))
ax.set_aspect('equal')

fld = osp['fov'].fields[fi]
wvls = osp['wvls']
ref_wvl_idx = wvls.reference_wvl

for wi, wvl in enumerate(wvls.wavelengths):
    grid = sm.trace_grid(None, fi, wl=wvl, num_rays=21)
    ray_list = grid[0]
    x_pts = []
    y_pts = []
    for row in ray_list:
        for ray_pkg in row:
            if ray_pkg is not None and ray_pkg[mc.ray] is not None:
                ray = ray_pkg[mc.ray]
                x_pts.append(ray[-1][mc.p][0])
                y_pts.append(ray[-1][mc.p][1])
    color = wvls.render_colors()[wi] if hasattr(wvls, 'render_colors') else None
    ax.scatter(x_pts, y_pts, s=1, color=color)

ax.set_title(f'Field {fi}')
fig.tight_layout()
_fig_to_base64(fig)
`)) as string;
}


// Expose for Components
export async function setOpticalSurfaces(opticalModel: OpticalModel): Promise<void> {
  await _setOpticalSurfaces(opticalModel, requirePyodide());
  return;
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

expose({
  init,
  setOpticalSurfaces,
  getFirstOrderData,
  plotLensLayout,
  plotRayFan,
  plotOpdFan,
  plotSpotDiagram,
});