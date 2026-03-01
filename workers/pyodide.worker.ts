import { expose } from "comlink";
import { type OpticalModel } from "../lib/opticalModel";

declare function importScripts(...urls: string[]): void;
declare function loadPyodide(opts: { indexURL: string }): Promise<any>;

const CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full";

let pyodide: any = null;

// WARNING: DON'T TOUCH THE FORMATTING OF THE STRING LITERALS BELOW

// ─── DANGEROUS ZONE ────────────────────────────────────────────────────────────────────
// WARNING: DON'T TOUCH THIS PART UNLESS YOU KNOW WHAT YOU ARE DOING

// export for testing
export async function _init(
  runPython: (code: string) => Promise<unknown>
): Promise<void> {
  await runPython(`
        import sys, types
        for m in ['PySide6','PySide6.QtWidgets','PySide6.QtCore',
                  'PySide6.QtGui','psutil','zmq','pyzmq',
                  'tornado','tornado.ioloop']:
            sys.modules[m] = types.ModuleType(m)
`);

  await runPython(`
        import micropip
        await micropip.install("rayoptics==0.9.4", deps=False)
        await micropip.install("opticalglass==1.1.0", deps=False)
`);

  // DON'T PIN pyyaml to 6.0.1 (despite specifically required by opticalglass).
  // NO AVAILABLE WHEEL FOR pyyaml==6.0.1
  await runPython(`
        import micropip
        await micropip.install([
            'anytree==2.12.1',
            'transforms3d==0.4.2',
            'traitlets==5.14.3',
            'packaging==24.2',
            'json-tricks==3.17.3',
            'deprecation==2.1.0',
            'pyyaml',
            'requests==2.32.3',
            'openpyxl==3.1.2',
            'parsimonious==0.10.0',
        ])
`);

  await runPython("import json\nfrom rayoptics.environment import *");

  await runPython(`
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

        def get_first_order_data(opm):
            pm  = opm['parax_model']
            fod = pm.opt_model['analysis_results']['parax_data'].fod
            return {k: float(v) for k, v in fod.__dict__.items() if isinstance(v, (int, float))}

        def plot_lens_layout():
            fig = plt.figure(FigureClass=InteractiveLayout, opt_model=opm,
                            do_draw_rays=True, do_paraxial_layout=False, is_dark=False)
            fig.plot()
            return _fig_to_base64(fig)

        def plot_ray_fan(fi):
            def _ray_abr(p, xy, ray_pkg, fld, wvl, foc):
                if ray_pkg[mc.ray] is not None:
                    image_pt = fld.ref_sphere[0]
                    ray = ray_pkg[mc.ray]
                    dist = foc / ray[-1][mc.d][2]
                    defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
                t_abr = defocused_pt - image_pt
                return t_abr[xy]
            return None

            fig, (ax_y, ax_x) = plt.subplots(1, 2, figsize=(8, 4))
            for xy, ax, title in [(1, ax_y, 'Tangential'), (0, ax_x, 'Sagittal')]:
                fans_x, fans_y, (max_rho, max_val), colors = sm.trace_fan(_ray_abr, fi, xy)
                for k in range(len(fans_x)):
                    ax.plot(fans_x[k], fans_y[k], color=colors[k])
                ax.set_title(title)
                ax.axhline(0, color='black', linewidth=0.5)
                ax.axvline(0, color='black', linewidth=0.5)
            fig.tight_layout()
            return _fig_to_base64(fig)


        def plot_opd_fan(fi):
            def _opd_abr(p, xy, ray_pkg, fld, wvl, foc):
                if ray_pkg[mc.ray] is not None:
                    fod = opm['analysis_results']['parax_data'].fod
                    opd_val = wave_abr_full_calc(fod, fld, wvl, foc, ray_pkg,
                                                fld.chief_ray, fld.ref_sphere)
                    return opd_val / opm.nm_to_sys_units(wvl)
                return None

            fig, (ax_y, ax_x) = plt.subplots(1, 2, figsize=(8, 4))
            for xy, ax, title in [(1, ax_y, 'Tangential'), (0, ax_x, 'Sagittal')]:
                fans_x, fans_y, (max_rho, max_val), colors = sm.trace_fan(_opd_abr, fi, xy)
                for k in range(len(fans_x)):
                    ax.plot(fans_x[k], fans_y[k], color=colors[k])
                ax.set_title(title)
                ax.axhline(0, color='black', linewidth=0.5)
                ax.axvline(0, color='black', linewidth=0.5)
            fig.tight_layout()
            return _fig_to_base64(fig)

        def plot_spot_diagram(fi):
            def _spot(p, wi, ray_pkg, fld, wvl, foc):
                if ray_pkg is not None:
                    image_pt = fld.ref_sphere[0]
                    ray = ray_pkg[mc.ray]
                    dist = foc / ray[-1][mc.d][2]
                    defocused_pt = ray[-1][mc.p] + dist * ray[-1][mc.d]
                    t_abr = defocused_pt - image_pt
                    return np.array([t_abr[0], t_abr[1]])
                return None

            fig, ax = plt.subplots(1, 1, figsize=(5, 5))
            ax.set_aspect('equal')
            grids, rc = sm.trace_grid(_spot, fi, wl=None, num_rays=21,
                                      form='list', append_if_none=False)
            for gi, grid in enumerate(grids):
                x_pts = [pt[0] for pt in grid]
                y_pts = [pt[1] for pt in grid]
                ax.scatter(x_pts, y_pts, s=1, color=rc[gi])
            ax.set_title(f'Field {fi}')
            fig.tight_layout()
            return _fig_to_base64(fig)
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
    ]);

    await _init(pyodide.runPythonAsync.bind(pyodide));
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

  // WARNING: DON'T TOUCH THE FORMATTING BELOW
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


/** ONLY USE AFTER setting the optical surfaces */
export async function _getFirstOrderData(runPython: (code: string) => Promise<unknown>): Promise<Record<string, number>> {
  const json = (await runPython("json.dumps(get_first_order_data(opm))")) as string;
  return JSON.parse(json);
}


// ─── Plot Functions (injectable for testing) ─────────────────────────────────

export async function _plotLensLayout(runPython: (code: string) => Promise<unknown>): Promise<string> {
  return (await runPython("plot_lens_layout()")) as string;
}

export async function _plotRayFan(runPython: (code: string) => Promise<unknown>, fieldIndex: number): Promise<string> {
  return (await runPython(`plot_ray_fan(${fieldIndex})`)) as string;
}

export async function _plotOpdFan(runPython: (code: string) => Promise<unknown>, fieldIndex: number): Promise<string> {
  return (await runPython(`plot_opd_fan(${fieldIndex})`)) as string;
}

export async function _plotSpotDiagram(runPython: (code: string) => Promise<unknown>, fieldIndex: number): Promise<string> {
  return (await runPython(`plot_spot_diagram(${fieldIndex})`)) as string;
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