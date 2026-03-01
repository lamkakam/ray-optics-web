import { describe, it, expect } from "@jest/globals";
import { type OpticalModel } from "../../lib/opticalModel";
import {
  _setOpticalSurfaces,
  _getFirstOrderData,
  _plotLensLayout,
  _plotRayFan,
  _plotOpdFan,
  _plotSpotDiagram,
} from "../pyodide.worker";

const allSphericalOpticalModel: OpticalModel = {
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20.0, fields: [0., 0.707, 1.], isRelative: true },
    wavelengths: { weights: [[656.3, 1.], [587., 2.], [486.1, 1.]], referenceIndex: 1 },
  },
  surfaces: [
    { label: "Object", curvatureRadius: 0, thickness: 1e10, medium: "air", manufacturer: "" },
    { label: "Default", curvatureRadius: 23.713, thickness: 4.831, medium: "N-LAK9", manufacturer: "Schott" },
    { label: "Default", curvatureRadius: 7331.288000, thickness: 5.86, medium: "air", manufacturer: "" },
    { label: "Stop", curvatureRadius: -24.456, thickness: 0.975, medium: "N-SF5", manufacturer: "Schott" },
    { label: "Default", curvatureRadius: 21.896, thickness: 4.822, medium: "air", manufacturer: "" },
    { label: "Default", curvatureRadius: 86.759, thickness: 3.127, medium: "N-LAK9", manufacturer: "Schott" },
    // manufacturer is set to be "Schott" on purpose for testing
    { label: "Default", curvatureRadius: -20.4942, thickness: 41.2365, medium: "air", manufacturer: "Schott" },
  ],
};


const opticalModelWithAspherical: OpticalModel = {
  specs: { ...allSphericalOpticalModel.specs },
  surfaces: [
    { label: "Object", curvatureRadius: 0, thickness: 1e10, medium: "air", manufacturer: "" },
    { label: "Stop", curvatureRadius: 0, thickness: 0, medium: "air", manufacturer: "" },
    { label: "Default", curvatureRadius: 23.713, thickness: 4.831, medium: "N-LAK9", manufacturer: "Schott", aspherical: { conicConstant: 0.1, polynomialCoefficients: [0, 0.02, 0, 0, 0, 0, 0, 0, 0, 0] } },
    { label: "Default", curvatureRadius: 7331.288000, thickness: 5.86, medium: "air", manufacturer: "" },
    { label: "Default", curvatureRadius: -24.456, thickness: 0.975, medium: "N-SF5", manufacturer: "Schott" },
    { label: "Default", curvatureRadius: 21.896, thickness: 4.822, medium: "air", manufacturer: "" },
    { label: "Default", curvatureRadius: 86.759, thickness: 3.127, medium: "N-LAK9", manufacturer: "Schott" },
    { label: "Default", curvatureRadius: -20.4942, thickness: 41.2365, medium: "air", manufacturer: "" },
  ],
};

describe("_setOpticalSurfaces", () => {
  it("should set optical specs by calling PupilSpec, FieldSpec, and WvlSpec correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(allSphericalOpticalModel, async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("osp['pupil'] = PupilSpec(osp, key=['object', 'epd'], value=12.5)");
    expect(pythonScript).toContain("osp['fov'] = FieldSpec(osp, key=['object', 'angle'], value=20, flds=[0,0.707,1], is_relative=True)");
    expect(pythonScript).toContain("osp['wvls'] = WvlSpec([(656.3, 1),(587, 2),(486.1, 1)], ref_wl=1)");
  });

  it("should set optical surfaces including stops by calling add_surface correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(allSphericalOpticalModel, async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("sm.add_surface([23.713, 4.831, 'N-LAK9', 'Schott'])");
    expect(pythonScript).toContain("sm.add_surface([7331.288, 5.86, 'air'])");
    expect(pythonScript).toContain("sm.add_surface([-24.456, 0.975, 'N-SF5', 'Schott'])\nsm.set_stop()");
    expect(pythonScript).toContain("sm.add_surface([21.896, 4.822, 'air'])");
    expect(pythonScript).toContain("sm.add_surface([86.759, 3.127, 'N-LAK9', 'Schott'])");
    expect(pythonScript).toContain("sm.add_surface([-20.4942, 41.2365, 'air'])\nopm.update_model()");
  });

  it("should set an aspherical surface correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(opticalModelWithAspherical, async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("sm.add_surface([23.713, 4.831, 'N-LAK9', 'Schott'])\nsm.ifcs[sm.cur_surface].profile = RadialPolynomial(r=23.713, cc=0.1, coefs=[0,0.02,0,0,0,0,0,0,0,0])");
  });

  it("should set the object correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(allSphericalOpticalModel, async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("sm.gaps[0].thi=1000000000");
  });

  it("should set the radius_mode correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(allSphericalOpticalModel, async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("opm.radius_mode = True");
  });

  it("should call the OpticalModel constructor correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(allSphericalOpticalModel, async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("opm = OpticalModel()\nsm  = opm['seq_model']\nosp = opm['optical_spec']\npm  = opm['parax_model']");
  });
});


describe("_getFirstOrderData", () => {
  it("should get the first order data from the correct attribute of the optical model", async () => {
    let pythonScript = "";
    const result = await _getFirstOrderData(async (code) => {
      pythonScript = code;
      const mockJSON = JSON.stringify({ efl: 200, bfl: 100 });
      return mockJSON;
    });
    expect(pythonScript).toContain("pm.opt_model['analysis_results']['parax_data'].fod");
    expect(result).toMatchObject({ efl: 200, bfl: 100 });
  });
});


describe("_plotLensLayout", () => {
  it("should call plot_lens_layout() and return the result", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    const result = await _plotLensLayout(async (code) => {
      expect(code).toBe("plot_lens_layout()");
      return mockBase64;
    });
    expect(result).toBe(mockBase64);
  });
});


describe("_plotRayFan", () => {
  it("should call plot_ray_fan with the correct field index", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    const result = await _plotRayFan(async (code) => {
      expect(code).toBe("plot_ray_fan(1)");
      return mockBase64;
    }, 1);
    expect(result).toBe(mockBase64);
  });

  it("should pass field index 0 correctly", async () => {
    await _plotRayFan(async (code) => {
      expect(code).toBe("plot_ray_fan(0)");
      return "";
    }, 0);
  });
});


describe("_plotOpdFan", () => {
  it("should call plot_opd_fan with the correct field index", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    const result = await _plotOpdFan(async (code) => {
      expect(code).toBe("plot_opd_fan(2)");
      return mockBase64;
    }, 2);
    expect(result).toBe(mockBase64);
  });

  it("should pass field index 0 correctly", async () => {
    await _plotOpdFan(async (code) => {
      expect(code).toBe("plot_opd_fan(0)");
      return "";
    }, 0);
  });
});


describe("_plotSpotDiagram", () => {
  it("should call plot_spot_diagram with the correct field index", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    const result = await _plotSpotDiagram(async (code) => {
      expect(code).toBe("plot_spot_diagram(1)");
      return mockBase64;
    }, 1);
    expect(result).toBe(mockBase64);
  });

  it("should pass field index 0 correctly", async () => {
    await _plotSpotDiagram(async (code) => {
      expect(code).toBe("plot_spot_diagram(0)");
      return "";
    }, 0);
  });
});


describe("init() Python function definitions", () => {
  // We test via the init() runPythonAsync calls.
  // Since init() is not easily testable in isolation (requires Pyodide),
  // we verify the source code contains the function definitions.
  // This is a structural test that reads the worker source.
  it("should define plot_lens_layout with InteractiveLayout in init()", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("workers/pyodide.worker.ts", "utf-8");
    expect(source).toContain("def plot_lens_layout():");
    expect(source).toContain("InteractiveLayout");
  });

  it("should define _ray_abr with transverse ray aberration logic in init()", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("workers/pyodide.worker.ts", "utf-8");
    expect(source).toContain("def _ray_abr(");
    expect(source).toContain("defocused_pt - image_pt");
  });

  it("should define plot_ray_fan with trace_fan and Tangential/Sagittal in init()", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("workers/pyodide.worker.ts", "utf-8");
    expect(source).toContain("def plot_ray_fan(fi):");
    expect(source).toContain("sm.trace_fan(_ray_abr");
    expect(source).toContain("Tangential");
    expect(source).toContain("Sagittal");
  });

  it("should define _opd_abr with wave_abr_full_calc in init()", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("workers/pyodide.worker.ts", "utf-8");
    expect(source).toContain("def _opd_abr(");
    expect(source).toContain("wave_abr_full_calc");
  });

  it("should define plot_opd_fan with trace_fan in init()", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("workers/pyodide.worker.ts", "utf-8");
    expect(source).toContain("def plot_opd_fan(fi):");
    expect(source).toContain("sm.trace_fan(_opd_abr");
  });

  it("should define _spot with spot calculation in init()", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("workers/pyodide.worker.ts", "utf-8");
    expect(source).toContain("def _spot(");
    expect(source).toContain("np.array([t_abr[0], t_abr[1]])");
  });

  it("should define plot_spot_diagram with trace_grid and set_aspect('equal') in init()", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("workers/pyodide.worker.ts", "utf-8");
    expect(source).toContain("def plot_spot_diagram(fi):");
    expect(source).toContain("sm.trace_grid(_spot");
    expect(source).toContain("set_aspect('equal')");
  });
});
