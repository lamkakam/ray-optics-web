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

### 2. SECONDARY: Reference Sphere Image Point — Z3 Tilt (off-axis)

At full field, Z3 (tilt Y) shows a 14× discrepancy: 0.698 (this repo) vs
0.049 (OSLO). This is caused by the **reference sphere image point** used in
the Hopkins EIC OPD computation.

**Detailed investigation:**
- The tilt is in the OPD data itself, not a coordinate or sampling artifact.
  RayGrid OPD matches direct `wave_abr_full_calc` exactly.
- Jacobian weighting of the non-uniform exit pupil grid has negligible effect
  (Jacobian varies only 0.900–0.930 across the pupil).
- Z3 varies linearly with `image_delta` Y at ~197 waves/mm.
- An `image_delta` of ~-0.0033 mm in Y matches OSLO's Z3 = 0.049.

**Image point comparison (full-field):**
| Reference point | Image Y (mm) | Z3 (waves) |
|-----------------|-------------|------------|
| Real chief ray intercept (default) | 18.200449 | +0.698 |
| Paraxial image height (efl×tan θ) | 18.198872 | +0.388 |
| OSLO-matching point | ~18.197 | +0.049 |
| Zero-tilt point | 18.196905 | 0.000 |
| Ray bundle centroid | 18.195937 | -0.191 |

None of the standard reference points (paraxial, centroid) exactly match OSLO.
The OSLO-matching image point is ~3.3 μm below the chief ray intercept. This is
likely related to OSLO's "Central refer ray" convention, which may use a reference
ray definition that produces a slightly different image point than rayoptics' chief
ray (which passes through the entrance pupil center).

**OPD decomposition at py = ±0.8 (full field):**
| Term | Δ (waves) |
|------|-----------|
| -n·e1 (entrance EIC) | -2464 |
| -ray_op (path diff) | +492 |
| n·ekp (exit EIC) | +1972 |
| -n·ep (ref sphere) | +0.73 |
| **Total ΔOPD** | **+0.567** |

The tilt arises from imperfect cancellation of three enormous terms (e1, ray_op,
ekp), each ~1000–2500 waves. The reference sphere correction (ep) contributes
~0.73 waves of the 0.57 wave asymmetry. Shifting the image point by 3.3 μm
changes the ep term enough to reduce the residual tilt to match OSLO.

**Decision**: Accept as a known convention difference. The Z3 discrepancy does not
affect higher-order aberration terms (Z7, Z11, Z12, Z22), which are the primary
quantities of interest for optical design. Users can adjust the reference point via
the `image_delta` parameter of `RayGrid` if needed.

### 3. TERTIARY: Reference Sphere Defocus Offset (all fields)

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

### 4. RESIDUAL: Primary Astigmatism (Z6)

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

## Fix Applied

Exit pupil coordinate fitting has been implemented in `_compute_exit_pupil_grid()`.
This resolves the primary discrepancy (cause #1) for higher-order terms (Z7, Z11,
Z12, Z22). See `zernike.py.md` for implementation details.

The Z3 tilt offset (cause #2) and defocus offset (cause #3) are accepted as known
convention differences related to the reference sphere definition. They do not
affect higher-order aberration terms.

## Hopkins EIC Method

The OPD computation in rayoptics uses the **Hopkins Equally Inclined Chord (EIC)**
method, based on H.H. Hopkins' paper on wavefront aberration. The OPD formula is:

```
OPD = -n_obj·e1 - ray_op + n_img·ekp + cr_op - n_img·ep
```

Where:
- `e1`: EIC distance between the ray and chief ray at the first surface (entrance)
- `ray_op`: total optical path of the ray through the system
- `ekp`: EIC distance between the ray and chief ray at the last surface (exit)
- `cr_op`: total optical path of the chief ray through the system
- `ep`: reference sphere correction (distance from exit pupil EIC point to the
  reference sphere along the ray direction)

The chief ray always has OPD = 0 by construction. For other rays, the OPD is
the wavefront error relative to a reference sphere centered at the chief ray
image point and passing through the chief ray's exit pupil EIC expansion point.

### Exit Pupil Coordinates from EIC

For each ray, the exit pupil coordinate is computed as follows:

```python
# At the last physical surface (k = -2):
b4_pt, b4_dir = transform_after_surface(ifc, (ray[k][mc.p], ray[k][mc.d]))
ekp = eic_distance((ray[k][mc.p], ray[k][mc.d]),
                    (cr_ray[k][mc.p], cr_ray[k][mc.d]))
dst = ekp - cr_exp_dist
eic_exp_pt = b4_pt - dst * b4_dir      # ray's EIC expansion point
p_coord = eic_exp_pt - cr_exp_pt        # relative to chief ray
exit_px = p_coord[0] / fod.exp_radius   # normalized by paraxial exit pupil
exit_py = p_coord[1] / fod.exp_radius
```

Key quantities:
- `cr_exp_pt`: chief ray's EIC expansion point at the exit pupil (from
  `transfer_to_exit_pupil`)
- `cr_exp_dist`: z-distance from the last physical surface to the chief ray's
  exit pupil point
- `fod.exp_radius`: paraxial exit pupil radius (from first-order data)

### Reference Sphere Geometry

The reference sphere is defined by:
- **Center**: chief ray intersection with the image surface (`cr.ray[-1][mc.p]`
  with `foc=0`)
- **Passes through**: chief ray exit pupil EIC point (`cr_exp_pt`)
- **Radius**: distance from `cr_exp_pt` to the image point (adjusted by
  `image_thi` for the last gap), typically ~55 mm at full field

The `ep` correction in the OPD formula accounts for each ray's distance from the
exit pupil EIC point to the reference sphere surface. This correction depends on
`ref_dir` (unit vector from exit pupil to image point) and creates a field-angle-
dependent tilt contribution to the OPD, which is the source of the Z3 discrepancy
with OSLO (see cause #2 above).
