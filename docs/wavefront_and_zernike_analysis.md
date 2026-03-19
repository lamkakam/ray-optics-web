# Wavefront Error & Zernike Analysis in RayOptics

## Key Classes and Functions

| Item | Module | Purpose |
|------|--------|---------|
| `RayGrid` | `rayoptics.raytr.analyses` | Traces a square grid of rays, computes OPD on pupil grid |
| `RayFan` | `rayoptics.raytr.analyses` | Traces a fan of rays (for OPD fan plots) |
| `eval_wavefront` | `rayoptics.raytr.analyses` | All-in-one OPD evaluation |
| `trace_wavefront` / `focus_wavefront` | `rayoptics.raytr.analyses` | Two-step: trace once, refocus rapidly |
| `wave_abr_full_calc` | `rayoptics.raytr.waveabr` | Single-ray OPD calculation |
| `setup_pupil_coords` | `rayoptics.raytr.trace` | Sets up chief ray and reference sphere |
| `calc_psf` | `rayoptics.raytr.analyses` | Calculates PSF from wavefront via FFT |

## How to Use `RayGrid` for Wavefront Maps

```python
from rayoptics.raytr.analyses import RayGrid

# f: field index (0, 1, 2...) into osp['fov'].fields
# wl: wavelength in nm (e.g. 587.562), NOT an index
# foc: defocus amount (0 for best focus)
# num_rays: grid resolution (e.g. 32, 64)
rg = RayGrid(opm, f=field_index, wl=wavelength_nm, foc=0, num_rays=64)

# rg.grid shape: (3, N, N)
#   [0] = pupil_x (normalized)
#   [1] = pupil_y (normalized)
#   [2] = OPD in waves (but see unit bug below)
central_wvl = opm['optical_spec']['wvls'].central_wvl
opd = rg.grid[2] * 1e6 * central_wvl / wavelength_nm  # unit + wavelength correction
```

## Unit Bug & Wavelength Correction

When `opm.system_spec.dimensions = 'MM'`, the OPD numerator is in mm but the denominator (wavelength) is in nm. **Multiply OPD values by `1e6`** to get correct values in waves.

Additionally, `RayGrid` internally divides all OPD values by the **central wavelength** (reference wavelength), regardless of the traced wavelength. To get OPD in waves at the traced wavelength, apply the correction factor `central_wvl / traced_wvl`:

```python
central_wvl = opm['optical_spec']['wvls'].central_wvl
opd = rg.grid[2] * 1e6 * central_wvl / traced_wvl_nm
```

For the reference wavelength (central = traced), the factor is 1.0.

## Zernike Decomposition

RayOptics has **no built-in Zernike fitting**. The OPD grid from `RayGrid` must be fit externally using least-squares against Zernike basis functions. The pupil coordinates in the grid are already normalized to the unit circle, making this straightforward.

### Zernike Implementation (Noll Ordering)

```python
import numpy as np
import math

def zernike_radial(n, m, rho):
    """Radial part R_n^m(rho) of Zernike polynomial."""
    m_abs = abs(m)
    result = np.zeros_like(rho, dtype=float)
    for s in range((n - m_abs) // 2 + 1):
        num = (-1)**s * math.factorial(n - s)
        den = (math.factorial(s) *
               math.factorial((n + m_abs) // 2 - s) *
               math.factorial((n - m_abs) // 2 - s))
        result += (num / den) * rho**(n - 2*s)
    return result


def noll_to_nm(j):
    """Convert Noll index j (1-based) to (n, m).

    Sign convention: even j -> positive m (cosine), odd j -> negative m (sine).
    """
    n = int(np.ceil((-3 + np.sqrt(9 + 8*(j-1))) / 2))
    if (n*(n+1))//2 >= j:
        n -= 1
    m_residual = j - (n*(n+1))//2 - 1
    m_start = 0 if n % 2 == 0 else 1
    m_abs_list = []
    for mv in range(m_start, n+1, 2):
        if mv == 0:
            m_abs_list.append(0)
        else:
            m_abs_list.append(mv)
            m_abs_list.append(mv)
    m_abs = m_abs_list[m_residual]
    if m_abs == 0:
        return n, 0
    return (n, m_abs) if j % 2 == 0 else (n, -m_abs)


def zernike_noll(j, rho, theta):
    """Compute Zernike polynomial Z_j in Noll ordering (unnormalized)."""
    n, m = noll_to_nm(j)
    R = zernike_radial(n, m, rho)
    if m > 0:
        Z = R * np.cos(m * theta)
    elif m < 0:
        Z = R * np.sin(-m * theta)
    else:
        Z = R
    return Z


def fit_zernike(opd_grid, num_terms=22):
    """Fit Zernike polynomials to a RayGrid wavefront.

    Args:
        opd_grid: shape (3, N, N) from RayGrid.grid
                  [0]=pupil_x, [1]=pupil_y, [2]=OPD (in waves)
        num_terms: number of Zernike terms (Noll ordering)

    Returns:
        array of Zernike coefficients in waves
    """
    px = opd_grid[0].ravel()
    py = opd_grid[1].ravel()
    opd = opd_grid[2].ravel()

    valid = ~np.isnan(opd)
    px, py, opd = px[valid], py[valid], opd[valid]

    rho = np.sqrt(px**2 + py**2)
    theta = np.arctan2(py, px)

    mask = rho <= 1.0
    rho, theta, opd = rho[mask], theta[mask], opd[mask]

    Z = np.zeros((len(opd), num_terms))
    for j in range(1, num_terms + 1):
        Z[:, j-1] = zernike_noll(j, rho, theta)

    coeffs, _, _, _ = np.linalg.lstsq(Z, opd, rcond=None)
    return coeffs
```

### Zernike Term Names (Noll Ordering)

| Noll j | (n, m) | Name |
|--------|--------|------|
| 1 | (0, 0) | Piston |
| 2 | (1, +1) | Tilt X (cos θ) |
| 3 | (1, -1) | Tilt Y (sin θ) |
| 4 | (2, 0) | Defocus |
| 5 | (2, -2) | Astigmatism (sin 2θ) |
| 6 | (2, +2) | Astigmatism (cos 2θ) |
| 7 | (3, -1) | Coma Y (sin θ) |
| 8 | (3, +1) | Coma X (cos θ) |
| 9 | (3, -3) | Trefoil (sin 3θ) |
| 10 | (3, +3) | Trefoil (cos 3θ) |
| 11 | (4, 0) | Primary Spherical |
| 12 | (4, +2) | Secondary Astig (cos 2θ) |
| 13 | (4, -2) | Secondary Astig (sin 2θ) |
| 14 | (4, +4) | Tetrafoil (cos 4θ) |
| 15 | (4, -4) | Tetrafoil (sin 4θ) |
| 22 | (6, 0) | Secondary Spherical |

**Sign convention**: even j → positive m (cosine term), odd j → negative m (sine term).

**Normalization**: unnormalized (no √(n+1) or √(2(n+1)) factors), matching ATMOS/OSLO convention.

## Complete Example: Sasian Triplet

```python
from rayoptics.environment import *
from rayoptics.raytr.trace import apply_paraxial_vignetting
from rayoptics.raytr.analyses import RayGrid
import numpy as np
import math

# --- Set up optical model ---
opm = OpticalModel()
sm  = opm['seq_model']
osp = opm['optical_spec']
pm  = opm['parax_model']

opm.system_spec.dimensions = 'MM'
osp['pupil'] = PupilSpec(osp, key=['object', 'epd'], value=12.5)
osp['fov'] = FieldSpec(osp, key=['object', 'angle'], value=20,
                       flds=[0, 0.707, 1], is_relative=True)
osp['wvls'] = WvlSpec([(486.133, 1), (587.562, 2), (656.273, 1)], ref_wl=1)

opm.radius_mode = True
sm.do_apertures = False
sm.gaps[0].thi = 10000000000

sm.add_surface([23.713, 4.831, "N-LAK9", "Schott"], sd=10.009)
sm.add_surface([7331.288, 5.86, "air"], sd=8.9482)
sm.add_surface([-24.456, 0.975, "N-SF5", "Schott"], sd=4.7919)
sm.set_stop()
sm.add_surface([21.896, 4.822, "air"], sd=4.7761)
sm.add_surface([86.759, 3.127, "N-LAK9", "Schott"], sd=8.0217)
sm.add_surface([-20.4942, 41.2365, "air"], sd=8.3321)
sm.ifcs[-1].profile.r = 0

opm.update_model()
apply_paraxial_vignetting(opm)

# --- Wavefront error + Zernike for each field/wavelength ---
central_wvl = osp['wvls'].central_wvl
wvls = [486.133, 587.562, 656.273]
fld_labels = ['On-axis (0deg)', '0.707 field (14.1deg)', 'Full field (20deg)']

for fi, flabel in enumerate(fld_labels):
    for wvl in wvls:
        rg = RayGrid(opm, f=fi, wl=wvl, foc=0, num_rays=64)
        grid = rg.grid.copy()
        grid[2] *= 1e6 * central_wvl / wvl  # unit + wavelength correction

        opd_valid = grid[2][~np.isnan(grid[2])]
        rms = np.sqrt(np.mean(opd_valid**2))
        pv = np.max(opd_valid) - np.min(opd_valid)

        coeffs = fit_zernike(grid, num_terms=22)

        print(f'=== {flabel}, wvl={wvl:.1f}nm | RMS={rms:.4f} PV={pv:.4f} waves ===')
        for j in range(1, 23):
            n, m = noll_to_nm(j)
            if abs(coeffs[j-1]) > 0.005:
                print(f'  Z{j:2d} (n={n},m={m:+d}): {coeffs[j-1]:+.6f} waves')
        print()
```

## Results for the Sasian Triplet

### Wavefront Error Summary

| Field | Wavelength | RMS (waves) | PV (waves) |
|-------|-----------|-------------|------------|
| On-axis | 486.1 nm | 0.7156 | 1.3413 |
| On-axis | 587.6 nm | 0.7334 | 1.4649 |
| On-axis | 656.3 nm | 0.4018 | 0.9572 |
| 0.707 field | 486.1 nm | 1.5971 | 3.9312 |
| 0.707 field | 587.6 nm | 1.5111 | 4.4622 |
| 0.707 field | 656.3 nm | 1.2166 | 4.6126 |
| Full field | 486.1 nm | 2.8996 | 5.2329 |
| Full field | 587.6 nm | 2.3572 | 3.8920 |
| Full field | 656.3 nm | 1.8277 | 3.2271 |

### Zernike Coefficients (significant terms only, > 0.005 waves)

**On-axis, 587.6 nm** (rotationally symmetric as expected, unnormalized):
- Z1 Piston: +0.568 waves
- Z4 Defocus: +0.788 waves
- Z11 Primary Spherical: +0.171 waves
- Z22 Secondary Spherical: -0.052 waves

**0.707 field, 587.6 nm** (astigmatism-dominated, unnormalized):
- Z1 Piston: +1.122 waves
- Z3 Tilt Y: -0.127 waves
- Z4 Defocus: +0.992 waves
- Z6 Astigmatism (cos 2θ): +1.937 waves
- Z7 Coma Y (sin θ): -0.155 waves
- Z11 Primary Spherical: -0.182 waves
- Z12 Secondary Astig (cos 2θ): +0.248 waves

**Full field, 587.6 nm** (mixed higher-order, unnormalized):
- Z1 Piston: +2.087 waves
- Z3 Tilt Y: +0.586 waves
- Z4 Defocus: +1.645 waves
- Z6 Astigmatism (cos 2θ): -0.126 waves
- Z7 Coma Y (sin θ): +0.243 waves
- Z9 Trefoil (sin 3θ): +0.241 waves
- Z11 Primary Spherical: -0.499 waves
- Z12 Secondary Astig (cos 2θ): +0.396 waves

## Polychromatic Strehl Ratio

RayOptics does not have a built-in polychromatic Strehl calculation, but it can be computed from the wavefront data.

**Monochromatic Strehl** at each wavelength is computed exactly as:

```
S = |mean(exp(i·2π·W))|²
```

where W is the OPD in waves over valid pupil points. This equals the ratio of the aberrated PSF peak to the diffraction-limited peak.

**Polychromatic Strehl** is the weighted average using `osp['wvls'].spectral_wts`:

```
S_poly = Σ(w_i · S_i) / Σ(w_i)
```

### Implementation

```python
import numpy as np
from rayoptics.raytr.analyses import RayGrid

correction = 1e6  # MM unit bug

def monochromatic_strehl(opd_waves):
    """Compute Strehl ratio from OPD grid (in waves).
    Strehl = |mean(exp(i*2*pi*W))|^2 over valid pupil points.
    """
    valid = opd_waves[~np.isnan(opd_waves)]
    if len(valid) == 0:
        return 0.0
    phase = np.exp(1j * 2 * np.pi * valid)
    strehl = np.abs(np.mean(phase))**2
    return strehl


def polychromatic_strehl(opm, field_idx, foc=0, num_rays=128):
    """Compute polychromatic Strehl ratio at a field point.

    Uses weighted sum of monochromatic PSF peaks:
      S_poly = sum(w_i * S_i) / sum(w_i)
    where S_i is the monochromatic Strehl at wavelength i.

    Args:
        opm: OpticalModel instance
        field_idx: index into osp['fov'].fields
        foc: defocus amount (default 0)
        num_rays: grid resolution (default 128)

    Returns:
        poly_strehl: polychromatic Strehl ratio
        mono_strehls: list of (wavelength, weight, strehl) tuples
    """
    wvl_spec = opm['optical_spec']['wvls']
    wavelengths = wvl_spec.wavelengths
    weights = wvl_spec.spectral_wts

    total_weighted_strehl = 0.0
    total_weight = sum(weights)

    mono_strehls = []
    for wvl, wt in zip(wavelengths, weights):
        rg = RayGrid(opm, f=field_idx, wl=wvl, foc=foc, num_rays=num_rays)
        opd = rg.grid[2] * correction
        s = monochromatic_strehl(opd)
        mono_strehls.append((wvl, wt, s))
        total_weighted_strehl += wt * s

    poly_strehl = total_weighted_strehl / total_weight
    return poly_strehl, mono_strehls
```

### Usage

```python
fld_labels = ['On-axis (0 deg)', '0.707 field (14.1 deg)', 'Full field (20 deg)']

for fi, flabel in enumerate(fld_labels):
    poly_s, mono_list = polychromatic_strehl(opm, fi, foc=0, num_rays=128)

    print(f'=== {flabel} ===')
    for wvl, wt, s in mono_list:
        print(f'  {wvl:.1f} nm (weight={wt}): Strehl = {s:.6f}')
    print(f'  Polychromatic Strehl = {poly_s:.6f}')
```

### Results for the Sasian Triplet

Wavelengths: [486.133, 587.562, 656.273], Weights: [1, 2, 1]

| Field | 486.1 nm (w=1) | 587.6 nm (w=2) | 656.3 nm (w=1) | Polychromatic |
|-------|---------------|---------------|---------------|---------------|
| On-axis (0 deg) | 0.1022 | 0.0963 | 0.1042 | 0.0997 |
| 0.707 field (14.1 deg) | 0.0005 | 0.0199 | 0.0358 | 0.0190 |
| Full field (20 deg) | 0.0040 | 0.0154 | 0.0148 | 0.0124 |

All Strehl values are well below 0.8 (diffraction limit), consistent with the ~0.4–2.9 waves RMS wavefront errors. The system degrades significantly with field angle, as expected for a triplet.

## Additional Analysis: OPD Fan Plots (from docs example)

```python
# OPD ray fan plot (as shown in RayOptics documentation)
wav_plt = plt.figure(FigureClass=RayFanFigure, opt_model=opm,
                     data_type='OPD', scale_type=Fit.All_Same,
                     is_dark=False).plot()
```

## Additional Analysis: PSF Calculation

```python
from rayoptics.raytr.analyses import RayGrid, calc_psf, calc_psf_scaling

rg = RayGrid(opm, f=0, wl=587.562, foc=0, num_rays=64)
grid = rg.grid.copy()
grid[2] *= 1e6  # unit correction

ndim = 256  # FFT size
maxdim = ndim // 2
psf = calc_psf(grid, ndim, maxdim)
```
