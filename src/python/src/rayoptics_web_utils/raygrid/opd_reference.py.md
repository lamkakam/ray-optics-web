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

## Implementation Notes

In centroid mode, each non-blocked `ray_pkg` contains a RayOptics ray sequence at `ray_pkg[mc.ray]`.
The expression `ray[-1]` selects the final ray data entry, at the traced image surface.

```python
traced_image_point = np.asarray(ray[-1][mc.p], dtype=float)
ray_direction = np.asarray(ray[-1][mc.d], dtype=float)
```

`mc.p` indexes the ray point and `mc.d` indexes the ray direction in that final RayOptics entry.
Both values are converted to NumPy `float` arrays so the following defocus projection can use vector math:
`traced_image_point + (foc / ray_direction[2]) * ray_direction`.
The projected point's first two coordinates are then validated and included in the centroid.
