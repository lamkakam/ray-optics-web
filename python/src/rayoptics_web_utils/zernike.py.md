# zernike.py — Zernike Polynomial Fitting for Wavefront Analysis

## Purpose

Implements Noll-ordered Zernike polynomials and least-squares fitting against OPD grids from RayOptics `RayGrid`. RayOptics has no built-in Zernike fitting, so this module provides it.

## Exports

| Function | Signature | Description |
|----------|-----------|-------------|
| `noll_to_nm` | `(j: int) -> tuple[int, int]` | Convert Noll index j (1-based) to radial order n and azimuthal frequency m |
| `fringe_to_nm` | `(j: int) -> tuple[int, int]` | Convert Fringe (University of Arizona) index j (1-based) to (n, m) |
| `zernike_radial` | `(n: int, m: int, rho: NDArray) -> NDArray` | Radial polynomial R_n^m(rho) |
| `zernike_noll` | `(j: int, rho: NDArray, theta: NDArray) -> NDArray` | Unnormalized Zernike polynomial Z_j in Noll ordering |
| `zernike_fringe` | `(j: int, rho: NDArray, theta: NDArray) -> NDArray` | Unnormalized Zernike polynomial Z_j in Fringe ordering |
| `noll_norm_factor` | `(n: int, m: int) -> float` | Noll normalization factor N_n^m = sqrt((2 - δ_{m,0})(n + 1)) |
| `unnormalized_to_rms_normalized` | `(coeffs: list[float], num_terms: int, ordering: str = "noll") -> list[float]` | Convert unnormalized coefficients to RMS-normalized (divide by N_n^m) |
| `fit_zernike` | `(opd_grid: NDArray, num_terms: int = 22, ordering: str = "noll") -> NDArray` | Least-squares fit of Zernike polynomials to a (3, N, N) OPD grid |
| `_extract_exit_pupil_grid` | `(rg, opm, wavelength_nm: float) -> NDArray` | Extract pre-computed exit pupil coords from RayGrid's `upd_grid` and build (3, N, N) grid with corrected OPD |
| `get_zernike_coefficients` | `(opm, field_index, wvl_index, num_terms=22, num_rays=64, ordering="noll") -> dict` | High-level: compute Zernike coefficients for a field/wavelength |

## Conventions

- **Noll ordering**: 1-based index j. See `docs/wavefront_and_zernike_analysis.md` for the full table.
- **Fringe ordering**: 1-based index j. Groups by c = (n + |m|) / 2; within each group ordered by |m| descending, cos (+m) before sin (−m), m=0 last. Key landmarks: j=5=(2,+2) cos-astig, j=9=(4,0) primary spherical, j=16=(6,0) secondary spherical.
- **Normalization**: `coefficients` are unnormalized (no `sqrt(n+1)` or `sqrt(2(n+1))` factors), matching ATMOS/OSLO convention. `rms_normalized_coefficients` divide each by the Noll normalization factor (see below). The same normalization factor formula is used for both orderings since it depends only on (n, |m|).
- **OPD units**: all coefficients and WFE values are in **waves at the traced wavelength**.
- **Wavelength correction**: `RayGrid.focus_wavefront` internally uses `1/opm.nm_to_sys_units(central_wvl)`, so `rg.grid[2]` is already in waves at the central wavelength. An additional factor of `central_wvl / wavelength_nm` converts to waves at the traced wavelength.
- **Noll sign convention**: even j → positive m (cosine), odd j → negative m (sine).
- **Exit pupil coordinates**: Zernike fitting uses exit pupil coordinates extracted from `RayGrid.grid_pkg[1]` (the `upd_grid`), where `wave_abr_pre_calc_finite_pup` already computes `p_coord` (the EIC expansion point relative to the chief ray's exit pupil point). `_extract_exit_pupil_grid` normalizes by the **maximum radial extent** of the `p_coord` data (data-driven radius), avoiding the paraxial `fod.exp_radius` which can be wildly wrong for tilted/decentered systems.
- **Vignetting**: `RayGrid` is created with `apply_vignetting=True` so vignetted rays (those that don't reach the image plane at off-axis fields) are excluded from the OPD grid. `check_apertures=True` (already the default) ensures rays blocked by apertures are clipped. Both are set explicitly for clarity.
- **NaN handling**: vignetted rays produce NaN in the OPD grid; these are filtered before fitting.
- **Pupil mask**: only points with rho ≤ 1.0 are used in the fit.

## `get_zernike_coefficients` Return Dict

| Key | Type | Description |
|-----|------|-------------|
| `coefficients` | `list[float]` | Unnormalized Zernike coefficients in waves, ordered by j=1..num_terms in the requested ordering |
| `rms_normalized_coefficients` | `list[float]` | RMS-normalized Zernike coefficients, ordered by j=1..num_terms. Each value directly gives the RMS contribution of that term. |
| `rms_wfe` | `float` | RMS wavefront error in waves |
| `pv_wfe` | `float` | Peak-to-valley WFE in waves |
| `strehl_ratio` | `float` | Monochromatic Strehl ratio (0–1), computed as \|mean(exp(i·2π·W))\|² |
| `num_terms` | `int` | Number of Zernike terms fitted |
| `field_index` | `int` | Field index used |
| `wavelength_nm` | `float` | Wavelength in nm |
| `ordering` | `str` | Zernike ordering used: `"noll"` or `"fringe"` |

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

## Fringe Ordering

Fringe (University of Arizona) ordering groups terms by `c = (n + |m|) / 2`. Group `c` contains `2c + 1` terms, and the cumulative count through group `c` is `(c+1)²`.

Within each group, terms are ordered:
1. Pairs of (cos, sin) for |m| = c, c−1, c−2, ..., 1 (descending)
2. The m=0 term last

| Fringe j | (n, m) | Name |
|----------|--------|------|
| 1 | (0, 0) | Piston |
| 2 | (1, +1) | Tilt X |
| 3 | (1, −1) | Tilt Y |
| 4 | (2, 0) | Defocus |
| 5 | (2, +2) | Astigmatism cos |
| 6 | (2, −2) | Astigmatism sin |
| 7 | (3, +1) | Coma X |
| 8 | (3, −1) | Coma Y |
| 9 | (4, 0) | Primary spherical |
| 10 | (3, +3) | Trefoil cos |
| 11 | (3, −3) | Trefoil sin |
| 16 | (6, 0) | Secondary spherical |
| 25 | (8, 0) | Tertiary spherical |

Key differences from Noll at the same index: Fringe j=5 is cos-astigmatism (2,+2); Noll j=5 is sin-astigmatism (2,−2). Fringe j=9 is primary spherical (4,0); Noll j=9 is (3,−3). Purely radial terms (m=0) do not have the same j in the two orderings (e.g., primary spherical is Fringe j=9 vs Noll j=11).

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

### Exit Pupil Coordinate Extraction

`_extract_exit_pupil_grid` reads pre-computed exit pupil coordinates from `RayGrid.grid_pkg[1]` (the `upd_grid`). During `trace_wavefront`, rayoptics calls `wave_abr_pre_calc_finite_pup` for each ray, which computes and returns `(pre_opd, p_coord, b4_pt, b4_dir)`. The `p_coord` is the ray's EIC expansion point relative to the chief ray's exit pupil point — identical to what was previously computed manually.

For finite pupil systems: `upd_grid[i][j]` is a 4-tuple; `p_coord = entry[1]`, normalized by the maximum radial extent of all valid `p_coord` values (data-driven radius). Falls back to `abs(fod.exp_radius)` only if all radii are near-zero.
For infinite ref sphere (telecentric): `upd_grid[i][j]` is a 6-tuple; uses entrance pupil coordinates from `rg.grid` (already normalized).

### Known Convention Differences vs OSLO

- **Z3 (tilt Y)**: Off-axis fields show ~0.65 wave tilt difference at full field. This is caused by the reference sphere image point — OSLO's "Central refer ray" convention uses a reference point ~3.3 μm below the chief ray intercept. Does not affect higher-order terms (Z7+).
- **Z1/Z4 (piston/defocus)**: ~0.06 wave offset on all fields, consistent with a slight reference sphere radius difference.
- See `docs/zernike-oslo-alignment-investigation.md` for full analysis.

## Dependencies

- `numpy` (array math, `linalg.lstsq`)
- `math` (factorials for radial polynomial)
- `rayoptics.raytr.analyses.RayGrid` (only in `get_zernike_coefficients`)

## Lazy Import

Registered in `__init__.py` via `_LAZY_IMPORTS['get_zernike_coefficients']` so it is only imported after `init()` stubs Qt modules.
