# `python/src/rayoptics_web_utils/raygrid/opd_reference.py`

## Purpose

Centralizes image-point selection for spot, wavefront-like, and OPD-related Python analyses.

## API

```python
def _resolve_image_point(
    opm: OpticalModel,
    fi: int,
    wavelength_nm: float,
    foc: float,
    num_rays: int,
    image_point: str = "chief_ray",
): ...
```

## Behavior

- `"chief_ray"` returns `None`, preserving RayOptics' default chief-ray image reference.
- `"centroid"` traces the vignetted pupil grid with aperture checks enabled, collects valid defocused image points, and returns the geometric centroid as `image_pt_2d`.
- Invalid, blocked, or non-finite rays are excluded.
- Centroid mode raises `ValueError` if no valid image points are available.
