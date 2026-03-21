# Zernike Coefficient Discrepancy: RayOptics vs OSLO

## Investigation Summary

Investigation of discrepancies between this repo's Zernike coefficients and OSLO
for the Sasian Triplet at full field (20 deg), d-line (587.562nm).

## Root Causes Identified

### 1. PRIMARY: Entrance vs Exit Pupil Coordinates (off-axis fields)

**The main cause of the large off-axis discrepancies.**

RayOptics `RayGrid` provides pupil coordinates normalized to the **entrance pupil**.
The `fit_zernike()` function uses these entrance pupil coordinates directly for the
Zernike decomposition. However, standard wavefront analysis (and OSLO) performs the
Zernike fit in **exit pupil coordinates**.

For on-axis fields, entrance and exit pupil coordinates are nearly identical (the
mapping is a simple scaling by the pupil magnification). For off-axis fields,
significant **pupil aberration** creates a non-linear mapping. At full field (20 deg)
in the Sasian Triplet, the Y-coordinate at the pupil edge changes by ~10%:

```
Entrance pupil: (px=+0.50, py=-0.91) → Exit pupil: (px=+0.51, py=-0.81)
Entrance rho=1.039 → Exit rho=0.959
```

This coordinate warping redistributes the wavefront among Zernike terms differently.

**Evidence** — Full-field Zernike coefficients with different pupil coordinates:

| Noll j | Term | EntrPupil | ExitPupil (EIC) | OSLO | Improvement |
|--------|------|-----------|-----------------|------|-------------|
| 7 | Coma Y | +0.243 | +0.312 | +0.327 | 0.084→0.015 |
| 9 | Trefoil | +0.241 | +0.215 | +0.220 | 0.021→0.005 |
| 11 | Pri Spherical | -0.499 | -0.714 | -0.775 | 0.276→0.062 |
| 12 | Sec Astig | +0.396 | +0.765 | +0.820 | 0.424→0.055 |
| 14 | Quadrafoil | +0.107 | -0.024 | -0.026 | 0.134→0.003 |
| 22 | Sec Spherical | -0.060 | -0.081 | -0.090 | 0.031→0.010 |

The exit pupil coordinates were computed using the Hopkins EIC (Equally Inclined
Chord) expansion point at the exit pupil for each ray, relative to the chief ray's
exit pupil point, normalized by the paraxial exit pupil radius.

### 2. SECONDARY: Reference Sphere Differences (all fields)

A consistent ~0.06 wave defocus offset is present even on-axis, where pupil
coordinates are correct. This appears as nearly equal differences in Z1 (piston)
and Z4 (defocus):

**On-axis evidence:**
| Noll j | This repo | OSLO | Difference |
|--------|-----------|------|------------|
| 1 (Piston) | +0.568 | +0.508 | +0.060 |
| 4 (Defocus) | +0.788 | +0.726 | +0.062 |
| 11 (Pri Sph) | +0.171 | +0.169 | +0.002 |
| 22 (Sec Sph) | -0.052 | -0.052 | -0.000 |

The ΔZ1 ≈ ΔZ4 ≈ 0.061 pattern is the signature of a pure ρ² (defocus) offset,
consistent with a slight difference in reference sphere radius. Higher-order terms
(Z11, Z22) match within 1%, confirming the Zernike polynomials, fitting procedure,
and OPD computation are fundamentally correct.

The defocus offset corresponds to ~9 μm of axial shift. Possible causes:
- Different exit pupil position used for reference sphere radius
- Subtle difference in the OPD reference (Hopkins EIC vs OSLO's method)
- Different handling of the image surface position vs paraxial focus

For off-axis fields, a ~0.003 mm Y-shift of the image reference point can explain
the large Z3 (tilt Y) difference (0.586 → ~0.05, matching OSLO's 0.049). This
suggests OSLO may center the reference sphere at a slightly different image point
(e.g., the Gaussian image point vs the real chief ray intersection).

### 3. RESIDUAL: Primary Astigmatism (Z6)

Even with exit pupil coordinates and reference sphere adjustments, Z6 (primary
astigmatism, ρ² cos 2θ) shows a persistent discrepancy:
- This repo (exit pupil): -0.126
- OSLO: -0.048

This may be related to:
- Incomplete pupil coverage in Y due to vignetting (exit pupil Y extends to only
  ~86% of the normalized radius, while X extends to ~103%)
- Different handling of vignetted aperture boundaries between the two tools
- OSLO may use a different pupil plane definition for the cos 2θ term

## Key Technical Details

### RayOptics Reference Sphere (foc=0)
- Center: chief ray intersection with image surface
- Passes through: exit pupil center point (EIC-based)
- Radius: ~51.25 mm (on-axis), ~55.35 mm (full-field)

### Exit Pupil Properties (full-field)
- Paraxial exit pupil distance: -10.012 mm (from last physical surface)
- Real exit pupil distance (chief ray): -11.321 mm (due to pupil aberration)
- Paraxial exit pupil radius: 6.406 mm

### Vignetting (full-field)
- vuy = 0.073, vly = 0.079 (Y-direction clipping)
- Exit pupil physical Y range: [-5.37, +5.50] mm (vs ±6.41 mm unvignetted)

### Verification
- Zernike fitting is numerically stable across grid resolutions (32 to 256 rays)
- Stable across number of terms (22, 36, 56)
- Glass refractive indices match Schott catalog
- OPD computation verified against manual Hopkins EIC formula
- Unit correction (1e6 factor for MM dimensions) verified correct

## Recommended Fix

Modify `fit_zernike()` and `get_zernike_coefficients()` in `zernike.py` to:

1. Compute exit pupil coordinates for each ray using the EIC expansion point
2. Normalize by the paraxial exit pupil radius
3. Fit Zernike polynomials in exit pupil coordinates instead of entrance pupil
   coordinates

This requires access to the ray data at the last physical surface and the chief
ray exit pupil segment, which are available from the `RayGrid` trace but not
currently exposed through the `grid` attribute. The implementation would need to
either:
- Extend `get_zernike_coefficients()` to compute exit pupil coords from the
  raw ray trace data (preferred)
- Or modify `RayGrid` to store exit pupil coordinates alongside the grid

The reference sphere offset (cause #2) is a secondary concern that may require
further investigation into OSLO's exact reference sphere definition.
