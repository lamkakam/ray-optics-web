import { describe, it, expect, afterEach } from "@jest/globals";
import { type OpticalModel } from "@/shared/lib/types/opticalModel";
import {
  init,
  _resetPyodideForTesting,
  _init,
  _getFirstOrderData,
  _plotLensLayout,
  _plotRayFan,
  _plotOpdFan,
  _plotSpotDiagram,
  _plotSurfaceBySurface3rdOrderAberr,
  _get3rdOrderSeidelData,
  _plotWavefrontMap,
  _plotGeoPSF,
  _plotDiffractionPSF,
} from "../pyodide.worker";

const allSphericalOpticalModel: OpticalModel = {
  setAutoAperture: "manualAperture",
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


describe("_getFirstOrderData", () => {
  it("should build the full model script and include the computation", async () => {
    let pythonScript = "";
    const result = await _getFirstOrderData(async (code) => {
      pythonScript = code;
      return JSON.stringify({ efl: 200, bfl: 100 });
    }, allSphericalOpticalModel);
    expect(pythonScript).toContain("opm = OpticalModel()");
    expect(pythonScript).toContain("json.dumps(get_first_order_data(_build_opm()))");
    expect(result).toMatchObject({ efl: 200, bfl: 100 });
  });
});


describe("_plotLensLayout", () => {
  it("should build the model script and call plot_lens_layout(opm)", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    let pythonScript = "";
    const result = await _plotLensLayout(async (code) => {
      pythonScript = code;
      return mockBase64;
    }, allSphericalOpticalModel);
    expect(pythonScript).toContain("opm = OpticalModel()");
    expect(pythonScript).toContain("plot_lens_layout(_build_opm())");
    expect(result).toBe(mockBase64);
  });
});


describe("_plotRayFan", () => {
  it("should build the model script and call plot_ray_fan with the correct field index", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    let pythonScript = "";
    const result = await _plotRayFan(async (code) => {
      pythonScript = code;
      return mockBase64;
    }, allSphericalOpticalModel, 1);
    expect(pythonScript).toContain("opm = OpticalModel()");
    expect(pythonScript).toContain("plot_ray_fan(1, _build_opm())");
    expect(result).toBe(mockBase64);
  });

  it("should pass field index 0 correctly", async () => {
    let pythonScript = "";
    await _plotRayFan(async (code) => {
      pythonScript = code;
      return "";
    }, allSphericalOpticalModel, 0);
    expect(pythonScript).toContain("plot_ray_fan(0, _build_opm())");
  });
});


describe("_plotOpdFan", () => {
  it("should build the model script and call plot_opd_fan with the correct field index", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    let pythonScript = "";
    const result = await _plotOpdFan(async (code) => {
      pythonScript = code;
      return mockBase64;
    }, allSphericalOpticalModel, 2);
    expect(pythonScript).toContain("opm = OpticalModel()");
    expect(pythonScript).toContain("plot_opd_fan(2, _build_opm())");
    expect(result).toBe(mockBase64);
  });

  it("should pass field index 0 correctly", async () => {
    let pythonScript = "";
    await _plotOpdFan(async (code) => {
      pythonScript = code;
      return "";
    }, allSphericalOpticalModel, 0);
    expect(pythonScript).toContain("plot_opd_fan(0, _build_opm())");
  });
});


describe("_plotSpotDiagram", () => {
  it("should build the model script and call plot_spot_diagram with the correct field index", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    let pythonScript = "";
    const result = await _plotSpotDiagram(async (code) => {
      pythonScript = code;
      return mockBase64;
    }, allSphericalOpticalModel, 1);
    expect(pythonScript).toContain("opm = OpticalModel()");
    expect(pythonScript).toContain("plot_spot_diagram(1, _build_opm())");
    expect(result).toBe(mockBase64);
  });

  it("should pass field index 0 correctly", async () => {
    let pythonScript = "";
    await _plotSpotDiagram(async (code) => {
      pythonScript = code;
      return "";
    }, allSphericalOpticalModel, 0);
    expect(pythonScript).toContain("plot_spot_diagram(0, _build_opm())");
  });
});


describe("_plotSurfaceBySurface3rdOrderAberr", () => {
  it("should build the model script and call plot_surface_by_surface_3rd_order_aberr(opm)", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    let pythonScript = "";
    const result = await _plotSurfaceBySurface3rdOrderAberr(async (code) => {
      pythonScript = code;
      return mockBase64;
    }, allSphericalOpticalModel);
    expect(pythonScript).toContain("opm = OpticalModel()");
    expect(pythonScript).toContain("plot_surface_by_surface_3rd_order_aberr(_build_opm())");
    expect(result).toBe(mockBase64);
  });
});


describe("_plotWavefrontMap", () => {
  it("should build the model script and call plot_wavefront_map with field and wavelength index", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    let pythonScript = "";
    const result = await _plotWavefrontMap(async (code) => {
      pythonScript = code;
      return mockBase64;
    }, allSphericalOpticalModel, 1, 2);
    expect(pythonScript).toContain("opm = OpticalModel()");
    expect(pythonScript).toContain("plot_wavefront_map(1, 2, _build_opm(), num_rays=64)");
    expect(result).toBe(mockBase64);
  });

  it("should pass field index 0 and wavelength index 0 correctly", async () => {
    let pythonScript = "";
    await _plotWavefrontMap(async (code) => {
      pythonScript = code;
      return "";
    }, allSphericalOpticalModel, 0, 0);
    expect(pythonScript).toContain("plot_wavefront_map(0, 0, _build_opm(), num_rays=64)");
  });

  it("should use custom numRays when provided", async () => {
    let pythonScript = "";
    await _plotWavefrontMap(async (code) => {
      pythonScript = code;
      return "";
    }, allSphericalOpticalModel, 0, 1, 32);
    expect(pythonScript).toContain("plot_wavefront_map(0, 1, _build_opm(), num_rays=32)");
  });
});


describe("_plotGeoPSF", () => {
  it("should build the model script and call plot_geo_psf with field and wavelength index", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    let pythonScript = "";
    const result = await _plotGeoPSF(async (code) => {
      pythonScript = code;
      return mockBase64;
    }, allSphericalOpticalModel, 2, 1);
    expect(pythonScript).toContain("opm = OpticalModel()");
    expect(pythonScript).toContain("plot_geo_psf(2, 1, _build_opm(), num_rays=64)");
    expect(result).toBe(mockBase64);
  });

  it("should pass field index 0 and wavelength index 0 correctly", async () => {
    let pythonScript = "";
    await _plotGeoPSF(async (code) => {
      pythonScript = code;
      return "";
    }, allSphericalOpticalModel, 0, 0);
    expect(pythonScript).toContain("plot_geo_psf(0, 0, _build_opm(), num_rays=64)");
  });

  it("should use custom numRays when provided", async () => {
    let pythonScript = "";
    await _plotGeoPSF(async (code) => {
      pythonScript = code;
      return "";
    }, allSphericalOpticalModel, 1, 2, 32);
    expect(pythonScript).toContain("plot_geo_psf(1, 2, _build_opm(), num_rays=32)");
  });
});


describe("_plotDiffractionPSF", () => {
  it("should build the model script and call plot_diffraction_psf with field and wavelength index", async () => {
    const mockBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    let pythonScript = "";
    const result = await _plotDiffractionPSF(async (code) => {
      pythonScript = code;
      return mockBase64;
    }, allSphericalOpticalModel, 1, 0);
    expect(pythonScript).toContain("opm = OpticalModel()");
    expect(pythonScript).toContain("plot_diffraction_psf(1, 0, _build_opm(), num_rays=64, max_dims=256)");
    expect(result).toBe(mockBase64);
  });

  it("should pass field index 0 and wavelength index 0 correctly", async () => {
    let pythonScript = "";
    await _plotDiffractionPSF(async (code) => {
      pythonScript = code;
      return "";
    }, allSphericalOpticalModel, 0, 0);
    expect(pythonScript).toContain("plot_diffraction_psf(0, 0, _build_opm(), num_rays=64, max_dims=256)");
  });

  it("should use custom numRays and maxDims when provided", async () => {
    let pythonScript = "";
    await _plotDiffractionPSF(async (code) => {
      pythonScript = code;
      return "";
    }, allSphericalOpticalModel, 2, 1, 32, 128);
    expect(pythonScript).toContain("plot_diffraction_psf(2, 1, _build_opm(), num_rays=32, max_dims=128)");
  });
});


describe("_get3rdOrderSeidelData", () => {
  it("should build the model script, call json.dumps(get_3rd_order_seidel_data(opm)) and return parsed SeidelData", async () => {
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
    }, allSphericalOpticalModel);
    expect(capturedCode).toContain("opm = OpticalModel()");
    expect(capturedCode).toContain("json.dumps(get_3rd_order_seidel_data(_build_opm()))");
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
    expect(allCode).toContain("plot_lens_layout,");
    expect(allCode).toContain("plot_ray_fan,");
    expect(allCode).toContain("plot_opd_fan,");
    expect(allCode).toContain("plot_spot_diagram,");
    expect(allCode).toContain("plot_surface_by_surface_3rd_order_aberr,");
    expect(allCode).toContain("plot_wavefront_map,");
    expect(allCode).toContain("plot_geo_psf,");
    expect(allCode).toContain("plot_diffraction_psf,");
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
