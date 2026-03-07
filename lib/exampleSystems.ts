import type { OpticalModel } from "./opticalModel";

//              r            t        medium     mode   zdr      sd
//  Obj:     0.000000  1.00000e+10       air             1  3.6397e+09
//    1:    23.713000      4.83100    N-LAK9             1      10.009
//    2:  7331.288000      5.86000       air             1      8.9482
//  Stop:   -24.456000     0.975000     N-SF5            1      4.7919
//    4:    21.896000      4.82200       air             1      4.7761
//    5:    86.759000      3.12700    N-LAK9             1      8.0217
//    6:   -20.494200      41.2365       air             1      8.3321
//  Img:     0.000000      0.00000                       1      18.217
const SasianTriplet: OpticalModel = {
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: {
      space: "object",
      type: "angle",
      maxField: 20,
      fields: [0, 0.707, 1],
      isRelative: true,
    },
    wavelengths: {
      weights: [
        [486.133, 1],
        [587.562, 2],
        [656.273, 1],
      ],
      referenceIndex: 1,
    },
  },

  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 23.713,
      thickness: 4.831,
      medium: "N-LAK9",
      manufacturer: "Schott",
      semiDiameter: 10.009,
    },
    {
      label: "Default",
      curvatureRadius: 7331.288,
      thickness: 5.86,
      medium: "air",
      manufacturer: "",
      semiDiameter: 8.9482,
    },
    {
      label: "Stop",
      curvatureRadius: -24.456,
      thickness: 0.975,
      medium: "N-SF5",
      manufacturer: "Schott",
      semiDiameter: 4.7919,
    },
    {
      label: "Default",
      curvatureRadius: 21.896,
      thickness: 4.822,
      medium: "air",
      manufacturer: "",
      semiDiameter: 4.7761,
    },
    {
      label: "Default",
      curvatureRadius: 86.759,
      thickness: 3.127,
      medium: "N-LAK9",
      manufacturer: "Schott",
      semiDiameter: 8.0217,
    },
    {
      label: "Default",
      curvatureRadius: -20.4942,
      thickness: 41.2365,
      medium: "air",
      manufacturer: "",
      semiDiameter: 8.3321,
    },
  ],
} as const;

// Design from https://www.telescope-optics.net/reflecting.htm
const ReflectorWithOpticalWindow: OpticalModel = {
  specs: {
    pupil: { space: "object", type: "epd", value: 200 },
    field: {
      space: "object",
      type: "angle",
      maxField: 0.5,
      fields: [0, 1],
      isRelative: true,
    },
    wavelengths: {
      weights: [
        [486.133, 1],
        [587.562, 2],
        [656.273, 1],
      ],
      referenceIndex: 1,
    },
  },

  object: { distance: 1e10 },
  image: { curvatureRadius: -1370 },
  surfaces: [
    {
      label: "Stop",
      curvatureRadius: 0,
      thickness: 6,
      medium: "N-BK7",
      manufacturer: "Schott",
      semiDiameter: 100,
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 860,
      medium: "air",
      manufacturer: "",
      semiDiameter: 100.034477,
    },
    {
      label: "Default",
      curvatureRadius: -2000,
      thickness: -800,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 107.539583,
      aspherical: {
        conicConstant: -1,
      },
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 200,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 28.489411,
    },
  ],
} as const;

// Design from https://telescope-optics.net/schmidt_camera_aberrations.htm
const schmidtCamera: OpticalModel = {
  specs: {
    pupil: { space: "object", type: "epd", value: 200 },
    field: {
      space: "object",
      type: "angle",
      maxField: 1.5,
      fields: [0, 0.707, 1],
      isRelative: true,
    },
    wavelengths: {
      weights: [
        [546.073, 0.98],
        [486.133, 0.18],
        [656.273, 0.075],
        [435.835, 0.035],
      ],
      referenceIndex: 0,
    },
  },
  object: { distance: 1e10 },
  image: { curvatureRadius: -325.3 },
  surfaces: [
    {
      label: "Stop",
      curvatureRadius: 0,
      thickness: 5,
      medium: "N-BK7",
      manufacturer: "Schott",
      semiDiameter: 100,
    },
    {
      label: "Default",
      curvatureRadius: -2.8e4,
      thickness: 640,
      medium: "air",
      manufacturer: "",
      semiDiameter: 100.086210,
      aspherical: {
        conicConstant: 0,
        polynomialCoefficients: [0, 1.795e-9, 6.6e-15, 2.5e-20, 0, 0, 0, 0, 0, 0],
      },
    },
    {
      label: "Default",
      curvatureRadius: -640,
      thickness: -318.09168,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 115.658528,
    },
  ],
} as const;


// Example #57 at https://www.telescope-optics.net/commercial_telescopes.htm
const orthoAPO: OpticalModel = {
  specs: {
    pupil: { space: "object", type: "epd", value: 130 },
    field: {
      space: "object",
      type: "angle",
      maxField: 0.5,
      fields: [0, 0.707, 1],
      isRelative: true,
    },
    wavelengths: {
      weights: [
        [546.073, 0.98],
        [486.133, 0.18],
        [656.273, 0.075],
        [435.835, 0.035],
      ],
      referenceIndex: 0,
    },
  },

  object: { distance: 1e10 },
  image: { curvatureRadius: -260 },

  surfaces: [
    {
      label: "Stop",
      curvatureRadius: 2372,
      thickness: 12,
      medium: "S-FPL53",
      manufacturer: "Ohara",
      semiDiameter: 65,
    },
    {
      label: "Default",
      curvatureRadius: -257,
      thickness: 22.5,
      medium: "air",
      manufacturer: "",
      semiDiameter: 64.972277,
    },
    {
      label: "Default",
      curvatureRadius: -235,
      thickness: 7,
      medium: "S-BSL7",
      manufacturer: "Ohara",
      semiDiameter: 62.395437,
    },
    {
      label: "Default",
      curvatureRadius: 2528,
      thickness: 1,
      medium: "air",
      manufacturer: "",
      semiDiameter: 62.501830,
    },
    {
      label: "Default",
      curvatureRadius: 435,
      thickness: 11,
      medium: "S-FPL53",
      manufacturer: "Ohara",
      semiDiameter: 62.537719,
    },
    {
      label: "Default",
      curvatureRadius: -908,
      thickness: 934.504573,
      medium: "air",
      manufacturer: "",
      semiDiameter: 62.328801,
    },
  ],
} as const;

// Example #27 at https://www.telescope-optics.net/commercial_telescopes.htm
const fluoriteDoubletAPOWithAspherizedSurface: OpticalModel = {
  specs: { ...orthoAPO.specs },

  object: { ...orthoAPO.object },
  image: { curvatureRadius: -480 },

  surfaces: [
    {
      label: "Stop",
      curvatureRadius: 529.4,
      thickness: 13,
      medium: "N-SK11",
      manufacturer: "Schott",
      semiDiameter: 65,
      aspherical: {
        conicConstant: 0,
        polynomialCoefficients: [0, 2.696e-10, -2.41e-14, -3.237e-18, 0, 0, 0, 0, 0, 0],
      },
    },
    {
      label: "Default",
      curvatureRadius: 192.46,
      thickness: 15.66,
      medium: "air",
      manufacturer: "",
      semiDiameter: 64.495513,
    },
    {
      label: "Default",
      curvatureRadius: 195.69,
      thickness: 21.4,
      medium: "CaF2",
      manufacturer: "Schott",
      semiDiameter: 66.514355,
    },
    {
      label: "Default",
      curvatureRadius: -818.4,
      thickness: 1055.91,
      medium: "air",
      manufacturer: "",
      semiDiameter: 66.232228,
    },
  ],
} as const;

// derived from https://telescope-optics.net/achromats.htm
const fraunhoferAchromat: OpticalModel = {
  specs: {
    pupil: { space: "object", type: "epd", value: 100 },
    field: { space: "object", type: "angle", maxField: 0.5, fields: [0, 0.707, 1], isRelative: true },
    wavelengths: {
      weights: [...orthoAPO.specs.wavelengths.weights],
      referenceIndex: orthoAPO.specs.wavelengths.referenceIndex,
    },
  },

  object: { ...orthoAPO.object },
  image: { curvatureRadius: 0 },
  surfaces: [
    { label: "Stop", curvatureRadius: 0.6 * 120 * 23.6, thickness: 0.011 * 120 * 23.6, medium: "N-BK7", manufacturer: "Schott", semiDiameter: 60 },
    { label: "Default", curvatureRadius: -0.36 * 120 * 23.6, thickness: 0.001, medium: "air", manufacturer: "", semiDiameter: 60 },
    { label: "Default", curvatureRadius: -0.363 * 120 * 23.6, thickness: 0.007 * 120 * 23.6, medium: "N-F2", manufacturer: "Schott", semiDiameter: 60 },
    { label: "Default", curvatureRadius: -1.51 * 120 * 23.6, thickness: 2813.82, medium: "air", manufacturer: "", semiDiameter: 60 },
  ],
} as const;

// derived from https://telescope-optics.net/achromats.htm
const fraunhoferAchromatFast: OpticalModel = {
  specs: { ...fraunhoferAchromat.specs },
  object: { ...fraunhoferAchromat.object },
  image: { curvatureRadius: 0 },
  surfaces: [
    { label: "Stop", curvatureRadius: 0.6 * 120 * 7.5, thickness: 0.011 * 120 * 7.5, medium: "N-BK7", manufacturer: "Schott", semiDiameter: 60 },
    { label: "Default", curvatureRadius: -0.36 * 120 * 7.5, thickness: 0.001, medium: "air", manufacturer: "", semiDiameter: 60 },
    { label: "Default", curvatureRadius: -0.363 * 120 * 7.5, thickness: 0.007 * 120 * 7.5, medium: "N-F2", manufacturer: "Schott", semiDiameter: 60 },
    { label: "Default", curvatureRadius: -1.51 * 120 * 7.5, thickness: 894.22, medium: "air", manufacturer: "", semiDiameter: 60 },
  ],
} as const;


// Example #19 at https://www.telescope-optics.net/commercial_telescopes.htm
const edDoublet: OpticalModel = {
  specs: { ...fraunhoferAchromat.specs },
  object: { ...fraunhoferAchromat.object },
  image: { curvatureRadius: -340 },
  surfaces: [
    { label: "Stop", curvatureRadius: 499, thickness: 16, medium: "S-FPL53", manufacturer: "Ohara", semiDiameter: 60 },
    { label: "Default", curvatureRadius: -200, thickness: 0.7, medium: "air", manufacturer: "", semiDiameter: 60 },
    { label: "Default", curvatureRadius: -203.7, thickness: 8, medium: "N-ZK7", manufacturer: "Schott", semiDiameter: 60 },
    { label: "Default", curvatureRadius: -955, thickness: 3.9 + 883.840824, medium: "air", manufacturer: "", semiDiameter: 60 },
  ],
};



export const ExampleSystems: Record<string, OpticalModel> = {
  "Sasian Triplet": SasianTriplet,
  "Reflector with Optical Window": ReflectorWithOpticalWindow,
  "Schmidt Camera 200mm f/5": schmidtCamera,
  "Ortho-APO 130mm f/7.7": orthoAPO,
  "Fluorite Doublet APO 130mmf/8 w/ Wide Air Gap & Aspherized Surface": fluoriteDoubletAPOWithAspherizedSurface,
  "Fraunhofer Achromat 120mm f/23.6 (CA ratio = 5)": fraunhoferAchromat,
  "Fraunhofer Achromat 120mm f/7.5 (CA ratio = 1.59)": fraunhoferAchromatFast,
  "APO Doublet (S-FPL53/N-ZK7) 120mm f/7.5": edDoublet,
} as const;
