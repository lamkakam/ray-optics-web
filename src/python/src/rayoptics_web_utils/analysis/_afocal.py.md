# `python/src/rayoptics_web_utils/analysis/_afocal.py`

## Purpose

Provides the shared image-space-afocal calculations used by angular, wavefront, diffraction, and longitudinal analyses.

## Conventions

- Afocal mode is selected only by `optical_spec.conjugate_type("image") == "infinite"`.
- Exiting rays use the segment immediately after the last physical surface. Sagittal and tangential axes are orthogonal to the chief or valid-ray angular-centroid reference direction.
- Angular coordinates use `atan2` and `206264.806247 arcsec/rad`.
- The exit-pupil plane is found from neighboring chief rays and is normal to the output reference direction. Plane-wave OPD excludes the artificial final gap, uses object-space EIC and traced OPL, is chief-ray referenced, and is stored in central-wavelength waves by `make_afocal_ray_grid`.
- Projected exit-pupil diameters set afocal diffraction scale. Output vergence is positive for downstream convergence and is returned in inverse metres (`D`).
