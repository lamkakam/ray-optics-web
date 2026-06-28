# zernike.py — Zernike Polynomial Fitting for Wavefront Analysis

## Purpose

Implements ordering-agnostic Zernike polynomial evaluation and least-squares fitting against OPD grids from RayOptics `RayGrid`. The caller supplies the ordered `(n, m)` term list; TypeScript owns Noll/Fringe ordering definitions.

## Exports

| Function | Signature | Description |
|----------|-----------|-------------|
| `zernike_radial` | `(n: int, m: int, rho: NDArray) -> NDArray` | Radial polynomial R_n^m(rho) |
| `zernike_polynomial` | `(n: int, m: int, rho: NDArray, theta: NDArray) -> NDArray` | Unnormalized Zernike polynomial for an explicit `(n, m)` term |
| `noll_norm_factor` | `(n: int, m: int) -> float` | Noll normalization factor N_n^m = sqrt((2 - δ_{m,0})(n + 1)) |
| `unnormalized_to_rms_normalized` | `(coeffs: list[float], zernike_terms: list[tuple[int, int]]) -> list[float]` | Convert unnormalized coefficients to RMS-normalized using the matching explicit terms |
| `fit_zernike` | `(opd_grid: NDArray, zernike_terms: list[tuple[int, int]]) -> NDArray` | Least-squares fit of explicit Zernike terms to a (3, N, N) OPD grid |
| `_scale_opd_grid_to_wavelength` | `(opd_grid: NDArray, opm, wavelength_nm: float) -> NDArray` | Convert OPD values from central-wavelength waves to traced-wavelength waves |
| `_extract_exit_pupil_grid` | `(rg, opm, wavelength_nm: float) -> NDArray` | Extract pre-computed exit pupil coords from RayGrid's `upd_grid` and build (3, N, N) grid with corrected OPD |
| `get_zernike_coefficients` | `(opm, field_index, wvl_index, zernike_terms, image_point="chief_ray", num_rays=64) -> dict` | High-level: compute Zernike coefficients for a field/wavelength using explicit ordered terms |

## Conventions

- **Term ownership**: Python receives an explicit ordered list of `(n, m)` terms. It does not know about Noll or Fringe index conversion.
- **Normalization**: `coefficients` are unnormalized (no `sqrt(n+1)` or `sqrt(2(n+1))` factors), matching ATMOS/OSLO convention. `rms_normalized_coefficients` divide each coefficient by the Noll normalization factor for its explicit `(n, |m|)` term.
- **OPD units**: all coefficients and WFE values are in **waves at the traced wavelength**.
- **Wavelength correction**: `RayGrid.focus_wavefront` internally uses `1/opm.nm_to_sys_units(central_wvl)`, so `rg.grid[2]` is already in waves at the central wavelength. `_scale_opd_grid_to_wavelength(...)` applies `opm.nm_to_sys_units(central_wvl) / opm.nm_to_sys_units(wavelength_nm)` to convert to waves at the traced wavelength while respecting the model's wavelength unit conversion. OPD-only Strehl and WFE paths use this helper directly without exit-pupil coordinate extraction.
- **Exit pupil coordinates**: Zernike fitting uses exit pupil coordinates extracted from `RayGrid.grid_pkg[1]` (the `upd_grid`), where `wave_abr_pre_calc_finite_pup` already computes `p_coord` (the EIC expansion point relative to the chief ray's exit pupil point). `_extract_exit_pupil_grid` normalizes by the **maximum radial extent** of the `p_coord` data (data-driven radius), avoiding the paraxial `fod.exp_radius` which can be wildly wrong for tilted/decentered systems.
- **Vignetting**: `RayGrid` is created with `apply_vignetting=True` so vignetted rays (those that don't reach the image plane at off-axis fields) are excluded from the OPD grid. `check_apertures=True` (already the default) ensures rays blocked by apertures are clipped. Both are set explicitly for clarity.
- **Image point**: `image_point` is passed to `make_ray_grid(...)`; `"chief_ray"` preserves existing Zernike output and `"centroid"` uses the shared centroid image point.
- **NaN handling**: vignetted rays produce NaN in the OPD grid; these are filtered before fitting.
- **Pupil mask**: only points with rho ≤ 1.0 are used in the fit.

## `get_zernike_coefficients` Return Dict

| Key | Type | Description |
|-----|------|-------------|
| `coefficients` | `list[float]` | Unnormalized Zernike coefficients in waves, ordered to match the supplied `zernike_terms` |
| `rms_normalized_coefficients` | `list[float]` | RMS-normalized Zernike coefficients, ordered to match the supplied `zernike_terms`. Each value directly gives the RMS contribution of that term. |
| `rms_wfe` | `float` | RMS wavefront error in waves (piston-excluded; computed on rho ≤ 1.0 pupil after subtracting Z1 piston) |
| `pv_wfe` | `float` | Peak-to-valley WFE in waves (piston-excluded; computed on rho ≤ 1.0 pupil after subtracting Z1 piston) |
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

### Exit Pupil Coordinate Extraction

`_extract_exit_pupil_grid` reads pre-computed exit pupil coordinates from `RayGrid.grid_pkg[1]` (the `upd_grid`). During `trace_wavefront`, rayoptics calls `wave_abr_pre_calc_finite_pup` for each ray, which computes and returns `(pre_opd, p_coord, b4_pt, b4_dir)`. The `p_coord` is the ray's EIC expansion point relative to the chief ray's exit pupil point — identical to what was previously computed manually.

OPD values in the returned grid are produced by `_scale_opd_grid_to_wavelength(rg.grid[2], opm, wavelength_nm)`, so Zernike fitting preserves the same wavelength correction used by OPD-only analyses.

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

## Usages

### `get_zernike_coefficients`

Called from the Pyodide worker to compute Zernike polynomial coefficients for wavefront analysis:

```python
from rayoptics_web_utils.zernike import get_zernike_coefficients

field_index = 0
wavelength_index = 0
zernike_terms = [
    (0, 0),
    (1, 1),
    (1, -1),
    (2, 0),
]

zern_data = get_zernike_coefficients(
    opm,
    field_index,
    wavelength_index,
    zernike_terms=zernike_terms,
    image_point="chief_ray",
)
# Returns: {
#   "coefficients": [c1, c2, c3, ...],            # unnormalized, in waves
#   "rms_normalized_coefficients": [c1_rms, ...], # RMS-normalized
#   "rms_wfe": 0.045,                              # RMS wavefront error in waves
#   "pv_wfe": 0.128,                               # Peak-to-valley WFE in waves
#   "strehl_ratio": 0.87,                          # Monochromatic Strehl ∈ [0, 1]
#   "num_terms": 4,
#   "field_index": 0,
#   "wavelength_nm": 550.0
# }
json_result = json.dumps(zern_data)
```

### Helper functions

Internal functions used by the module:

- `fit_zernike(opd_grid, zernike_terms)` — fit explicit Zernike terms to an OPD grid
- `_scale_opd_grid_to_wavelength(opd_grid, opm, wavelength_nm)` — wavelength-scale OPD values without coordinate extraction
- `_extract_exit_pupil_grid(rg, opm, wavelength_nm)` — extract exit-pupil coordinates and wavelength-scaled OPD from RayGrid data

All functions are called from the Pyodide worker (`workers/pyodide.worker.ts`) and exposed via Comlink RPC to the frontend for wavefront analysis visualization.
