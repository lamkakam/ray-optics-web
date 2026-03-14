import { describe, it, expect } from "@jest/globals";
import { type OpticalModel } from "../../lib/opticalModel";
import {
  _init,
  _setOpticalSurfaces,
  _getFirstOrderData,
  _plotLensLayout,
  _plotRayFan,
  _plotOpdFan,
  _plotSpotDiagram,
  _plotSurfaceBySurface3rdOrderAberr,
} from "../pyodide.worker";

const allSphericalOpticalModel: OpticalModel = {
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20.0, fields: [0., 0.707, 1.], isRelative: true },
    wavelengths: { weights: [[656.3, 1.], [587., 2.], [486.1, 1.]], referenceIndex: 1 },
  },
  object: { distance: 1e10 },
  image: { curvatureRadius: -42 },
  surfaces: [
    { label: "Default", curvatureRadius: 23.713, thickness: 4.831, medium: "N-LAK9", manufacturer: "Schott", semiDiameter: 10.009 },
    { label: "Default", curvatureRadius: 7331.288000, thickness: 5.86, medium: "air", manufacturer: "", semiDiameter: 8.9483 },
    { label: "Stop", curvatureRadius: -24.456, thickness: 0.975, medium: "N-SF5", manufacturer: "Schott", semiDiameter: 4.7918 },
    { label: "Default", curvatureRadius: 21.896, thickness: 4.822, medium: "air", manufacturer: "", semiDiameter: 4.7760 },
    { label: "Default", curvatureRadius: 86.759, thickness: 3.127, medium: "N-LAK9", manufacturer: "Schott", semiDiameter: 8.0218 },
    // manufacturer is set to be "Schott" on purpose for testing
    { label: "Default", curvatureRadius: -20.4942, thickness: 41.2365, medium: "air", manufacturer: "Schott", semiDiameter: 8.3321 },
  ],
} as const;


const opticalModelWithEvenAspherical: OpticalModel = {
  specs: { ...allSphericalOpticalModel.specs },
  object: { distance: 1e10 },
  image: { curvatureRadius: -42 },
  surfaces: [
    { label: "Stop", curvatureRadius: 0, thickness: 0, medium: "air", manufacturer: "", semiDiameter: 10.009 },
    {
      label: "Default",
      curvatureRadius: 23.713,
      thickness: 4.831,
      medium: "N-LAK9",
      manufacturer: "Schott",
      aspherical: { conicConstant: 0.1, polynomialCoefficients: [0, 0.02, 0, 0, 0, 0, 0, 0, 0, 0] },
      semiDiameter: 10.009
    },
    { label: "Default", curvatureRadius: 7331.288000, thickness: 5.86, medium: "air", manufacturer: "", semiDiameter: 8.9483 },
    { label: "Default", curvatureRadius: -24.456, thickness: 0.975, medium: "N-SF5", manufacturer: "Schott", semiDiameter: 4.7918 },
    { label: "Default", curvatureRadius: 21.896, thickness: 4.822, medium: "air", manufacturer: "", semiDiameter: 4.7760 },
    { label: "Default", curvatureRadius: 86.759, thickness: 3.127, medium: "N-LAK9", manufacturer: "Schott", semiDiameter: 8.0218 },
    { label: "Default", curvatureRadius: -20.4942, thickness: 41.2365, medium: "air", manufacturer: "", semiDiameter: 8.3321 },
  ],
} as const;

const fluoriteSinglet: OpticalModel = {
  specs: {
    pupil: { space: "object", type: "epd", value: 10 },
    field: { space: "object", type: "angle", maxField: 0.5, fields: [0], isRelative: true },
    wavelengths: { weights: [[656.3, 1.], [587., 2.], [486.1, 1.]], referenceIndex: 1 },
  },
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [
    { label: "Default", curvatureRadius: 30, thickness: 1.1, medium: "CaF2", manufacturer: "", semiDiameter: 10 },
    { label: "Default", curvatureRadius: 0, thickness: 70, medium: "air", manufacturer: "", semiDiameter: 10 },
  ],
} as const;


const opticalModelWithConic: OpticalModel = {
  specs: { ...allSphericalOpticalModel.specs },
  object: { ...allSphericalOpticalModel.object },
  image: { ...allSphericalOpticalModel.image },
  surfaces: [
    ...allSphericalOpticalModel.surfaces.slice(0, 1),
    {
      label: "Default",
      curvatureRadius: 23.713,
      thickness: 4.831,
      medium: "N-LAK9",
      manufacturer: "Schott",
      aspherical: { conicConstant: 0.1 },
      semiDiameter: 10.009
    },
    ...allSphericalOpticalModel.surfaces.slice(2),
  ],
};

describe("_setOpticalSurfaces", () => {
  it("should set optical specs by calling PupilSpec, FieldSpec, and WvlSpec correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(allSphericalOpticalModel, "manualAperture", async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("osp['pupil'] = PupilSpec(osp, key=['object', 'epd'], value=12.5)");
    expect(pythonScript).toContain("osp['fov'] = FieldSpec(osp, key=['object', 'angle'], value=20, flds=[0,0.707,1], is_relative=True)");
    expect(pythonScript).toContain("osp['wvls'] = WvlSpec([(656.3, 1),(587, 2),(486.1, 1)], ref_wl=1)");
  });

  it("should set optical surfaces including stops by calling add_surface correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(allSphericalOpticalModel, "manualAperture", async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("sm.do_apertures = False");
    expect(pythonScript).toContain("sm.add_surface([23.713, 4.831, \"N-LAK9\", \"Schott\"], sd=10.009)");
    expect(pythonScript).toContain("sm.add_surface([7331.288, 5.86, \"air\"], sd=8.9483)");
    expect(pythonScript).toContain("sm.add_surface([-24.456, 0.975, \"N-SF5\", \"Schott\"], sd=4.7918)\nsm.set_stop()");
    expect(pythonScript).toContain("sm.add_surface([21.896, 4.822, \"air\"], sd=4.776)");
    expect(pythonScript).toContain("sm.add_surface([86.759, 3.127, \"N-LAK9\", \"Schott\"], sd=8.0218)");
    expect(pythonScript).toContain("sm.add_surface([-20.4942, 41.2365, \"air\"], sd=8.3321)");
    expect(pythonScript).toContain("opm.update_model()");
  });

  it("should set an aspherical surface correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(opticalModelWithEvenAspherical, "manualAperture", async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("sm.add_surface([23.713, 4.831, \"N-LAK9\", \"Schott\"], sd=10.009)\nsm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=23.713, cc=0.1, coefs=[0,0.02,0,0,0,0,0,0,0,0])");
  });

  it("should set the object distance correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(allSphericalOpticalModel, "manualAperture", async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("sm.gaps[0].thi=1000000000");
  });

  it("should set the image curvature radius correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(allSphericalOpticalModel, "manualAperture", async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("sm.ifcs[-1].profile.r = -42");
  });

  it("should not emit image decenter command when image has no decenter", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(allSphericalOpticalModel, "manualAperture", async (code) => { pythonScript = code; });
    expect(pythonScript).not.toContain("sm.ifcs[-1].decenter");
  });

  it("should set image decenter when provided", async () => {
    const modelWithImageDecenter: OpticalModel = {
      ...allSphericalOpticalModel,
      image: {
        curvatureRadius: -42,
        decenter: { coordinateSystemStrategy: "decenter", alpha: 1.5, beta: 0, gamma: 0, offsetX: 0.1, offsetY: 0.2 },
      },
    };
    let pythonScript = "";
    await _setOpticalSurfaces(modelWithImageDecenter, "manualAperture", async (code) => { pythonScript = code; });
    expect(pythonScript).toContain(
      `sm.ifcs[-1].decenter = DecenterData("decenter", alpha=1.5, beta=0, gamma=0, x=0.1, y=0.2)`
    );
  });

  it("should set surface decenter when provided", async () => {
    const modelWithDecenter: OpticalModel = {
      ...allSphericalOpticalModel,
      surfaces: [
        {
          ...allSphericalOpticalModel.surfaces[0],
          decenter: { coordinateSystemStrategy: "bend", alpha: 0, beta: 2.0, gamma: 0, offsetX: 0.5, offsetY: -0.5 },
        },
        ...allSphericalOpticalModel.surfaces.slice(1),
      ],
    };
    let pythonScript = "";
    await _setOpticalSurfaces(modelWithDecenter, "manualAperture", async (code) => { pythonScript = code; });
    expect(pythonScript).toContain(
      `sm.ifcs[sm.cur_surface].decenter = DecenterData("bend", alpha=0, beta=2, gamma=0, x=0.5, y=-0.5)`
    );
  });

  it("should set the radius_mode correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(allSphericalOpticalModel, "manualAperture", async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("opm.radius_mode = True");
  });

  it("should call the OpticalModel constructor correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(allSphericalOpticalModel, "manualAperture", async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("opm = OpticalModel()\nsm  = opm['seq_model']\nosp = opm['optical_spec']\npm  = opm['parax_model']");
  });

  it("should set a conic surface correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(opticalModelWithConic, "manualAperture", async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("sm.add_surface([23.713, 4.831, \"N-LAK9\", \"Schott\"], sd=10.009)\nsm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=23.713, cc=0.1)");
  });

  it("should set a surface with fluorite correctly", async () => {
    let pythonScript = "";
    await _setOpticalSurfaces(fluoriteSinglet, "manualAperture", async (code) => { pythonScript = code; });
    expect(pythonScript).toContain("sm.add_surface([30, 1.1, caf2], sd=10)");
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
    expect(pythonScript).toContain("json.dumps(get_first_order_data(opm))");
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
      expect(code).toBe("plot_ray_fan(1, opm)");
      return mockBase64;
    }, 1);
    expect(result).toBe(mockBase64);
  });

  it("should pass field index 0 correctly", async () => {
    await _plotRayFan(async (code) => {
      expect(code).toBe("plot_ray_fan(0, opm)");
      return "";
    }, 0);
  });
});


describe("_plotOpdFan", () => {
  it("should call plot_opd_fan with the correct field index", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    const result = await _plotOpdFan(async (code) => {
      expect(code).toBe("plot_opd_fan(2, opm)");
      return mockBase64;
    }, 2);
    expect(result).toBe(mockBase64);
  });

  it("should pass field index 0 correctly", async () => {
    await _plotOpdFan(async (code) => {
      expect(code).toBe("plot_opd_fan(0, opm)");
      return "";
    }, 0);
  });
});


describe("_plotSpotDiagram", () => {
  it("should call plot_spot_diagram with the correct field index", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    const result = await _plotSpotDiagram(async (code) => {
      expect(code).toBe("plot_spot_diagram(1, opm)");
      return mockBase64;
    }, 1);
    expect(result).toBe(mockBase64);
  });

  it("should pass field index 0 correctly", async () => {
    await _plotSpotDiagram(async (code) => {
      expect(code).toBe("plot_spot_diagram(0, opm)");
      return "";
    }, 0);
  });
});


describe("_plotSurfaceBySurface3rdOrderAberr", () => {
  it("should call plot_surface_by_surface_3rd_order_aberr(opm) and return the result", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    const result = await _plotSurfaceBySurface3rdOrderAberr(async (code) => {
      expect(code).toBe("plot_surface_by_surface_3rd_order_aberr(opm)");
      return mockBase64;
    });
    expect(result).toBe(mockBase64);
  });
});


describe("_init", () => {
  it("should define all plot functions via runPython", async () => {
    const scripts: string[] = [];
    await _init(async (code) => { scripts.push(code); });
    const allCode = scripts.join("\n");

    // setup for CaF2
    expect(allCode).toMatch(/caf2 = create_material\([a-zA-Z\d_]+, 'CaF2', 'rii-main', 'data-nk'\)/);

    // get_first_order_data
    expect(allCode).toContain("def get_first_order_data(opm):");
    expect(allCode).toContain("opt_model['analysis_results']['parax_data'].fod");

    // plot_lens_layout
    expect(allCode).toContain("def plot_lens_layout():");
    expect(allCode).toContain("InteractiveLayout");

    // _ray_abr
    expect(allCode).toContain("def _ray_abr(");
    expect(allCode).toContain("defocused_pt - image_pt");

    // plot_ray_fan
    expect(allCode).toContain("def plot_ray_fan(fi, opm):");
    expect(allCode).toContain("sm.trace_fan(_ray_abr");
    expect(allCode).toContain("Tangential");
    expect(allCode).toContain("Sagittal");

    // _opd_abr
    expect(allCode).toContain("def _opd_abr(");
    expect(allCode).toContain("wave_abr_full_calc");

    // plot_opd_fan
    expect(allCode).toContain("def plot_opd_fan(fi, opm):");
    expect(allCode).toContain("sm.trace_fan(_opd_abr");

    // _spot
    expect(allCode).toContain("def _spot(");
    expect(allCode).toContain("np.array([t_abr[0], t_abr[1]])");

    // plot_spot_diagram
    expect(allCode).toContain("def plot_spot_diagram(fi, opm):");
    expect(allCode).toContain("sm.trace_grid(_spot");
    expect(allCode).toContain("set_aspect('equal')");

    // plot_surface_by_surface_3rd_order_aberr
    expect(allCode).toContain("def plot_surface_by_surface_3rd_order_aberr(opm):");
    expect(allCode).toContain("compute_third_order(opm)");
  });

  it("should install rayoptics and opticalglass", async () => {
    const scripts: string[] = [];
    await _init(async (code) => { scripts.push(code); });
    const allCode = scripts.join("\n");
    expect(allCode).toContain('micropip.install("rayoptics==0.9.4"');
    expect(allCode).toContain('micropip.install("opticalglass==1.1.0"');
  });

  it("should import rayoptics environment", async () => {
    const scripts: string[] = [];
    await _init(async (code) => { scripts.push(code); });
    const allCode = scripts.join("\n");
    expect(allCode).toContain("from rayoptics.environment import *");
  });
});
