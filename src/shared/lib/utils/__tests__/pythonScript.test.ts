import { buildOpticalModelScript, buildScript, buildExportScript } from "../pythonScript";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const baseModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20.0, fields: [0, 0.707, 1], isRelative: true },
    wavelengths: { weights: [[656.3, 1], [587, 2], [486.1, 1]], referenceIndex: 1 },
  },
  object: { distance: 1e10, medium: "air", manufacturer: "" },
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
    expect(script).not.toContain("sd=");
    expect(script).toContain("sm.add_surface([23.713, 4.831, \"N-LAK9\", \"Schott\"])\nsm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=10.009, x_offset=0, y_offset=0)]");
    expect(script).toContain("sm.add_surface([7331.288, 5.86, \"air\"])\nsm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=8.9483, x_offset=0, y_offset=0)]");
    expect(script).toContain("sm.add_surface([-24.456, 0.975, \"N-SF5\", \"Schott\"])\nsm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=4.7918, x_offset=0, y_offset=0)]\nsm.set_stop()");
    expect(script).toContain("sm.add_surface([21.896, 4.822, \"air\"])\nsm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=4.776, x_offset=0, y_offset=0)]");
    expect(script).toContain("sm.add_surface([86.759, 3.127, \"N-LAK9\", \"Schott\"])\nsm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=8.0218, x_offset=0, y_offset=0)]");
    expect(script).toContain("sm.add_surface([-20.4942, 41.2365, \"air\"])\nsm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=8.3321, x_offset=0, y_offset=0)]");
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

  it("should keep object setup lines grouped before surface construction", () => {
    const script = buildOpticalModelScript(baseModel);
    expect(script).toContain(
      [
        "opm.radius_mode = True",
        "sm.do_apertures = False",
        "",
        "sm.gaps[0].thi=10000000000",
        "sm.gaps[0].medium = decode_medium(\"air\")",
        "sm.add_surface([23.713, 4.831, \"N-LAK9\", \"Schott\"])",
        "sm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=10.009, x_offset=0, y_offset=0)]",
      ].join("\n")
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
          aspherical: {
            kind: "EvenAspherical",
            conicConstant: 0.1,
            polynomialCoefficients: [0, 0.02, 0, 0, 0, 0, 0, 0, 0, 0],
          },
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
          aspherical: { kind: "Conic", conicConstant: 0.1 },
        },
        ...baseModel.surfaces.slice(2),
      ],
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain("sm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=23.713, cc=0.1)");
  });

  it("should set a radial polynomial surface correctly", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        baseModel.surfaces[0],
        {
          ...baseModel.surfaces[1],
          curvatureRadius: 23.713,
          aspherical: {
            kind: "RadialPolynomial",
            conicConstant: 0.1,
            polynomialCoefficients: [0, 0.02],
          },
        },
        ...baseModel.surfaces.slice(2),
      ],
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain("sm.ifcs[sm.cur_surface].profile = RadialPolynomial(r=23.713, cc=0.1, coefs=[0,0.02])");
  });

  it("should set an x toroid surface correctly", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        baseModel.surfaces[0],
        {
          ...baseModel.surfaces[1],
          curvatureRadius: 23.713,
          aspherical: {
            kind: "XToroid",
            conicConstant: 0.1,
            toricSweepRadiusOfCurvature: 40,
            polynomialCoefficients: [0, 0.02],
          },
        },
        ...baseModel.surfaces.slice(2),
      ],
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain("sm.ifcs[sm.cur_surface].profile = XToroid(r=23.713, cc=0.1, cR=40, coefs=[0,0.02])");
  });

  it("should set a y toroid surface correctly", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        baseModel.surfaces[0],
        {
          ...baseModel.surfaces[1],
          curvatureRadius: 23.713,
          aspherical: {
            kind: "YToroid",
            conicConstant: 0.1,
            toricSweepRadiusOfCurvature: 40,
            polynomialCoefficients: [0, 0.02],
          },
        },
        ...baseModel.surfaces.slice(2),
      ],
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain("sm.ifcs[sm.cur_surface].profile = YToroid(r=23.713, cc=0.1, cR=40, coefs=[0,0.02])");
  });

  it("should preserve the mutation order for a stop surface with asphere and decenter", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Stop",
          curvatureRadius: 23.713,
          thickness: 1.2,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5.5,
          aspherical: {
            kind: "EvenAspherical",
            conicConstant: -1,
            polynomialCoefficients: [0, 0.02],
          },
          decenter: {
            coordinateSystemStrategy: "decenter",
            alpha: 1,
            beta: 2,
            gamma: 3,
            offsetX: 0.1,
            offsetY: 0.2,
          },
        },
      ],
    };

    const script = buildOpticalModelScript(model);

    expect(script).toContain(
      [
        "sm.add_surface([23.713, 1.2, \"air\"])",
        "sm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=5.5, x_offset=0, y_offset=0)]",
        "sm.ifcs[sm.cur_surface].profile = EvenPolynomial(r=23.713, cc=-1, coefs=[0,0.02])",
        "sm.ifcs[sm.cur_surface].decenter = DecenterData(\"decenter\", alpha=1, beta=2, gamma=3, x=0.1, y=0.2)",
        "sm.set_stop()",
      ].join("\n")
    );
  });

  it("should set a surface diffraction grating when provided", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          ...baseModel.surfaces[0],
          diffractionGrating: {
            lpmm: 1000,
            order: 1,
          },
        },
        ...baseModel.surfaces.slice(1),
      ],
    };

    const script = buildOpticalModelScript(model);

    expect(script).toContain(
      "sm.ifcs[sm.cur_surface].phase_element = DiffractionGrating(grating_lpmm=1000, order=1)"
    );
  });

  it("should emit OffsetCircular for nonzero clear and edge aperture offsets", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          ...baseModel.surfaces[0],
          semiDiameter: 3,
          clear_aperture: { shape: "circular", offsetX: -0.5, offsetY: 1.25 },
          edge_aperture: { shape: "circular", radius: 2.5, offsetX: 0.75, offsetY: -1.5 },
        },
      ],
    };

    const script = buildOpticalModelScript(model);

    expect(script).toContain(
      [
        "sm.add_surface([23.713, 4.831, \"N-LAK9\", \"Schott\"])",
        "sm.ifcs[sm.cur_surface].clear_apertures = [OffsetCircular(radius=3, x_offset=-0.5, y_offset=1.25)]",
        "sm.ifcs[sm.cur_surface].edge_apertures = [OffsetCircular(radius=2.5, x_offset=0.75, y_offset=-1.5)]",
      ].join("\n"),
    );
  });

  it("should keep Circular for zero-offset clear and edge apertures", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          ...baseModel.surfaces[0],
          semiDiameter: 3,
          clear_aperture: { shape: "circular", offsetX: 0, offsetY: 0 },
          edge_aperture: { shape: "circular", radius: 2.5, offsetX: 0, offsetY: 0 },
        },
      ],
    };

    const script = buildOpticalModelScript(model);

    expect(script).toContain(
      [
        "sm.add_surface([23.713, 4.831, \"N-LAK9\", \"Schott\"])",
        "sm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=3, x_offset=0, y_offset=0)]",
        "sm.ifcs[sm.cur_surface].edge_apertures = [Circular(radius=2.5, x_offset=0, y_offset=0)]",
      ].join("\n"),
    );
    expect(script).not.toContain("OffsetCircular(radius=3");
  });

  it("should emit Annular for annular clear aperture", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          ...baseModel.surfaces[0],
          semiDiameter: 6,
          clear_aperture: { shape: "annular", obstructionRadius: 2.25, offsetX: -0.5, offsetY: 1.25 },
          edge_aperture: { shape: "circular", radius: 5, offsetX: 0, offsetY: 0 },
        },
      ],
    };

    const script = buildOpticalModelScript(model);

    expect(script).toContain(
      [
        "sm.add_surface([23.713, 4.831, \"N-LAK9\", \"Schott\"])",
        "sm.ifcs[sm.cur_surface].clear_apertures = [Annular(radius=6, obstruction_radius=2.25, x_offset=-0.5, y_offset=1.25)]",
        "sm.ifcs[sm.cur_surface].edge_apertures = [Circular(radius=5, x_offset=0, y_offset=0)]",
      ].join("\n"),
    );
  });

  it("should emit OffsetRotatedRectangular for rectangular clear and edge apertures", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          ...baseModel.surfaces[0],
          semiDiameter: 0,
          clear_aperture: {
            shape: "rectangular",
            xHalfWidth: 4.5,
            yHalfWidth: 2.25,
            rotation: 15,
            offsetX: -1,
            offsetY: 2,
          },
          edge_aperture: {
            shape: "rectangular",
            xHalfWidth: 5,
            yHalfWidth: 3,
            rotation: -30,
            offsetX: 0.5,
            offsetY: -0.75,
          },
        },
      ],
    };

    const script = buildOpticalModelScript(model);

    expect(script).toContain(
      [
        "sm.add_surface([23.713, 4.831, \"N-LAK9\", \"Schott\"])",
        "sm.ifcs[sm.cur_surface].clear_apertures = [OffsetRotatedRectangular(x_half_width=4.5, y_half_width=2.25, x_offset=-1, y_offset=2, rotation=15)]",
        "sm.ifcs[sm.cur_surface].edge_apertures = [OffsetRotatedRectangular(x_half_width=5, y_half_width=3, x_offset=0.5, y_offset=-0.75, rotation=-30)]",
      ].join("\n"),
    );
  });

  it("should omit clear aperture for non-positive semi-diameter and edge aperture for default follow-clear", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          ...baseModel.surfaces[0],
          semiDiameter: 0,
          clear_aperture: { shape: "circular", offsetX: 1, offsetY: 2 },
          edge_aperture: undefined,
        },
      ],
    };

    const script = buildOpticalModelScript(model);

    expect(script).toContain("sm.add_surface([23.713, 4.831, \"N-LAK9\", \"Schott\"])");
    expect(script).not.toContain("clear_apertures");
    expect(script).not.toContain("edge_apertures");
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
    expect(script).toContain("sm.add_surface([30, 1.1, caf2])\nsm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=10, x_offset=0, y_offset=0)]");
  });

  it("should set a surface with water correctly", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        { label: "Default", curvatureRadius: 30, thickness: 1.1, medium: "Water", manufacturer: "", semiDiameter: 10 },
        { label: "Default", curvatureRadius: 0, thickness: 70, medium: "air", manufacturer: "", semiDiameter: 10 },
      ],
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain("sm.add_surface([30, 1.1, water])\nsm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=10, x_offset=0, y_offset=0)]");
  });

  it("should set a surface with D263TECO correctly", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        { label: "Default", curvatureRadius: 30, thickness: 1.1, medium: "D263TECO", manufacturer: "", semiDiameter: 10 },
        { label: "Default", curvatureRadius: 0, thickness: 70, medium: "air", manufacturer: "", semiDiameter: 10 },
      ],
    };
    const script = buildOpticalModelScript(model);
    expect(script).toContain("sm.add_surface([30, 1.1, d263teco])\nsm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=10, x_offset=0, y_offset=0)]");
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
    expect(script).toContain("sm.add_surface([30, 1.1, 1.42])\nsm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=10, x_offset=0, y_offset=0)]");
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
    expect(script).toContain("sm.add_surface([30, 1.1, 1.42, 84.1])\nsm.ifcs[sm.cur_surface].clear_apertures = [Circular(radius=10, x_offset=0, y_offset=0)]");
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

  it("should set the flag `is_wide_angle` to be True if the attribute of isWideAngle is true in field", () => {
    const opticalModel = {
      ...baseModel,
      specs: {
        ...baseModel.specs,
        field: { ...baseModel.specs.field, isWideAngle: true }
      },
    };
    const script = buildOpticalModelScript(opticalModel);
    expect(script).toContain("osp['fov'] = FieldSpec(osp, key=['object', 'angle'], value=20, flds=[0,0.707,1], is_relative=True, is_wide_angle=True)");
  });
});

describe("buildExportScript", () => {
  it("imports Circular and Rectangular in the export preamble", () => {
    const script = buildExportScript(baseModel);
    expect(script).toContain("from rayoptics.elem.surface import DecenterData, Circular, Aperture, Rectangular");
  });

  it("defines OffsetCircular and Annular inline in the export preamble", () => {
    const script = buildExportScript(baseModel);
    expect(script).toContain("class OffsetCircular(Circular):");
    expect(script).toContain("def edge_pt_target(self, rel_dir):");
    expect(script).toContain("self.x_offset + self.radius * rel_dir[0]");
    expect(script).toContain("self.y_offset + self.radius * rel_dir[1]");
    expect(script).toContain("class Annular(Aperture):");
    expect(script).toContain("obstruction_radius");
    expect(script).toContain("return self.obstruction_radius - fuzz <= radius <= self.radius + fuzz");
  });

  it("defines OffsetRotatedRectangular inline in the export preamble", () => {
    const script = buildExportScript(baseModel);
    expect(script).toContain("class OffsetRotatedRectangular(Rectangular):");
    expect(script).toContain("angle = radians(self.rotation)");
    expect(script).toContain("def point_inside(self, x, y, fuzz=1e-5):");
    expect(script).toContain("def edge_pt_target(self, rel_dir):");
  });

  it("defines the water material in the export preamble", () => {
    const script = buildExportScript(baseModel);
    expect(script).toContain("water_url = 'https://refractiveindex.info/database/data/main/H2O/nk/Daimon-20.0C.yml'");
    expect(script).toContain('water = create_glass(water_url, "rindexinfo")');
  });

  it("defines the D263TECO material in the export preamble", () => {
    const script = buildExportScript(baseModel);
    expect(script).toContain("d263teco_url = 'https://refractiveindex.info/database/data/specs/schott/misc/D263TECO.yml'");
    expect(script).toContain('d263teco = create_glass(d263teco_url, "rindexinfo")');
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
