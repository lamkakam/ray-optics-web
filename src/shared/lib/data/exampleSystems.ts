import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const commonWavelengthConfig: OpticalModel["specs"]["wavelengths"] = {
  weights: [
    [435.835, 0.035],
    [486.133, 0.18],
    [546.073, 0.98],
    [656.273, 0.075],
    [706.519, 0.0028],
  ],
  referenceIndex: 2,
};

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
  setAutoAperture: "autoAperture",
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
  setAutoAperture: "autoAperture",
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
        kind: "Conic",
        conicConstant: -1,
      },
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 200.000100215,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 28.489411,
      decenter: {
        coordinateSystemStrategy: "bend",
        alpha: 45,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      },
    },
  ],
} as const;

// from https://www.telescope-optics.net/early%20telescopes.htm
const herschelReflector: OpticalModel = {
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 1200 },
    field: {
      space: "object",
      type: "angle",
      maxField: 2,
      fields: [0, 0.5, 1],
      isRelative: true,
    },
    wavelengths: commonWavelengthConfig,
  },

  object: { distance: 1e10 },
  image: { curvatureRadius: -1.2e4 },
  surfaces: [
    {
      label: "Stop",
      curvatureRadius: -2.4e4,
      thickness: -1.2e4,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 600,
      decenter: {
        coordinateSystemStrategy: "bend",
        alpha: 2,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      },
    },
  ],
} as const;

// from https://www.telescope-optics.net/early%20telescopes.htm
const mikeJonesImprovedHerschelReflector: OpticalModel = {
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 1220 },
    field: {
      space: "object",
      type: "angle",
      maxField: 0.05,
      fields: [0, 0.707, 1],
      isRelative: true,
    },
    wavelengths: commonWavelengthConfig,
  },

  object: {
    distance: 1e10
  },
  image: {
    curvatureRadius: 0,
    decenter: {
      coordinateSystemStrategy: "decenter",
      alpha: 2.995768,
      beta: 0,
      gamma: 0,
      offsetX: 0,
      offsetY: 0.02777,
    }
  },
  surfaces: [
    {
      label: "Stop",
      curvatureRadius: -24384,
      thickness: -11600,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 609.6,
      aspherical: {
        kind: "Conic",
        conicConstant: -1,
      },
      decenter: {
        coordinateSystemStrategy: "bend",
        alpha: 1.7,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      }
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 39.722912,
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: -9,
      medium: "N-BK7",
      manufacturer: "Schott",
      semiDiameter: 53,
      decenter: {
        coordinateSystemStrategy: "decenter",
        alpha: -16.95086,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: -2.663858,
      }
    },
    {
      label: "Default",
      curvatureRadius: -556.536,
      thickness: 0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 53,
      decenter: {
        coordinateSystemStrategy: "reverse",
        alpha: -16.95086,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: -2.663858,
      }
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: -39.994547,
      medium: "air",
      manufacturer: "",
      semiDiameter: 39.543155,
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 39.048232,
    },
    {
      label: "Default",
      curvatureRadius: -514.2,
      thickness: -11,
      medium: "N-BK7",
      manufacturer: "Schott",
      semiDiameter: 39.048232,
      decenter: {
        coordinateSystemStrategy: "decenter",
        alpha: 13.801745,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      }
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 53,
      decenter: {
        coordinateSystemStrategy: "reverse",
        alpha: 13.801745,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      }
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: -557.1,
      medium: "air",
      manufacturer: "",
      semiDiameter: 39.242722,
    }
  ]
} as const;

// from https://www.telescope-optics.net/miscellaneous_optics.htm
const tiltedHoughton: OpticalModel = {
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 150 },
    field: {
      space: "object",
      type: "angle",
      maxField: -0.5,
      fields: [0, 0.707, 1],
      isRelative: true,
    },
    wavelengths: commonWavelengthConfig,
  },

  object: {
    distance: 1e10,
  },

  image: {
    curvatureRadius: 2600,
    decenter: {
      coordinateSystemStrategy: "bend",
      alpha: 5.66,
      beta: 0,
      gamma: 0,
      offsetX: 0,
      offsetY: 0,
    }
  },

  surfaces: [
    {
      label: "Stop",
      curvatureRadius: 2022,
      thickness: 11.2,
      medium: "N-BK7",
      manufacturer: "Schott",
      semiDiameter: 75,
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 10.5,
      medium: "air",
      manufacturer: "",
      semiDiameter: 74.922466,
    },
    {
      label: "Default",
      curvatureRadius: -2022,
      thickness: 9.9,
      medium: "N-BK7",
      manufacturer: "Schott",
      semiDiameter: 74.812074,
      decenter: {
        coordinateSystemStrategy: "dec and return",
        alpha: 5.4,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      }
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 1140,
      medium: "air",
      manufacturer: "",
      semiDiameter: 74.868647,
      decenter: {
        coordinateSystemStrategy: "dec and return",
        alpha: 5.4,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 1.5,
      }
    },
    {
      label: "Default",
      curvatureRadius: -2404.5,
      thickness: -1050,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 84.762317,
      decenter: {
        coordinateSystemStrategy: "bend",
        alpha: 3,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      }
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 153.195342,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 19.846683,
      decenter: {
        coordinateSystemStrategy: "bend",
        alpha: -48,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      },
    },
  ],
} as const;


// from https://www.telescope-optics.net/ATM_telescopes.htm
const quadSchiefspiegler: OpticalModel = {
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 318 },
    field: {
      space: "object",
      type: "angle",
      maxField: 0.125,
      fields: [0, 0.5, 1],
      isRelative: true,
    },
    wavelengths: commonWavelengthConfig,
  },
  object: {
    distance: 1e10
  },
  image: {
    curvatureRadius: 0,
    decenter: {
      coordinateSystemStrategy: "dec and return",
      alpha: -9.15,
      beta: 0,
      gamma: 0,
      offsetX: 0,
      offsetY: 0,
    }
  },
  surfaces: [
    {
      label: "Stop",
      curvatureRadius: -7620,
      thickness: -2172,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 159,
      aspherical: {
        kind: "Conic",
        conicConstant: -0.55,
      },
      decenter: {
        coordinateSystemStrategy: "bend",
        alpha: -3.15,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      }
    },
    {
      label: "Default",
      curvatureRadius: -7620,
      thickness: 1700,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 73.096057,
      decenter: {
        coordinateSystemStrategy: "bend",
        alpha: 9.6,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      }
    },
    {
      label: "Default",
      curvatureRadius: -53238,
      thickness: -1122.4,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 38.475044,
      decenter: {
        coordinateSystemStrategy: "bend",
        alpha: 38.55,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      }
    }
  ]
} as const;

// from https://www.telescope-optics.net/ATM_telescopes.htm
const clydeBoneJrMersenne: OpticalModel = {
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 762 },
    field: {
      space: "object",
      type: "angle",
      maxField: 0.09,
      fields: [0, 0.707, 1],
      isRelative: true,
    },
    wavelengths: commonWavelengthConfig,
  },

  object: {
    distance: 1e10,
  },
  image: {
    curvatureRadius: 0,
  },
  surfaces: [
    {
      label: "Stop",
      curvatureRadius: -7620,
      thickness: -3124.2,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 381,
      aspherical: {
        kind: "Conic",
        conicConstant: -1
      }
    },
    {
      label: "Default",
      curvatureRadius: -1371.6,
      thickness: 2437,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 68.583124,
      aspherical: {
        kind: "Conic",
        conicConstant: -1,
      }
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: -690,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 68.596663,
      decenter: {
        coordinateSystemStrategy: "bend",
        alpha: 45,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      }
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 99,
      medium: "REFL",
      manufacturer: "",
      semiDiameter: 68.600496,
      decenter: {
        coordinateSystemStrategy: "bend",
        alpha: -45,
        beta: 0,
        gamma: 0,
        offsetX: 0,
        offsetY: 0,
      }
    },
    {
      label: "Default",
      curvatureRadius: 426,
      thickness: 7.5,
      medium: "K7",
      manufacturer: "Schott",
      semiDiameter: 70,
    },
    {
      label: "Default",
      curvatureRadius: 194.3,
      thickness: 5,
      medium: "air",
      manufacturer: "",
      semiDiameter: 70,
    },
    {
      label: "Default",
      curvatureRadius: 194.3,
      thickness: 15,
      medium: "CaF2",
      manufacturer: "",
      semiDiameter: 70,
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 504.3,
      medium: "air",
      manufacturer: "",
      semiDiameter: 70,
    },
    {
      label: "Default",
      curvatureRadius: 505,
      thickness: 8.3,
      medium: "CaF2",
      manufacturer: "",
      semiDiameter: 40,
    },
    {
      label: "Default",
      curvatureRadius: -232,
      thickness: 0.5,
      medium: "air",
      manufacturer: "",
      semiDiameter: 40,
    },
    {
      label: "Default",
      curvatureRadius: -237.5,
      thickness: 6,
      medium: "K7",
      manufacturer: "Schott",
      semiDiameter: 40,
    },
    {
      label: "Default",
      curvatureRadius: -1200,
      thickness: 403.92367,
      medium: "air",
      manufacturer: "",
      semiDiameter: 40,
    }
  ],
} as const;


// Design from https://telescope-optics.net/schmidt_camera_aberrations.htm
const schmidtCamera: OpticalModel = {
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 200 },
    field: {
      space: "object",
      type: "angle",
      maxField: 1.5,
      fields: [0, 0.707, 1],
      isRelative: true,
    },
    wavelengths: commonWavelengthConfig,
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
        kind: "EvenAspherical",
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
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 130 },
    field: {
      space: "object",
      type: "angle",
      maxField: 0.5,
      fields: [0, 0.707, 1],
      isRelative: true,
    },
    wavelengths: commonWavelengthConfig,
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
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 130 },
    field: {
      space: "object",
      type: "angle",
      maxField: 0.5,
      fields: [0, 0.707, 1],
      isRelative: true,
    },
    wavelengths: commonWavelengthConfig,
  },

  object: { distance: 1e10 },
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
        kind: "EvenAspherical",
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
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 120 },
    field: { space: "object", type: "angle", maxField: 0.5, fields: [0, 0.707, 1], isRelative: true },
    wavelengths: commonWavelengthConfig,
  },

  object: { distance: 1e10 },
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
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 120 },
    field: { space: "object", type: "angle", maxField: 0.5, fields: [0, 0.707, 1], isRelative: true },
    wavelengths: commonWavelengthConfig,
  },
  object: { distance: 1e10 },
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
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 120 },
    field: { space: "object", type: "angle", maxField: 0.5, fields: [0, 0.707, 1], isRelative: true },
    wavelengths: commonWavelengthConfig,
  },
  object: { distance: 1e10 },
  image: { curvatureRadius: -340 },
  surfaces: [
    { label: "Stop", curvatureRadius: 499, thickness: 16, medium: "S-FPL53", manufacturer: "Ohara", semiDiameter: 60 },
    { label: "Default", curvatureRadius: -200, thickness: 0.7, medium: "air", manufacturer: "", semiDiameter: 60 },
    { label: "Default", curvatureRadius: -203.7, thickness: 8, medium: "N-ZK7", manufacturer: "Schott", semiDiameter: 60 },
    { label: "Default", curvatureRadius: -955, thickness: 3.9 + 883.840824, medium: "air", manufacturer: "", semiDiameter: 60 },
  ],
};

// 11.24 at https://telescope-optics.net/miscellaneous_optics.htm
const petzvalAPO: OpticalModel = {
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 140 },
    field: { space: "object", type: "angle", maxField: 0.5, fields: [0, 0.707, 1], isRelative: true },
    wavelengths: commonWavelengthConfig,
  },
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [
    { label: "Stop", curvatureRadius: 481, thickness: 9, medium: "N-BK7", manufacturer: "Schott", semiDiameter: 70 },
    { label: "Default", curvatureRadius: 230.3, thickness: 6.2, medium: "air", manufacturer: "", semiDiameter: 69.656085 },
    { label: "Default", curvatureRadius: 230.3, thickness: 13, medium: "S-FPL53", manufacturer: "Ohara", semiDiameter: 70.268998 },
    { label: "Default", curvatureRadius: 2169, thickness: 660, medium: "air", manufacturer: "", semiDiameter: 69.949825 },
    { label: "Default", curvatureRadius: 980, thickness: 11, medium: "S-FPL53", manufacturer: "Ohara", semiDiameter: 55.980378 },
    { label: "Default", curvatureRadius: -230.3, thickness: 3.2, medium: "air", manufacturer: "", semiDiameter: 55.626726 },
    { label: "Default", curvatureRadius: -230.3, thickness: 7, medium: "N-BK7", manufacturer: "Schott", semiDiameter: 55.138617 },
    { label: "Default", curvatureRadius: -828, thickness: 603.304561, medium: "air", manufacturer: "", semiDiameter: 55.007989 },
  ],
} as const;

// derived from 11.24 at https://telescope-optics.net/miscellaneous_optics.htm
const petzvalAPORearLensesRemoved: OpticalModel = {
  setAutoAperture: "autoAperture",
  specs: petzvalAPO.specs,
  object: petzvalAPO.object,
  image: petzvalAPO.image,
  surfaces: [
    ...petzvalAPO.surfaces.slice(0, 3),
    { label: "Default", curvatureRadius: 2169, thickness: 1807.12, medium: "air", manufacturer: "", semiDiameter: 69.949825 },
  ],
} as const;


const tripletAPOWithSingletMeniscusLens: OpticalModel = {
  setAutoAperture: "autoAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 86 },
    field: { space: "image", type: "height", maxField: 21.6, fields: [0, 0.3, 0.5, 0.707, 0.85, 1], isRelative: true },
    wavelengths: commonWavelengthConfig,
  },

  object: { distance: 1e10 },

  image: { curvatureRadius: 0 },

  surfaces: [
    {
      label: "Stop",
      curvatureRadius: 265.876554,
      thickness: 12,
      medium: "S-FPL51",
      manufacturer: "Ohara",
      semiDiameter: 43,
    },
    {
      label: "Default",
      curvatureRadius: -221.064133,
      thickness: 1,
      medium: "air",
      manufacturer: "",
      semiDiameter: 43,
    },
    {
      label: "Default",
      curvatureRadius: -219.387282,
      thickness: 6,
      medium: "H-ZK3",
      manufacturer: "CDGM",
      semiDiameter: 43,
    },
    {
      label: "Default",
      curvatureRadius: 219.387282,
      thickness: 1,
      medium: "air",
      manufacturer: "",
      semiDiameter: 43,
    },
    {
      label: "Default",
      curvatureRadius: 219.387282,
      thickness: 12,
      medium: "S-FPL51",
      manufacturer: "Ohara",
      semiDiameter: 43,
    },
    {
      label: "Default",
      curvatureRadius: -715.129836,
      thickness: 352.349497,
      medium: "air",
      manufacturer: "",
      semiDiameter: 43,
    },
    {
      label: "Default",
      curvatureRadius: 62.396199,
      thickness: 10,
      medium: "S-BSL 7",
      manufacturer: "Ohara",
      semiDiameter: 43,
    },
    {
      label: "Default",
      curvatureRadius: 56.024154,
      thickness: 200.192,
      medium: "air",
      manufacturer: "",
      semiDiameter: 38,
    },
  ],
} as const;


// modified eyepiece design by Imaizumi M. US#5,557,464 (1996)
// this modified config is from https://telescope-optics.net/eyepiece_raytrace.htm
const modifiedImaizumiEyepieceReversed: OpticalModel = {
  setAutoAperture: "autoAperture",
  specs: {
    // this is the exit pupil of the eyepiece
    // because it's reversed tracing, the space is "object" not "image".
    // exit pupil diameter of eyepiece === eyepiece focal length / objective f-number
    // this eyepiece efl is around 10mm, so by setting epd to be 1, the objective f-number is around 10
    pupil: { space: "object", type: "epd", value: 1 },

    // this is the half-AFoV of the eyepiece
    // because it's reversed tracing, the space is "object" not "image".
    field: { space: "object", type: "angle", maxField: 40, fields: [0, 0.5, 1], isRelative: true },
    wavelengths: {
      weights: [
        [486.133, 0.18],
        [546.073, 0.98],
        [656.273, 0.075],
      ],
      referenceIndex: 1,
    },
  },

  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },

  surfaces: [
    { label: "Stop", curvatureRadius: 0, thickness: 7.76, medium: "Air", manufacturer: "", semiDiameter: 0.5 }, // semi-diameter is half of the epd
    { label: "Default", curvatureRadius: -24.8, thickness: 1.5, medium: "N-SF14", manufacturer: "Schott", semiDiameter: 6.7304 },
    { label: "Default", curvatureRadius: 70.4, thickness: 7.6, medium: "N-SK14", manufacturer: "Schott", semiDiameter: 8.3700 },
    { label: "Default", curvatureRadius: -14.95, thickness: 0.23, medium: "air", manufacturer: "", semiDiameter: 10.328 },
    { label: "Default", curvatureRadius: 48.6, thickness: 5.3, medium: "N-LAF34", manufacturer: "Schott", semiDiameter: 13.563 },
    { label: "Default", curvatureRadius: -30.1, thickness: 0.23, medium: "air", manufacturer: "", semiDiameter: 13.578 },
    { label: "Default", curvatureRadius: 17.5, thickness: 10.8, medium: "N-SK14", manufacturer: "Schott", semiDiameter: 11.986 },
    { label: "Default", curvatureRadius: -20.98, thickness: 1.6, medium: "N-SF14", manufacturer: "Schott", semiDiameter: 10.582 },
    { label: "Default", curvatureRadius: 21.5, thickness: 21.68, medium: "air", manufacturer: "", semiDiameter: 8.6427 },
    { label: "Default", curvatureRadius: -11.09, thickness: 1.22, medium: "N-BK7", manufacturer: "Schott", semiDiameter: 7.0088 },
    { label: "Default", curvatureRadius: -68.3, thickness: 2.3, medium: "N-SF6", manufacturer: "Schott", semiDiameter: 7.7057 },
    { label: "Default", curvatureRadius: -24.6, thickness: -18.14, medium: "air", manufacturer: "", semiDiameter: 7.9817 },
  ],
} as const;


const fishEyeLens: OpticalModel = {
  setAutoAperture: "autoAperture",
  specs: {
    pupil: {
      space: "object",
      type: "epd",
      value: 0.25
    },
    field: {
      space: "object",
      type: "angle",
      maxField: 90,
      fields: [0, 0.707, 1],
      "isRelative": true,
      "isWideAngle": true,
    },
    wavelengths: {
      weights: [
        [486.133, 1],
        [546.073, 2],
        [656.273, 1],
      ],
      "referenceIndex": 1
    },
  },
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 4.7745,
      thickness: 0.1299,
      medium: "1.713",
      manufacturer: "53.9",
      semiDiameter: 2,
    },
    {
      label: "Default",
      curvatureRadius: 0.8821,
      thickness: 0.5688,
      medium: "air",
      manufacturer: "",
      semiDiameter: 0.88,
    },
    {
      label: "Default",
      curvatureRadius: 1.6822,
      thickness: 0.0938,
      medium: "1.618",
      manufacturer: "63.3",
      semiDiameter: 0.95,
    },
    {
      label: "Default",
      curvatureRadius: 0.8064,
      thickness: 0.3313,
      medium: "air",
      manufacturer: "",
      semiDiameter: 0.725,
    },
    {
      label: "Default",
      curvatureRadius: 1.6265,
      thickness: 0.4838,
      medium: "1.595",
      manufacturer: "39.2",
      semiDiameter: 0.6,
    },
    {
      label: "Default",
      curvatureRadius: -0.7284,
      thickness: 0.0938,
      medium: "1.623",
      manufacturer: "56.9",
      semiDiameter: 0.6,
    },
    {
      label: "Default",
      curvatureRadius: 8.3331,
      thickness: 0.05,
      medium: "air",
      manufacturer: "",
      semiDiameter: 0.6,
    },
    {
      label: "Default",
      curvatureRadius: 7.6334,
      thickness: 0.1875,
      medium: "1.805",
      manufacturer: "40.9",
      semiDiameter: 0.6,
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 0.0806,
      medium: "air",
      manufacturer: "",
      semiDiameter: 0.6,
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 0.0938,
      medium: "1.581",
      manufacturer: "41",
      semiDiameter: 0.6,
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 0.1413,
      medium: "air",
      manufacturer: "",
      semiDiameter: 0.6,
    },
    {
      label: "Stop",
      curvatureRadius: 0,
      thickness: 0.1,
      medium: "air",
      manufacturer: "",
      semiDiameter: 0.284,
    },
    {
      label: "Default",
      curvatureRadius: -2.8724,
      thickness: 0.05,
      medium: "1.713",
      manufacturer: "53.2",
      semiDiameter: 0.6,
    },
    {
      label: "Default",
      curvatureRadius: 2.8034,
      thickness: 0.25,
      medium: "1.64",
      manufacturer: "60",
      semiDiameter: 0.6,
    },
    {
      label: "Default",
      curvatureRadius: -1.1513,
      thickness: 0.0063,
      medium: "air",
      manufacturer: "",
      semiDiameter: 0.6,
    },
    {
      label: "Default",
      curvatureRadius: 3.2583,
      thickness: 0.2919,
      medium: "1.488",
      manufacturer: "70.1",
      semiDiameter: 0.6,
    },
    {
      label: "Default",
      curvatureRadius: -0.8827,
      thickness: 0.0913,
      medium: "1.805",
      manufacturer: "25.4",
      semiDiameter: 0.6,
    },
    {
      label: "Default",
      curvatureRadius: -1.7116,
      thickness: 2.8885085903779517,
      medium: "air",
      manufacturer: "",
      semiDiameter: 0.6,
    },
  ]
};

const cellphoneLensExample: OpticalModel = {
  setAutoAperture: "autoAperture",
  specs: {
    pupil: {
      space: "image",
      type: "f/#",
      value: 3.5,
    },
    field: {
      space: "image",
      type: "height",
      maxField: 3.5,
      fields: [0, 0.7071, 1],
      isRelative: true,
      isWideAngle: false,
    },
    wavelengths: {
      weights: [
        [486.133, 1],
        [587.562, 2],
        [656.273, 1],
      ],
      referenceIndex: 1,
    }
  },
  object: { distance: 10000000000 },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Stop",
      curvatureRadius: 0,
      thickness: 0,
      medium: "air",
      manufacturer: "",
      semiDiameter: 0.79358,
    },
    {
      label: "Default",
      curvatureRadius: 1.962,
      thickness: 1.19,
      medium: "1.471",
      manufacturer: "76.6",
      semiDiameter: 0.93439,
      aspherical: {
        kind: "RadialPolynomial",
        conicConstant: 1.153,
        polynomialCoefficients: [0, 0, -1.895e-2, 2.426e-2, -5.123e-2, 8.371e-4, 7.850e-3, 4.091e-3, -7.732e-3, -4.265e-3],
      },
    },
    {
      label: "Default",
      curvatureRadius: 33.398,
      thickness: 0.93,
      medium: "air",
      manufacturer: "",
      semiDiameter: 1.0782,
      aspherical: {
        kind: "RadialPolynomial",
        conicConstant: 39.18,
        polynomialCoefficients: [0, 0, -4.966e-3, -1.434e-2, -6.139e-3, -9.284e-5, 6.438e-3, -5.72e-3, -2.385e-2, 1.108e-2],
      },
    },
    {
      label: "Default",
      curvatureRadius: -2.182,
      thickness: 0.75,
      medium: "1.603",
      manufacturer: "27.5",
      semiDiameter: 1.1289,
      aspherical: {
        kind: "RadialPolynomial",
        conicConstant: 1.105,
        polynomialCoefficients: [0, 0, -4.388e-2, -2.555e-2, 5.16e-2, -4.307e-2, -2.831e-2, 3.162e-2, 4.630e-2, -4.877e-2],
      },
    },
    {
      label: "Default",
      curvatureRadius: -6.367,
      thickness: 0.1,
      medium: "air",
      manufacturer: "",
      semiDiameter: 1.5270,
      aspherical: {
        kind: "RadialPolynomial",
        conicConstant: 2.382,
        polynomialCoefficients: [0, 0, -1.131e-1, -7.863e-2, 1.094e-1, 6.228e-3, -2.216e-2, -5.89e-3, 4.123e-3, 1.041e-3],
      },
    },
    {
      label: "Default",
      curvatureRadius: 5.694,
      thickness: 0.89,
      medium: "1.510",
      manufacturer: "56.2",
      semiDiameter: 1.8048,
      aspherical: {
        kind: "RadialPolynomial",
        conicConstant: -222.1,
        polynomialCoefficients: [0, 0, -7.876e-2, 7.02e-2, 1.575e-3, -9.958e-3, -7.322e-3, 6.914e-4, 2.54e-3, -7.65e-4],
      },
    },
    {
      label: "Default",
      curvatureRadius: 9.162,
      thickness: 0.16,
      medium: "air",
      manufacturer: "",
      semiDiameter: 2.3576,
      aspherical: {
        kind: "RadialPolynomial",
        conicConstant: 0.9331 - 1,
        polynomialCoefficients: [0, 0, 9.694e-3, -2.516e-3, -3.606e-3, -2.497e-4, -6.84e-4, -1.414e-4, 2.932e-4, -7.284e-5],
      },
    },
    {
      label: "Default",
      curvatureRadius: 1.674,
      thickness: 0.85,
      medium: "1.510",
      manufacturer: "56.2",
      semiDiameter: 2.4382,
      aspherical: {
        kind: "RadialPolynomial",
        conicConstant: -8.617,
        polynomialCoefficients: [0, 0, 7.429e-2, -6.933e-2, -5.811e-3, 2.396e-3, 2.100e-3, -3.119e-4, -5.552e-5, 7.969e-6],
      },
    },
    {
      label: "Default",
      curvatureRadius: 1.509,
      thickness: 0.7,
      medium: "air",
      manufacturer: "",
      semiDiameter: 2.8879,
      aspherical: {
        kind: "RadialPolynomial",
        conicConstant: -3.707,
        polynomialCoefficients: [0, 0, 1.767e-3, -4.652e-2, 1.625e-2, -3.522e-3, -7.106e-4, 3.825e-4, 6.271e-5, -2.631e-5],
      },
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 0.4,
      medium: "1.516",
      manufacturer: "64.1",
      semiDiameter: 3.2480,
    },
    {
      label: "Default",
      curvatureRadius: 0,
      thickness: 0.64,
      medium: "air",
      manufacturer: "",
      semiDiameter: 3.3477,
    }
  ]
};


const list: Record<string, OpticalModel> = {
  "Sasian Triplet": SasianTriplet,
  "Newtonian Reflector with Optical Window": ReflectorWithOpticalWindow,
  "Herschel's 40-foot Reflector": herschelReflector,
  "Mike I. Jones's Improved Herschel Reflector": mikeJonesImprovedHerschelReflector,
  "Tilted Houghton-Herschel 150mm f/8": tiltedHoughton,
  "Terry Platt's 318mm f/21 Buchroeder \"Quad-Schiefspiegler\"": quadSchiefspiegler,
  "Clyde Bone Jr. 30-inch f/5 Mersenne": clydeBoneJrMersenne,
  "Schmidt Camera 200mm f/5": schmidtCamera,
  "Ortho-APO 130mm f/7.7": orthoAPO,
  "Fluorite Doublet APO 130mm f/8 w/ Wide Air Gap & Aspherized Surface": fluoriteDoubletAPOWithAspherizedSurface,
  "Fraunhofer Achromat 120mm f/23.6 (CA ratio = 5)": fraunhoferAchromat,
  "Fraunhofer Achromat 120mm f/7.5 (CA ratio = 1.59)": fraunhoferAchromatFast,
  "APO Doublet (S-FPL53/N-ZK7) 120mm f/7.5": edDoublet,
  "APO Petzval 140mm f/7": petzvalAPO,
  "APO Petzval 140mm f/7 (but with rear lenses removed)": petzvalAPORearLensesRemoved,
  "Flatfield Quadruplet APO 86mm f/7 (Triplet with Singlet Meniscus Lens)": tripletAPOWithSingletMeniscusLens,
  "Reversed Tracing of Modified Imaizumi M. 80deg AFoV Eyepiece US#5,557,464 (1996)": modifiedImaizumiEyepieceReversed,
  "Fisheye Lens Example": fishEyeLens,
  "Cell Phone Camera Lens Example US#7,535,658": cellphoneLensExample,
} as const;

export const ExampleSystems: { [x: string]: OpticalModel } = Object.keys(list).reduce((acc, name, idx) => ({
  ...acc,
  [`${idx + 1}: ${name}`]: list[name],
}), {} as { [x: string]: OpticalModel });
