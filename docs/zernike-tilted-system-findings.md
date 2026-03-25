# Findings: Zernike Coefficient Bug for Tilted Optical Systems

## Problem

Zernike wavefront analysis produces absurd coefficients for the "Tilted Houghton-Herschel 150mm f/8" system (with tilted image surface), while the OPD fan plot for the same system is correct and matches other optical software.

### On-axis, 546.073nm, Fringe ordering:

| Metric | Value | Correct? |
|--------|-------|----------|
| P-V WFE | 0.1303 waves | Yes |
| RMS WFE | 0.0548 waves | Yes |
| Strehl Ratio | 0.9719 | Yes |
| Z1 (Piston) | -65066 waves | **NO** |
| Z4 (Defocus) | 53911 waves | **NO** |
| Z9 (Primary Spherical) | -31603 waves | **NO** |

The OPD fan shows max ~0.3 waves, consistent with other software. P-V and RMS WFE are correct because they are computed directly from the OPD grid, not from Zernike coefficients.

## Two Code Paths for OPD

### OPD Fan (correct)

- File: `python/src/rayoptics_web_utils/plotting.py:55-81`
- Uses: `SequentialModel.trace_fan()` + `wave_abr_full_calc()` (single-stage OPD calculation)
- Pupil coordinates: **entrance pupil** (normalized input grid [-1, 1])
- Works correctly for all systems including tilted

### Zernike Analysis (buggy for tilted systems)

- File: `python/src/rayoptics_web_utils/zernike.py:211-272`
- Uses: `RayGrid` (which calls `analyses.trace_wavefront()` with two-stage `wave_abr_pre_calc` + `wave_abr_calc`)
- Then: `_extract_exit_pupil_grid()` extracts **exit pupil** coordinates from `upd_grid` and normalizes by `fod.exp_radius`
- The OPD values in `rg.grid[2]` are correct; only the coordinates used for Zernike fitting are wrong

## Naming Collision: Two `trace_wavefront` Functions

There are **two different functions** both named `trace_wavefront`:

1. **`SequentialModel.trace_wavefront()`** in `rayoptics/seq/sequential.py` — simpler method that uses `trace_grid` + `wave_abr_full_calc` and returns entrance pupil coordinates as x,y in the output. The OPD fan doesn't use this directly (it uses `trace_fan`), but they share the same `wave_abr_full_calc` OPD calculation.

2. **`trace_wavefront()`** in `rayoptics/raytr/analyses.py` — module-level function that `RayGrid` calls. Uses two-stage approach: `trace_ray_grid()` + `wave_abr_pre_calc()` for each ray, returns `(grid, upd_grid)` where `upd_grid` contains pre-computed OPD packages with exit pupil data embedded.

## Root Cause

`_extract_exit_pupil_grid()` (zernike.py:164-208) normalizes exit pupil coordinates by `fod.exp_radius`:

```python
fod = opm['analysis_results']['parax_data'].fod
exp_radius = fod.exp_radius

# ... for each ray in upd_grid:
p_coord = entry[1]  # exit pupil EIC expansion point
exit_px[i, j] = p_coord[0] / exp_radius
exit_py[i, j] = p_coord[1] / exp_radius
```

`fod.exp_radius` comes from **paraxial ray tracing**, which is unreliable for significantly tilted systems. When `exp_radius` is very small or has the wrong sign, `p_coord / exp_radius` produces enormous coordinate values.

The `fit_zernike()` function (zernike.py:121-152) has a `rho <= 1.0` mask:
```python
rho = np.sqrt(px**2 + py**2)
mask = rho <= 1.0
rho, theta, opd = rho[mask], theta[mask], opd[mask]
```

With blown-up coordinates, this mask rejects most/all data points, producing a degenerate least-squares fit with absurd coefficients.

## Why Exit Pupil Coordinates Exist

For rotationally symmetric systems, exit pupil coordinates give more accurate Zernike coefficients than entrance pupil coordinates. This was validated against OSLO for the Cooke Triplet:

| Term | Entrance Pupil | Exit Pupil | OSLO Reference |
|------|---------------|------------|----------------|
| Z7 (coma) | +0.243 | +0.312 | +0.327 |
| Z11 (spherical) | -0.499 | -0.714 | -0.775 |
| Z12 (sec. astig.) | +0.396 | +0.765 | +0.820 |

These tests exist in `python/tests/test_zernike.py`:
- `test_exit_pupil_coords_off_axis_z7_coma`
- `test_exit_pupil_coords_off_axis_z11_spherical`
- `test_exit_pupil_coords_off_axis_z12`

## `_extract_exit_pupil_grid` Is Not Duplicating Logic

The function does **no ray tracing and no OPD computation**. It is a pure extraction layer that:
1. Reads pre-computed `p_coord` from `upd_grid` (populated by `wave_abr_pre_calc_finite_pup`)
2. Normalizes by `exp_radius`
3. Applies wavelength correction to OPD: `opd_grid[2] *= central_wvl / wavelength_nm`
4. Handles two cases: finite pupil (4-tuple) and infinite ref sphere / telecentric (6-tuple, falls back to entrance pupil)

No upstream rayoptics function extracts and normalizes exit pupil coordinates from `upd_grid` — this is genuinely new logic.

## Key Data Structures

### `upd_grid` entries (from `wave_abr_pre_calc`)

**Finite pupil** (4-tuple from `wave_abr_pre_calc_finite_pup`):
- `[0]` pre_opd: focus-independent OPD component
- `[1]` p_coord: exit pupil coordinates (EIC-based displacement from chief ray)
- `[2]` b4_pt: ray position after final surface
- `[3]` b4_dir: ray direction after final surface

**Infinite ref sphere** (6-tuple from `wave_abr_pre_calc_inf_ref`):
- `[0]` pre_opd, `[1]` W0, `[2-5]` ray/chief-ray position+direction

### `rg.grid` (from `RayGrid.focus_wavefront()`)

Shape `(3, N, N)`:
- `[0]` = entrance pupil x coordinates (normalized -1 to 1)
- `[1]` = entrance pupil y coordinates (normalized -1 to 1)
- `[2]` = OPD in waves (correct for all systems)

## Tilted Houghton-Herschel Prescription

From `lib/exampleSystems.ts:355-467`:
- EPD=150mm, fields=[0, 0.707, 1]×(-0.5°)
- 5 wavelengths: 435.835, 486.133, 546.073 (ref), 656.273, 706.519 nm
- S1 (Stop): R=2022, t=11.2, N-BK7
- S2: flat, t=10.5, air
- S3: R=-2022, t=9.9, N-BK7, dec-and-return alpha=5.4°
- S4: flat, t=1140, air, dec-and-return alpha=5.4° y=1.5
- S5: R=-2404.5, t=-1050, REFL, bend alpha=3°
- S6: flat, t=153.195342, REFL, bend alpha=-48°
- IMG: R=2600, bend alpha=5.66°
