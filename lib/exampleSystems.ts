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


export const ExampleSystems: Record<string, OpticalModel> = {
  "Sasian Triplet": SasianTriplet,
  "Reflector with Optical Window": ReflectorWithOpticalWindow,
} as const;
