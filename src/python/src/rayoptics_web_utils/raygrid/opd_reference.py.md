# `python/src/rayoptics_web_utils/raygrid/opd_reference.py`

## Purpose

Centralizes OPD reference image-point selection for all wavefront-like Python analyses.

## API

```python
def _resolve_opd_image_point(
    opm: OpticalModel,
    fi: int,
    wavelength_nm: float,
    foc: float,
    num_rays: int,
    opd_aim_point: str = "chief_ray",
): ...
```

## Behavior

- `"chief_ray"` returns `None`, preserving RayOptics' default chief-ray image reference.
- `"centroid"` traces the vignetted pupil grid with aperture checks enabled, collects valid image-surface ray intercepts, and returns the geometric centroid as `image_pt_2d`.
- Invalid, blocked, or non-finite rays are excluded.
- Centroid mode raises `ValueError` if no valid ray intercepts are available.
