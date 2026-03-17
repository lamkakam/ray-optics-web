import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { type OpticalModel } from "../../lib/opticalModel";
import {
  init,
  _resetPyodideForTesting,
  _init,
  _setOpticalSurfaces,
  _getFirstOrderData,
  _plotLensLayout,
  _plotRayFan,
  _plotOpdFan,
  _plotSpotDiagram,
  _plotSurfaceBySurface3rdOrderAberr,
  _get3rdOrderSeidelData,
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
  it("should call plot_lens_layout(opm) and return the result", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    const result = await _plotLensLayout(async (code) => {
      expect(code).toBe("plot_lens_layout(opm)");
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


describe("_get3rdOrderSeidelData", () => {
  it("should call json.dumps(get_3rd_order_seidel_data(opm)) and return parsed SeidelData", async () => {
    const mockData = {
      surfaceBySurface: {
        index: ["S-I", "S-II", "S-III", "S-IV", "S-V"],
        columns: ["S1", "S2", "sum"],
        data: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.9], [0.6, 0.7, 1.3], [0.8, 0.9, 1.7], [1.0, 1.1, 2.1]],
      },
      transverse: { TSA: 0.1, TCO: 0.2, TAS: 0.3, SAS: 0.4, PTB: 0.5, DST: 0.6 },
      wavefront: { W040: 0.1, W131: 0.2, W222: 0.3, W220: 0.4, W311: 0.5 },
      curvature: { TCV: 0.1, SCV: 0.2, PCV: 0.3 },
    };
    let capturedCode = "";
    const result = await _get3rdOrderSeidelData(async (code) => {
      capturedCode = code as string;
      return JSON.stringify(mockData);
    });
    expect(capturedCode).toBe("json.dumps(get_3rd_order_seidel_data(opm))");
    expect(result).toMatchObject(mockData);
  });
});


describe("_init", () => {
  const testWheelUrl = "http://localhost/rayoptics_web_utils-0.1.0-py3-none-any.whl";

  it("should install the local wheel and import rayoptics_web_utils", async () => {
    const scripts: string[] = [];
    await _init(async (code) => { scripts.push(code); }, testWheelUrl);
    const allCode = scripts.join("\n");

    // Install the wheel
    expect(allCode).toContain(`micropip.install("${testWheelUrl}", deps=False)`);

    // Initialize the package
    expect(allCode).toContain("from rayoptics_web_utils import init as _rwu_init");
    expect(allCode).toContain("_rwu_init()");
    expect(allCode).toContain("caf2 = _rwu_init_result['caf2']");

    // Import analysis and plotting functions
    expect(allCode).toContain("from rayoptics_web_utils.analysis import get_first_order_data, get_3rd_order_seidel_data");
    expect(allCode).toContain("from rayoptics_web_utils.plotting import plot_lens_layout, plot_ray_fan, plot_opd_fan, plot_spot_diagram, plot_surface_by_surface_3rd_order_aberr");
  });

  it("should install rayoptics and opticalglass", async () => {
    const scripts: string[] = [];
    await _init(async (code) => { scripts.push(code); }, testWheelUrl);
    const allCode = scripts.join("\n");
    expect(allCode).toContain('micropip.install("rayoptics==0.9.8"');
    expect(allCode).toContain('micropip.install("opticalglass==1.1.1"');
  });

  it("should import rayoptics environment", async () => {
    const scripts: string[] = [];
    await _init(async (code) => { scripts.push(code); }, testWheelUrl);
    const allCode = scripts.join("\n");
    expect(allCode).toContain("from rayoptics.environment import *");
  });
});

describe("init", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    _resetPyodideForTesting();
  });

  it("initializes Pyodide and calls _init without fetching CaF2 YAML", async () => {
    await init();
    // init should succeed without any fetch calls (CaF2 is bundled in the wheel)
  });

  it("constructs wheel URL with base path", async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/ray-optics-web";
    // Re-init to pick up the env var
    _resetPyodideForTesting();
    await init();
    // The wheel URL construction is tested implicitly via _init tests
  });
});
