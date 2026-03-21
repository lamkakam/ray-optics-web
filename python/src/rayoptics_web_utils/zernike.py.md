# zernike.py — Zernike Polynomial Fitting for Wavefront Analysis

## Purpose

Implements Noll-ordered Zernike polynomials and least-squares fitting against OPD grids from RayOptics `RayGrid`. RayOptics has no built-in Zernike fitting, so this module provides it.

## Exports

| Function | Signature | Description |
|----------|-----------|-------------|
| `noll_to_nm` | `(j: int) -> tuple[int, int]` | Convert Noll index j (1-based) to radial order n and azimuthal frequency m |
| `zernike_radial` | `(n: int, m: int, rho: NDArray) -> NDArray` | Radial polynomial R_n^m(rho) |
| `zernike_noll` | `(j: int, rho: NDArray, theta: NDArray) -> NDArray` | Unnormalized Zernike polynomial Z_j in Noll ordering |
| `noll_norm_factor` | `(n: int, m: int) -> float` | Noll normalization factor N_n^m = sqrt((2 - δ_{m,0})(n + 1)) |
| `unnormalized_to_rms_normalized` | `(coeffs: list[float], num_terms: int) -> list[float]` | Convert unnormalized coefficients to RMS-normalized (divide by N_n^m) |
| `fit_zernike` | `(opd_grid: NDArray, num_terms: int = 22) -> NDArray` | Least-squares fit of Zernike polynomials to a (3, N, N) OPD grid |
| `_compute_exit_pupil_grid` | `(rg, opm, wavelength_nm: float) -> NDArray` | Build (3, N, N) grid with exit pupil coords (EIC-based) and corrected OPD |
| `get_zernike_coefficients` | `(opm, field_index, wvl_index, num_terms=22, num_rays=64) -> dict` | High-level: compute Zernike coefficients for a field/wavelength |

## Conventions

- **Noll ordering**: 1-based index j. See `docs/wavefront_and_zernike_analysis.md` for the full table.
- **Normalization**: `coefficients` are unnormalized (no `sqrt(n+1)` or `sqrt(2(n+1))` factors), matching ATMOS/OSLO convention. `rms_normalized_coefficients` divide each by the Noll normalization factor (see below).
- **OPD units**: all coefficients and WFE values are in **waves at the traced wavelength**.
- **MM unit bug**: `RayGrid` OPD is multiplied by `1e6` to correct for the mm/nm mismatch when `dimensions='MM'`.
- **Wavelength correction**: `RayGrid` internally divides by `central_wvl` for all wavelengths. An additional factor of `central_wvl / traced_wvl` converts OPD to waves at the traced wavelength.
- **Noll sign convention**: even j → positive m (cosine), odd j → negative m (sine).
- **Exit pupil coordinates**: Zernike fitting uses exit pupil coordinates computed via EIC (Equally Inclined Chord) expansion points, not entrance pupil coordinates from `RayGrid.grid`. This matches the convention used by OSLO and other commercial optics software. For each ray, `_compute_exit_pupil_grid` computes the EIC expansion point at the exit pupil and normalizes by `fod.exp_radius`.
- **NaN handling**: vignetted rays produce NaN in the OPD grid; these are filtered before fitting.
- **Pupil mask**: only points with rho ≤ 1.0 are used in the fit.

## `get_zernike_coefficients` Return Dict

| Key | Type | Description |
|-----|------|-------------|
| `coefficients` | `list[float]` | Unnormalized Zernike coefficients in waves, Noll j=1..num_terms |
| `rms_normalized_coefficients` | `list[float]` | RMS-normalized Zernike coefficients, Noll j=1..num_terms. Each value directly gives the RMS contribution of that term. |
| `rms_wfe` | `float` | RMS wavefront error in waves |
| `pv_wfe` | `float` | Peak-to-valley WFE in waves |
| `strehl_ratio` | `float` | Monochromatic Strehl ratio (0–1), computed as \|mean(exp(i·2π·W))\|² |
| `num_terms` | `int` | Number of Zernike terms fitted |
| `field_index` | `int` | Field index used |
| `wavelength_nm` | `float` | Wavelength in nm |

All values are plain Python types (JSON-serializable).

## Normalization

The Noll normalization factor for Zernike polynomial Z_n^m is:

```
N_n^m = sqrt( (2 - δ_{m,0}) (n + 1) )
```

where δ_{m,0} is the Kronecker delta (1 when m=0, 0 otherwise).

- m = 0: `N = sqrt(n + 1)`
- m ≠ 0: `N = sqrt(2(n + 1))`

The RMS-normalized coefficient is `c_rms = c_unnorm / N_n^m`. Each RMS-normalized coefficient directly gives the RMS contribution of that term, and `RMS WFE ≈ sqrt(Σ c_rms[j]²)` for j ≥ 2.

## Hopkins EIC OPD Method

RayOptics computes wavefront OPD using the **Hopkins Equally Inclined Chord (EIC)** method. The OPD formula is:

```
OPD = -n_obj·e1 - ray_op + n_img·ekp + cr_op - n_img·ep
```

| Term | Description |
|------|-------------|
| `e1` | EIC distance between ray and chief ray at the first surface (entrance) |
| `ray_op` | Total optical path of the ray through the system |
| `ekp` | EIC distance between ray and chief ray at the last surface (exit) |
| `cr_op` | Total optical path of the chief ray |
| `ep` | Reference sphere correction: distance from exit pupil EIC point to the reference sphere |

The reference sphere is centered at the chief ray image point (`foc=0` → chief ray intersection with the image surface) and passes through the chief ray's exit pupil EIC expansion point.

### Exit Pupil Coordinate Computation

`_compute_exit_pupil_grid` computes exit pupil coordinates for each ray using:

1. `transform_after_surface(ifc, ray_seg)` — apply decentration to get ray coords in the exit pupil reference frame
2. `eic_distance(ray, chief_ray)` — EIC distance at the last physical surface (`k = -2`)
3. `eic_exp_pt = b4_pt - (ekp - cr_exp_dist) * b4_dir` — the ray's EIC expansion point
4. `p_coord = eic_exp_pt - cr_exp_pt` — relative to the chief ray's exit pupil point
5. Normalize by `fod.exp_radius` (paraxial exit pupil radius)

### Known Convention Differences vs OSLO

- **Z3 (tilt Y)**: Off-axis fields show ~0.65 wave tilt difference at full field. This is caused by the reference sphere image point — OSLO's "Central refer ray" convention uses a reference point ~3.3 μm below the chief ray intercept. Does not affect higher-order terms (Z7+).
- **Z1/Z4 (piston/defocus)**: ~0.06 wave offset on all fields, consistent with a slight reference sphere radius difference.
- See `docs/zernike-oslo-alignment-investigation.md` for full analysis.

## Dependencies

- `numpy` (array math, `linalg.lstsq`)
- `math` (factorials for radial polynomial)
- `rayoptics.raytr.analyses.RayGrid` (only in `get_zernike_coefficients`)
- `rayoptics.raytr.waveabr.eic_distance`, `transform_after_surface` (exit pupil coordinate computation)
- `rayoptics.optical.model_constants` (ray segment indexing: `mc.p`, `mc.d`)

## Lazy Import

Registered in `__init__.py` via `_LAZY_IMPORTS['get_zernike_coefficients']` so it is only imported after `init()` stubs Qt modules.
