# `analysis/`

Functions for optical system analysis: aberrations, fan plots, spot diagrams, PSF data, MTF data, and wavefront data.

## Modules

- [first_order.py](./first_order.py) — First-order paraxial data
- [seidel.py](./seidel.py) — Third-order Seidel aberration data
- [ray_fan.py](./ray_fan.py) — Transverse ray-fan plot data
- [opd_fan.py](./opd_fan.py) — OPD fan plot data
- [spot.py](./spot.py) — Spot diagram point-cloud data
- [wavefront.py](./wavefront.py) — Wavefront map data
- [geometric_psf.py](./geometric_psf.py) — Geometric PSF point-cloud data
- [diffraction_psf.py](./diffraction_psf.py) — Diffraction PSF grid data
- [diffraction_mtf.py](./diffraction_mtf.py) — Diffraction MTF line data
- [strehl_vs_wavelength.py](./strehl_vs_wavelength.py) — Strehl ratio vs wavelength line data
- [surface_semi_diameters.py](./surface_semi_diameters.py) — Sequential Object-through-Image `surface_od()` values
- [_fan.py](./_fan.py) — Private shared fan tracing helper
- [_mtf.py](./_mtf.py) — Private diffraction MTF math helpers
