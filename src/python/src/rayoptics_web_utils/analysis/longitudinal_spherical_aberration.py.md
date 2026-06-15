# `python/src/rayoptics_web_utils/analysis/longitudinal_spherical_aberration.py`

## Purpose

Return longitudinal spherical aberration plot data for the on-axis field across all configured wavelengths.

## Exports

```python
def get_lsa_data(opm: OpticalModel, num_points: int = 21) -> list[dict]: ...
```

## Behavior

- Samples normalized tangential pupil coordinate `rho` from `0.0` to `1.0`.
- Uses field index `0` only.
- Iterates every configured wavelength index.
- Traces each nonzero pupil ray with RayOptics `trace_ray(..., foc=foc)`.
- Computes longitudinal focus shift from the current image plane using `-ray[-1].p[1] / (ray[-2].d[1] / ray[-2].d[2])`.
- Sets the axial `rho=0` focus shift to `0.0`.

## Return Shape

Each list entry represents one wavelength:

```python
{
    "wvlIdx": int,
    "LSA": {"x": list[float], "y": list[float]},
    "unitX": "mm",
    "unitY": "",
}
```

`LSA.x` contains longitudinal focus shifts, and `LSA.y` contains normalized pupil coordinates.
