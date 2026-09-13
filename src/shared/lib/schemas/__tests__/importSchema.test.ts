import {
  validateImportedCustomGlassData,
  validateImportedLensData,
} from "@/shared/lib/schemas/importSchema";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const baseModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 25 },
    field: {
      space: "object",
      type: "angle",
      maxField: 20,
      fields: [0, 0.7, 1],
      isRelative: true,
    },
    wavelengths: {
      weights: [
        [486.133, 1],
        [587.562, 1],
        [656.273, 1],
      ],
      referenceIndex: 1,
    },
  },
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [],
};

describe("validateImportedLensData", () => {
  it.each(["setAutoAperture", "specs", "object", "image", "surfaces"])(
    "requires the root field %s",
    (field) => {
      const model = { ...baseModel } as Record<string, unknown>;
      delete model[field];

      expect(validateImportedLensData(model)).toBe(false);
    },
  );

  it.each(["pupil", "field", "wavelengths"])("requires specs.%s", (field) => {
    const specs = { ...baseModel.specs } as Record<string, unknown>;
    delete specs[field];

    expect(validateImportedLensData({ ...baseModel, specs })).toBe(false);
  });

  it.each(["weights", "referenceIndex"])(
    "requires specs.wavelengths.%s",
    (field) => {
      const wavelengths = { ...baseModel.specs.wavelengths } as Record<
        string,
        unknown
      >;
      delete wavelengths[field];

      expect(
        validateImportedLensData({
          ...baseModel,
          specs: { ...baseModel.specs, wavelengths },
        }),
      ).toBe(false);
    },
  );

  it.each([
    ["object pupil", baseModel.specs.pupil],
    ["image pupil", { space: "image", type: "f/#", value: 4 }],
  ])("requires every %s field", (_label, pupil) => {
    for (const field of ["space", "type", "value"]) {
      const invalidPupil = { ...pupil } as Record<string, unknown>;
      delete invalidPupil[field];

      expect(
        validateImportedLensData({
          ...baseModel,
          specs: { ...baseModel.specs, pupil: invalidPupil },
        }),
      ).toBe(false);
    }
  });

  it.each([
    [
      "object field",
      { ...baseModel.specs.field, space: "object", type: "angle" },
    ],
    [
      "image field",
      { ...baseModel.specs.field, space: "image", type: "height" },
    ],
  ])("requires every %s field", (_label, fieldValue) => {
    for (const field of ["space", "type", "maxField", "fields", "isRelative"]) {
      const invalidField = { ...fieldValue } as Record<string, unknown>;
      delete invalidField[field];

      expect(
        validateImportedLensData({
          ...baseModel,
          specs: { ...baseModel.specs, field: invalidField },
        }),
      ).toBe(false);
    }
  });

  it.each([
    ["root", { unexpected: true }],
    ["specs", { unexpected: true }],
    ["pupil", { unexpected: true }],
    ["image pupil", { unexpected: true }],
    ["field", { unexpected: true }],
    ["image field", { unexpected: true }],
    ["wavelengths", { unexpected: true }],
    ["object", { unexpected: true }],
    ["image", { unexpected: true }],
    ["surface", { unexpected: true }],
  ])("rejects an unknown property in the %s schema", (location, value) => {
    let model: Record<string, unknown> = { ...baseModel };
    if (location === "root") model = { ...model, unexpected: true };
    if (location === "specs")
      model = { ...model, specs: { ...baseModel.specs, ...value } };
    if (location === "pupil")
      model = {
        ...model,
        specs: {
          ...baseModel.specs,
          pupil: { ...baseModel.specs.pupil, ...value },
        },
      };
    if (location === "image pupil")
      model = {
        ...model,
        specs: {
          ...baseModel.specs,
          pupil: { space: "image", type: "f/#", value: 4, ...value },
        },
      };
    if (location === "field")
      model = {
        ...model,
        specs: {
          ...baseModel.specs,
          field: { ...baseModel.specs.field, ...value },
        },
      };
    if (location === "image field")
      model = {
        ...model,
        specs: {
          ...baseModel.specs,
          field: {
            space: "image",
            type: "height",
            maxField: 1,
            fields: [0],
            isRelative: false,
            ...value,
          },
        },
      };
    if (location === "wavelengths")
      model = {
        ...model,
        specs: {
          ...baseModel.specs,
          wavelengths: { ...baseModel.specs.wavelengths, ...value },
        },
      };
    if (location === "object")
      model = { ...model, object: { ...baseModel.object, ...value } };
    if (location === "image")
      model = { ...model, image: { ...baseModel.image, ...value } };
    if (location === "surface")
      model = {
        ...model,
        surfaces: [
          {
            label: "Default",
            curvatureRadius: 10,
            thickness: 2,
            medium: "air",
            manufacturer: "",
            semiDiameter: 5,
            ...value,
          },
        ],
      };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it.each(["invalid", "auto", "manualAperture", "autoAperture"])(
    "accepts only a supported aperture mode when setAutoAperture is %s",
    (setAutoAperture) => {
      const accepted =
        setAutoAperture === "manualAperture" ||
        setAutoAperture === "autoAperture";

      expect(validateImportedLensData({ ...baseModel, setAutoAperture })).toBe(
        accepted,
      );
    },
  );

  it.each([
    { space: "object", type: "invalid", value: 1 },
    { space: "invalid", type: "epd", value: 1 },
    { space: "image", type: "f/#", value: Number.NaN },
    { space: "object", type: "epd", value: Number.POSITIVE_INFINITY },
  ])("rejects invalid pupil values %#", (pupil) => {
    expect(
      validateImportedLensData({
        ...baseModel,
        specs: { ...baseModel.specs, pupil },
      }),
    ).toBe(false);
  });

  it.each([
    {
      space: "object",
      type: "angle",
      maxField: Number.NaN,
      fields: [0],
      isRelative: false,
    },
    {
      space: "object",
      type: "height",
      maxField: 1,
      fields: [Number.POSITIVE_INFINITY],
      isRelative: false,
    },
    {
      space: "object",
      type: "angle",
      maxField: 1,
      fields: [0],
      isRelative: "false",
    },
    {
      space: "image",
      type: "angle",
      maxField: 1,
      fields: [0],
      isRelative: false,
    },
  ])("rejects invalid field values %#", (field) => {
    expect(
      validateImportedLensData({
        ...baseModel,
        specs: { ...baseModel.specs, field },
      }),
    ).toBe(false);
  });

  it("allows an empty wavelength list", () => {
    expect(
      validateImportedLensData({
        ...baseModel,
        specs: {
          ...baseModel.specs,
          wavelengths: { ...baseModel.specs.wavelengths, weights: [] },
        },
      }),
    ).toBe(true);
  });

  it.each([{ weights: [[587.562]] }, { weights: [[587.562, 1, 2]] }])(
    "rejects wavelength weights with invalid entries",
    ({ weights }) => {
      expect(
        validateImportedLensData({
          ...baseModel,
          specs: {
            ...baseModel.specs,
            wavelengths: { ...baseModel.specs.wavelengths, weights },
          },
        }),
      ).toBe(false);
    },
  );

  it.each([undefined, "", "Front element"])(
    "accepts an optional string surface comment %p",
    (comment) => {
      const surface = {
        label: "Default",
        curvatureRadius: 10,
        thickness: 2,
        medium: "air",
        manufacturer: "",
        semiDiameter: 5,
        ...(comment !== undefined ? { comment } : {}),
      };

      expect(
        validateImportedLensData({ ...baseModel, surfaces: [surface] }),
      ).toBe(true);
    },
  );

  it.each([null, 42, false, { text: "Front element" }])(
    "rejects non-string surface comment %p",
    (comment) => {
      const surface = {
        label: "Default",
        curvatureRadius: 10,
        thickness: 2,
        medium: "air",
        manufacturer: "",
        semiDiameter: 5,
        comment,
      };

      expect(
        validateImportedLensData({ ...baseModel, surfaces: [surface] }),
      ).toBe(false);
    },
  );

  it.each([
    { space: "object", type: "epd", value: 25 },
    { space: "object", type: "NA", value: 0.8 },
    { space: "image", type: "f/#", value: 4 },
  ])("accepts the supported pupil combination $space $type", (pupil) => {
    const model = {
      ...baseModel,
      specs: {
        ...baseModel.specs,
        pupil,
      },
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it.each([
    { space: "object", type: "f/#", value: 4 },
    { space: "image", type: "epd", value: 25 },
    { space: "image", type: "NA", value: 0.8 },
  ])("rejects the forbidden pupil combination $space $type", (pupil) => {
    const model = {
      ...baseModel,
      specs: {
        ...baseModel.specs,
        pupil,
      },
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it.each([
    { space: "object", type: "height" },
    { space: "object", type: "angle" },
    { space: "image", type: "height" },
  ])(
    "accepts the supported field combination $space $type",
    ({ space, type }) => {
      const model = {
        ...baseModel,
        specs: {
          ...baseModel.specs,
          field: {
            ...baseModel.specs.field,
            space,
            type,
          },
        },
      };

      expect(validateImportedLensData(model)).toBe(true);
    },
  );

  it("rejects image-space angle fields", () => {
    const model = {
      ...baseModel,
      specs: {
        ...baseModel.specs,
        field: {
          ...baseModel.specs.field,
          space: "image",
          type: "angle",
        },
      },
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects an unsupported object-space field type", () => {
    expect(
      validateImportedLensData({
        ...baseModel,
        specs: {
          ...baseModel.specs,
          field: { ...baseModel.specs.field, type: "width" },
        },
      }),
    ).toBe(false);
  });

  it.each([
    ["maxField", "invalid"],
    ["fields", [Number.NaN]],
    ["isRelative", "false"],
    ["isWideAngle", "yes"],
  ])("rejects invalid image-space field.%s", (field, value) => {
    expect(
      validateImportedLensData({
        ...baseModel,
        specs: {
          ...baseModel.specs,
          field: {
            space: "image",
            type: "height",
            maxField: 1,
            fields: [0],
            isRelative: false,
            ...(field === "maxField" ? { maxField: value } : {}),
            ...(field === "fields" ? { fields: value } : {}),
            ...(field === "isRelative" ? { isRelative: value } : {}),
            ...(field === "isWideAngle" ? { isWideAngle: value } : {}),
          },
        },
      }),
    ).toBe(false);
  });

  it("accepts models with field.isWideAngle set to true", () => {
    const model: OpticalModel = {
      ...baseModel,
      specs: {
        ...baseModel.specs,
        field: {
          ...baseModel.specs.field,
          isWideAngle: true,
        },
      },
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts models with field.isWideAngle set to false", () => {
    const model: OpticalModel = {
      ...baseModel,
      specs: {
        ...baseModel.specs,
        field: {
          ...baseModel.specs.field,
          isWideAngle: false,
        },
      },
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts models with field.isWideAngle omitted", () => {
    expect(validateImportedLensData(baseModel)).toBe(true);
  });

  it("rejects models with non-boolean field.isWideAngle", () => {
    const model = {
      ...baseModel,
      specs: {
        ...baseModel.specs,
        field: {
          ...baseModel.specs.field,
          isWideAngle: "yes",
        },
      },
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects models with missing object medium", () => {
    const model = {
      ...baseModel,
      object: {
        distance: baseModel.object.distance,
        manufacturer: baseModel.object.manufacturer,
      },
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects models with missing object manufacturer", () => {
    const model = {
      ...baseModel,
      object: {
        distance: baseModel.object.distance,
        medium: baseModel.object.medium,
      },
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects models with REFL object medium", () => {
    const model: OpticalModel = {
      ...baseModel,
      object: {
        distance: baseModel.object.distance,
        medium: "REFL",
        manufacturer: "",
      },
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("accepts models with conic aspherical surfaces using kind", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          aspherical: {
            kind: "Conic",
            conicConstant: -1,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts models with even aspherical surfaces using kind", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          aspherical: {
            kind: "EvenAspherical",
            conicConstant: 0,
            polynomialCoefficients: [0.001, 0.0002],
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts models with radial polynomial aspherical surfaces using kind", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          aspherical: {
            kind: "RadialPolynomial",
            conicConstant: 0,
            polynomialCoefficients: [0.001, 0.0002],
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts models with x toroid aspherical surfaces using kind", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          aspherical: {
            kind: "XToroid",
            conicConstant: 0,
            toricSweepRadiusOfCurvature: 20,
            polynomialCoefficients: [0.001, 0.0002],
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts models with y toroid aspherical surfaces using kind", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          aspherical: {
            kind: "YToroid",
            conicConstant: 0,
            toricSweepRadiusOfCurvature: 20,
            polynomialCoefficients: [0.001, 0.0002],
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("rejects legacy aspherical surfaces without kind", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          aspherical: {
            conicConstant: -1,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("accepts models with diffraction grating on a surface", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          diffractiveElement: {
            diffractionGrating: {
              lpmm: 1000,
              order: 1,
            },
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts circular aperture fields on a surface", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          clear_aperture: { shape: "circular", offsetX: -1.25, offsetY: 2.5 },
          edge_aperture: {
            shape: "circular",
            radius: 4,
            offsetX: 0,
            offsetY: -3.5,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts annular clear aperture fields on a surface", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          clear_aperture: {
            shape: "annular",
            obstructionRadius: 2,
            offsetX: -1.25,
            offsetY: 2.5,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("accepts a Ronchi ruling clear aperture whose radius comes from semiDiameter", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          clear_aperture: {
            shape: "ronchi",
            lpmm: 10,
            rotation: 15,
            offsetX: -1.25,
            offsetY: 2.5,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it.each([
    ["lpmm", 0, 5],
    ["lpmm", -1, 5],
    ["lpmm", Number.POSITIVE_INFINITY, 5],
    ["rotation", Number.POSITIVE_INFINITY, 5],
    ["offsetX", Number.NaN, 5],
    ["offsetY", Number.NEGATIVE_INFINITY, 5],
    ["semiDiameter", 0, 0],
    ["semiDiameter", -1, -1],
    ["semiDiameter", Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
  ])("rejects invalid Ronchi field %s=%s", (field, value, semiDiameter) => {
    const clearAperture = {
      shape: "ronchi",
      lpmm: 10,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      ...(field === "semiDiameter" ? {} : { [field]: value }),
    };
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter,
          clear_aperture: clearAperture,
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects a Ronchi ruling that duplicates its radius", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          clear_aperture: {
            shape: "ronchi",
            lpmm: 10,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            radius: 5,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("accepts rectangular clear and edge aperture fields on a surface", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 0,
          clear_aperture: {
            shape: "rectangular",
            xHalfWidth: 4,
            yHalfWidth: 2,
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

    expect(validateImportedLensData(model)).toBe(true);
  });

  it.each([
    ["xHalfWidth", 0],
    ["yHalfWidth", -1],
    ["rotation", Number.POSITIVE_INFINITY],
    ["offsetX", Number.NaN],
  ])("rejects invalid rectangular aperture field %s=%s", (field, value) => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 0,
          clear_aperture: {
            shape: "rectangular",
            xHalfWidth: 4,
            yHalfWidth: 2,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            [field]: value,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it.each([0, -1, 5, 6, Number.POSITIVE_INFINITY])(
    "rejects annular obstruction radius %s",
    (obstructionRadius) => {
      const model = {
        ...baseModel,
        surfaces: [
          {
            label: "Default",
            curvatureRadius: 12,
            thickness: 3,
            medium: "air",
            manufacturer: "",
            semiDiameter: 5,
            clear_aperture: {
              shape: "annular",
              obstructionRadius,
              offsetX: 0,
              offsetY: 0,
            },
          },
        ],
      };

      expect(validateImportedLensData(model)).toBe(false);
    },
  );

  it("rejects annular clear aperture with unexpected keys", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          clear_aperture: {
            shape: "annular",
            obstructionRadius: 2,
            offsetX: 0,
            offsetY: 0,
            radius: 5,
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects legacy circular aperture fields without offsets", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          clear_aperture: { shape: "circular" },
          edge_aperture: { shape: "circular", radius: 4 },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it.each([
    ["clear_aperture", "offsetX", "1"],
    ["clear_aperture", "offsetY", Number.POSITIVE_INFINITY],
    ["edge_aperture", "offsetX", "1"],
    ["edge_aperture", "offsetY", Number.POSITIVE_INFINITY],
  ] as const)(
    "rejects %s with invalid %s",
    (apertureKey, offsetKey, offsetValue) => {
      const clearAperture = { shape: "circular", offsetX: 0, offsetY: 0 };
      const edgeAperture = {
        shape: "circular",
        radius: 4,
        offsetX: 0,
        offsetY: 0,
      };
      const model = {
        ...baseModel,
        surfaces: [
          {
            label: "Default",
            curvatureRadius: 12,
            thickness: 3,
            medium: "air",
            manufacturer: "",
            semiDiameter: 5,
            clear_aperture:
              apertureKey === "clear_aperture"
                ? { ...clearAperture, [offsetKey]: offsetValue }
                : clearAperture,
            edge_aperture:
              apertureKey === "edge_aperture"
                ? { ...edgeAperture, [offsetKey]: offsetValue }
                : edgeAperture,
          },
        ],
      };

      expect(validateImportedLensData(model)).toBe(false);
    },
  );

  it.each([0, -1, Number.POSITIVE_INFINITY])(
    "rejects edge aperture radius %s",
    (radius) => {
      const model = {
        ...baseModel,
        surfaces: [
          {
            label: "Default",
            curvatureRadius: 12,
            thickness: 3,
            medium: "air",
            manufacturer: "",
            semiDiameter: 5,
            edge_aperture: {
              shape: "circular",
              radius,
              offsetX: 0,
              offsetY: 0,
            },
          },
        ],
      };

      expect(validateImportedLensData(model)).toBe(false);
    },
  );

  it("rejects unsupported aperture shape and unexpected aperture keys", () => {
    const invalidShapeModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          clear_aperture: { shape: "rectangular" },
        },
      ],
    };
    const extraKeyModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          edge_aperture: {
            shape: "circular",
            radius: 4,
            offsetX: 0,
            offsetY: 0,
            mode: "local",
          },
        },
      ],
    };

    expect(validateImportedLensData(invalidShapeModel)).toBe(false);
    expect(validateImportedLensData(extraKeyModel)).toBe(false);
  });

  it("accepts an empty diffractive-element wrapper", () => {
    const model: OpticalModel = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          diffractiveElement: {},
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(true);
  });

  it("rejects the legacy flat diffraction-grating property", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          diffractionGrating: { lpmm: 1000, order: 1 },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it.each([null, "grating", 1, []])(
    "rejects malformed diffractive-element parent %p",
    (diffractiveElement) => {
      const model = {
        ...baseModel,
        surfaces: [
          {
            label: "Default",
            curvatureRadius: 12,
            thickness: 3,
            medium: "air",
            manufacturer: "",
            semiDiameter: 5,
            diffractiveElement,
          },
        ],
      };

      expect(validateImportedLensData(model)).toBe(false);
    },
  );

  it("rejects unexpected diffractive-element keys", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          diffractiveElement: { hologram: {} },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it.each([null, "grating", 1, [], {}, { lpmm: 1000 }, { order: 1 }])(
    "rejects malformed diffraction-grating child %p",
    (diffractionGrating) => {
      const model = {
        ...baseModel,
        surfaces: [
          {
            label: "Default",
            curvatureRadius: 12,
            thickness: 3,
            medium: "air",
            manufacturer: "",
            semiDiameter: 5,
            diffractiveElement: { diffractionGrating },
          },
        ],
      };

      expect(validateImportedLensData(model)).toBe(false);
    },
  );

  it("rejects diffraction grating with non-numeric lpmm", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          diffractiveElement: {
            diffractionGrating: {
              lpmm: "1000",
              order: 1,
            },
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects diffraction grating with non-integer order", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          diffractiveElement: {
            diffractionGrating: {
              lpmm: 1000,
              order: 1.5,
            },
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it("rejects diffraction grating with unexpected keys", () => {
    const model = {
      ...baseModel,
      surfaces: [
        {
          label: "Default",
          curvatureRadius: 12,
          thickness: 3,
          medium: "air",
          manufacturer: "",
          semiDiameter: 5,
          diffractiveElement: {
            diffractionGrating: {
              lpmm: 1000,
              order: 1,
              grooveShape: "sawtooth",
            },
          },
        },
      ],
    };

    expect(validateImportedLensData(model)).toBe(false);
  });

  it.each([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN])(
    "rejects diffraction grating with non-finite lpmm %p",
    (lpmm) => {
      const model = {
        ...baseModel,
        surfaces: [
          {
            label: "Default",
            curvatureRadius: 12,
            thickness: 3,
            medium: "air",
            manufacturer: "",
            semiDiameter: 5,
            diffractiveElement: { diffractionGrating: { lpmm, order: 1 } },
          },
        ],
      };

      expect(validateImportedLensData(model)).toBe(false);
    },
  );
});

describe("validateImportedCustomGlassData", () => {
  const validPayload = {
    version: "1.0",
    Custom: {
      CUSTOM_A: {
        type: "tabulated",
        data: [
          [486.13, 1.5224],
          [546.07, 1.5187],
          [587.56, 1.5168],
          [656.27, 1.5143],
        ],
      },
    },
  };

  it("accepts version 1.0 tabulated custom glass data", () => {
    expect(validateImportedCustomGlassData(validPayload)).toBe(true);
  });

  it.each(["version", "Custom"])(
    "requires the custom-glass field %s",
    (field) => {
      const payload = { ...validPayload } as Record<string, unknown>;
      delete payload[field];

      expect(validateImportedCustomGlassData(payload)).toBe(false);
    },
  );

  it.each(["type", "data"])(
    "requires each custom material field %s",
    (field) => {
      const material = { ...validPayload.Custom.CUSTOM_A } as Record<
        string,
        unknown
      >;
      delete material[field];

      expect(
        validateImportedCustomGlassData({
          ...validPayload,
          Custom: { CUSTOM_A: material },
        }),
      ).toBe(false);
    },
  );

  it("rejects unknown properties at the envelope and material levels", () => {
    expect(
      validateImportedCustomGlassData({ ...validPayload, extra: true }),
    ).toBe(false);
    expect(
      validateImportedCustomGlassData({
        ...validPayload,
        Custom: { CUSTOM_A: { ...validPayload.Custom.CUSTOM_A, extra: true } },
      }),
    ).toBe(false);
  });

  it.each([
    [
      [
        [486.13, 1.5224],
        [546.07, 1.5187],
        [587.56, 1.5168],
      ],
    ],
    [
      [
        [486.13, 1.5224],
        [546.07, 1.5187],
        [587.56, 1.5168],
        [656.27, 0],
      ],
    ],
    [
      [
        [486.13, 1.5224],
        [546.07, Number.NaN],
        [587.56, 1.5168],
        [656.27, 1.5143],
      ],
    ],
  ])("rejects custom glass data outside positive finite boundaries", (data) => {
    expect(
      validateImportedCustomGlassData({
        ...validPayload,
        Custom: { CUSTOM_A: { ...validPayload.Custom.CUSTOM_A, data } },
      }),
    ).toBe(false);
  });

  it.each([
    { ...validPayload, version: 1 },
    { ...validPayload, version: "1" },
    {
      ...validPayload,
      Custom: {
        CUSTOM_A: { ...validPayload.Custom.CUSTOM_A, type: "sellmeier" },
      },
    },
    {
      ...validPayload,
      Custom: {
        CUSTOM_A: { ...validPayload.Custom.CUSTOM_A, data: [[587.56, 1.5168]] },
      },
    },
    {
      ...validPayload,
      Custom: {
        CUSTOM_A: {
          ...validPayload.Custom.CUSTOM_A,
          data: [
            [587.56, 1.5168],
            [546.07, 1.5187],
            [486.13, -1],
            [656.27, 1.5143],
          ],
        },
      },
    },
    {
      ...validPayload,
      Custom: { CUSTOM_A: { ...validPayload.Custom.CUSTOM_A, extra: true } },
    },
  ])("rejects invalid custom glass payload %#", (payload) => {
    expect(validateImportedCustomGlassData(payload)).toBe(false);
  });
});
