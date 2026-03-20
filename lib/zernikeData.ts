export interface ZernikeData {
  readonly coefficients: readonly number[];
  readonly rms_normalized_coefficients: readonly number[];
  readonly rms_wfe: number;
  readonly pv_wfe: number;
  readonly strehl_ratio: number;
  readonly num_terms: number;
  readonly field_index: number;
  readonly wavelength_nm: number;
}

export const NUM_NOLL_TERMS = 56;

/**
 * Convert Noll index j (1-based) to radial order n and azimuthal frequency m.
 * Port of the Python noll_to_nm function.
 */
export function nollToNm(j: number): [number, number] {
  let n = Math.ceil((-3 + Math.sqrt(9 + 8 * (j - 1))) / 2);
  if ((n * (n + 1)) / 2 >= j) {
    n -= 1;
  }
  const mResidual = j - (n * (n + 1)) / 2 - 1;
  const mStart = n % 2 === 0 ? 0 : 1;
  const mAbsList: number[] = [];
  for (let mv = mStart; mv <= n; mv += 2) {
    if (mv === 0) {
      mAbsList.push(0);
    } else {
      mAbsList.push(mv);
      mAbsList.push(mv);
    }
  }
  const mAbs = mAbsList[mResidual];
  if (mAbs === 0) {
    return [n, 0];
  }
  return j % 2 === 0 ? [n, mAbs] : [n, -mAbs];
}

/**
 * Returns MathJax-compatible LaTeX notation for a Zernike polynomial.
 */
export function zernikeNotation(n: number, m: number): string {
  return `\\(Z_{${n}}^{${m}}\\)`;
}

/**
 * Classical names for Noll-ordered Zernike terms j=1..56.
 */
export const NOLL_CLASSICAL_NAMES: Record<number, string> = {
  1: "Piston",
  2: "Tilt X",
  3: "Tilt Y",
  4: "Defocus",
  5: "Oblique Astigmatism",
  6: "Vertical Astigmatism",
  7: "Vertical Coma",
  8: "Horizontal Coma",
  9: "Vertical Trefoil",
  10: "Oblique Trefoil",
  11: "Primary Spherical",
  12: "Vertical Secondary Astigmatism",
  13: "Oblique Secondary Astigmatism",
  14: "Vertical Quadrafoil",
  15: "Oblique Quadrafoil",
  16: "Secondary Coma X",
  17: "Secondary Coma Y",
  18: "Secondary Trefoil X",
  19: "Secondary Trefoil Y",
  20: "Pentafoil X",
  21: "Pentafoil Y",
  22: "Secondary Spherical",
  23: "Tertiary Astigmatism Y",
  24: "Tertiary Astigmatism X",
  25: "Secondary Quadrafoil Y",
  26: "Secondary Quadrafoil X",
  27: "Hexafoil Y",
  28: "Hexafoil X",
  29: "Tertiary Coma Y",
  30: "Tertiary Coma X",
  31: "Tertiary Trefoil Y",
  32: "Tertiary Trefoil X",
  33: "Secondary Pentafoil Y",
  34: "Secondary Pentafoil X",
  35: "Heptafoil Y",
  36: "Heptafoil X",
  37: "Tertiary Spherical",
  38: "Quaternary Astigmatism X",
  39: "Quaternary Astigmatism Y",
  40: "Tertiary Quadrafoil X",
  41: "Tertiary Quadrafoil Y",
  42: "Secondary Hexafoil X",
  43: "Secondary Hexafoil Y",
  44: "Octafoil X",
  45: "Octafoil Y",
  46: "Quaternary Coma X",
  47: "Quaternary Coma Y",
  48: "Quaternary Trefoil X",
  49: "Quaternary Trefoil Y",
  50: "Tertiary Pentafoil X",
  51: "Tertiary Pentafoil Y",
  52: "Secondary Heptafoil X",
  53: "Secondary Heptafoil Y",
  54: "Nonafoil X",
  55: "Nonafoil Y",
  56: "Quaternary Spherical",
};
