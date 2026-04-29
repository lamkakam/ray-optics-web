const DESCRIPTIONS_BY_NAME: Record<string, string> = {
  "Sasian Triplet": "From the RayOptics example gallery, citing Prof. Jose Sasian's OPTI 517 course at the University of Arizona.",
  "Newtonian Reflector with Optical Window": "Derived from telescope-optics.net reflecting telescope material.",
  "Herschel's 40-foot Reflector": "Derived from telescope-optics.net early telescope material.",
  "Mike I. Jones's Improved Herschel Reflector": "Derived from telescope-optics.net early telescope material.",
  "Tilted Houghton-Herschel 150mm f/8": "Derived from telescope-optics.net miscellaneous optics material.",
  "Terry Platt's 318mm f/21 Buchroeder \"Quad-Schiefspiegler\"": "Derived from telescope-optics.net ATM telescope material.",
  "Clyde Bone Jr. 30-inch f/5 Mersenne": "Derived from telescope-optics.net ATM telescope material.",
  "Schmidt Camera 200mm f/5": "Derived from telescope-optics.net Schmidt camera aberration material.",
  "Ortho-APO 130mm f/7.7": "Commercial telescope example #57 from telescope-optics.net.",
  "Fluorite Doublet APO 130mm f/8 w/ Wide Air Gap & Aspherized Surface": "Commercial telescope example #27 from telescope-optics.net.",
  "Fraunhofer Achromat 120mm f/23.6 (CA ratio = 5)": "Derived from telescope-optics.net achromat material.",
  "Fraunhofer Achromat 120mm f/7.5 (CA ratio = 1.59)": "Derived from telescope-optics.net achromat material.",
  "APO Doublet (S-FPL53/N-ZK7) 120mm f/7.5": "Commercial telescope example #19 from telescope-optics.net.",
  "APO Petzval 140mm f/7": "Design 11.24 from telescope-optics.net miscellaneous optics material.",
  "APO Petzval 140mm f/7 (but with rear lenses removed)": "Design 11.24 variant from telescope-optics.net miscellaneous optics material.",
  "Reversed Tracing of Modified Imaizumi M. 80deg AFoV Eyepiece US#5,557,464 (1996)": "Modified eyepiece configuration from telescope-optics.net eyepiece raytrace material.",
  "Fisheye Lens Example": "From a RayOptics GitHub discussion.",
  "Cell Phone Camera Lens Example US#7,535,658": "From the RayOptics example gallery, citing U.S. Patent 7,535,658.",
  "Diffraction Grating (Transmissive) Example": "From a RayOptics GitHub discussion.",
  "Diffraction Grating (Reflective) Example": "From a RayOptics GitHub discussion.",
};

export function stripExamplePrefix(name: string): string {
  return name.replace(/^\d+:\s*/, "");
}

export function getExampleSystemDescription(exampleKey: string): string {
  const name = stripExamplePrefix(exampleKey);
  return DESCRIPTIONS_BY_NAME[name] ?? "Bundled example optical system.";
}
