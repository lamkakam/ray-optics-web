import { buildOpticalModelScript, buildScript } from "../pythonScript";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const baseModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20.0, fields: [0, 0.707, 1], isRelative: true },
    wavelengths: { weights: [[656.3, 1], [587, 2], [486.1, 1]], referenceIndex: 1 },
  },
  object: { distance: 1e10 },
  image: { curvatureRadius: -42 },
  surfaces: [
    { label: "Default", curvatureRadius: 23.713, thickness: 4.831, medium: "N-LAK9", manufacturer: "Schott", semiDiameter: 10.009 },
    { label: "Default", curvatureRadius: 7331.288, thickness: 5.86, medium: "air", manufacturer: "", semiDiameter: 8.9483 },
    { label: "Stop", curvatureRadius: -24.456, thickness: 0.975, medium: "N-SF5", manufacturer: "Schott", semiDiameter: 4.7918 },
    { label: "Default", curvatureRadius: 21.896, thickness: 4.822, medium: "air", manufacturer: "", semiDiameter: 4.776 },
    { label: "Default", curvatureRadius: 86.759, thickness: 3.127, medium: "N-LAK9", manufacturer: "Schott", semiDiameter: 8.0218 },
    { label: "Default", curvatureRadius: -20.4942, thickness: 41.2365, medium: "air", manufacturer: "", semiDiameter: 8.3321 },
  ],
};

describe("buildOpticalModelScript", () => {
  it("should set optical specs by calling PupilSpec, FieldSpec, and WvlSpec correctly", () => {
    const script = buildOpticalModelScript(baseModel);
    expect(script).toContain("osp['pupil'] = PupilSpec(osp, key=['object', 'epd'], value=12.5)");
    expect(script).toContain("osp['fov'] = FieldSpec(osp, key=['object', 'angle'], value=20, flds=[0,0.707,1], is_relative=True)");
    expect(script).toContain("osp['wvls'] = WvlSpec([(656.3, 1),(587, 2),(486.1, 1)], ref_wl=1)");
  });

  it("should set sm.do_apertures = False when setAutoAperture is manualAperture", () => {
    const script = buildOpticalModelScript(baseModel);
    expect(script).toContain("sm.do_apertures = False");
  });

  it("should set sm.do_apertures = True when setAutoAperture is autoAperture", () => {
    const script = buildOpticalModelScript({ ...baseModel, setAutoAperture: "autoAperture" });
    expect(script).toContain("sm.do_apertures = True");
  });

  it("should add surfaces including stop", () => {
    const script = buildOpticalModelScript(baseModel);
    expect(script).toContain("sm.add_surface([23.713, 4.831, \"N-LAK9\", \"Schott\"], sd=10.009)");
    expect(script).toContain("sm.add_surface([7331.288, 5.86, \"air\"], sd=8.9483)");
    expect(script).toContain("sm.add_surface([-24.456, 0.975, \"N-SF5\", \"Schott\"], sd=4.7918)\nsm.set_stop()");
    expect(script).toContain("sm.add_surface([21.896, 4.822, \"air\"], sd=4.776)");
    expect(script).toContain("sm.add_surface([86.759, 3.127, \"N-LAK9\", \"Schott\"], sd=8.0218)");
    expect(script).toContain("sm.add_surface([-20.4942, 41.2365, \"air\"], sd=8.3321)");
  });

  it("should set the object distance correctly", () => {
    const script = buildOpticalModelScript(baseModel);
    expect(script).toContain("sm.gaps[0].thi=1000000000");
  });

  it("should set the image curvature radius correctly", () => {
    const script = buildOpticalModelScript(baseModel);
    expect(script).toContain("sm.ifcs[-1].profile.r = -42");
  });

  it("should not emit image decenter command when image has no decenter", () => {
    const script = buildOpticalModelScript(baseModel);
    expect(script).not.toContain("sm.ifcs[-1].decenter");
  });

  it("should set image decenter when provided", () => {
    const model: OpticalModel = {
      ...baseModel,
      image: {
        curvatureRadius: -42,
        decenter: { coordinateSystemStrategy: "decenter", alpha: 1.5, beta: 0, gamma: 0, offsetX: 0.1, offsetY: 0.2 },
      },
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain(
      `sm.ifcs[-1].decenter = DecenterData("decenter", alpha=1.5, beta=0, gamma=0, x=0.1, y=0.2)`
    );
  });

  it("should set surface decenter when provided", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          ...baseModel.surfaces[0],
          decenter: { coordinateSystemStrategy: "bend", alpha: 0, beta: 2.0, gamma: 0, offsetX: 0.5, offsetY: -0.5 },
        },
        ...baseModel.surfaces.slice(1),
      ],
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain(
      `sm.ifcs[sm.cur_surface].decenter = DecenterData("bend", alpha=0, beta=2, gamma=0, x=0.5, y=-0.5)`
    );
  });

  it("should set the radius_mode correctly", () => {
    const script = buildOpticalModelScript(baseModel);
    expect(script).toContain("opm.radius_mode = True");
  });

  it("should call the OpticalModel constructor correctly", () => {
    const script = buildOpticalModelScript(baseModel);
    expect(script).toContain("opm = OpticalModel()\nsm  = opm['seq_model']\nosp = opm['optical_spec']\npm  = opm['parax_model']");
  });

  it("should set an aspherical surface correctly", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        baseModel.surfaces[0],
        {
          ...baseModel.surfaces[1],
          curvatureRadius: 23.713,
          aspherical: { conicConstant: 0.1, polynomialCoefficients: [0, 0.02, 0, 0, 0, 0, 0, 0, 0, 0] },
        },
        ...baseModel.surfaces.slice(2),
      ],
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain("sm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=23.713, cc=0.1, coefs=[0,0.02,0,0,0,0,0,0,0,0])");
  });

  it("should set a conic surface correctly", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        baseModel.surfaces[0],
        {
          ...baseModel.surfaces[1],
          curvatureRadius: 23.713,
          aspherical: { conicConstant: 0.1 },
        },
        ...baseModel.surfaces.slice(2),
      ],
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain("sm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=23.713, cc=0.1)");
  });

  it("should set a surface with fluorite correctly", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        { label: "Default", curvatureRadius: 30, thickness: 1.1, medium: "CaF2", manufacturer: "", semiDiameter: 10 },
        { label: "Default", curvatureRadius: 0, thickness: 70, medium: "air", manufacturer: "", semiDiameter: 10 },
      ],
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain("sm.add_surface([30, 1.1, caf2], sd=10)");
  });

  it("should set a model glass surface without manufacturer when medium is numeric and manufacturer is empty", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        { label: "Default", curvatureRadius: 30, thickness: 1.1, medium: "1.42", manufacturer: "", semiDiameter: 10 },
        { label: "Default", curvatureRadius: 0, thickness: 70, medium: "air", manufacturer: "", semiDiameter: 10 },
      ],
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain("sm.add_surface([30, 1.1, 1.42], sd=10)");
  });

  it("should set a model glass surface with abbe number when medium and manufacturer are numeric", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        { label: "Default", curvatureRadius: 30, thickness: 1.1, medium: "1.42", manufacturer: "84.1", semiDiameter: 10 },
        { label: "Default", curvatureRadius: 0, thickness: 70, medium: "air", manufacturer: "", semiDiameter: 10 },
      ],
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain("sm.add_surface([30, 1.1, 1.42, 84.1], sd=10)");
  });

  it("should call opm.update_model()", () => {
    const script = buildOpticalModelScript(baseModel);
    expect(script).toContain("opm.update_model()");
  });

  it("should call set_vig(opm) for real ray tracing vignetting", () => {
    const script = buildOpticalModelScript(baseModel);
    expect(script).toContain("set_vig(opm)");
    expect(script).not.toContain("apply_paraxial_vignetting");
  });
});

describe("buildScript", () => {
  it("should wrap model build in def _build_opm() and inject the opm expression into the callback", () => {
    const script = buildScript(baseModel, (opm) => `json.dumps(get_first_order_data(${opm}))`);
    expect(script).toContain("def _build_opm():");
    expect(script).toContain("    return opm");
    expect(script).toContain("    opm = OpticalModel()");
    expect(script).toContain("json.dumps(get_first_order_data(_build_opm()))");
  });

  it("should put computation after the function definition", () => {
    const script = buildScript(baseModel, (opm) => `result = fn(${opm})`);
    const funcIdx = script.indexOf("def _build_opm():");
    const computeIdx = script.indexOf("result = fn(");
    expect(computeIdx).toBeGreaterThan(funcIdx);
  });

  it("should not have a bare opm assignment in global scope", () => {
    const script = buildScript(baseModel, (opm) => `compute(${opm})`);
    const lines = script.split('\n');
    const bareOpmAssignment = lines.filter(line => /^opm\s*=/.test(line));
    expect(bareOpmAssignment).toHaveLength(0);
  });
});
