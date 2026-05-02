# `python/src/rayoptics_web_utils/analysis/_mtf.py`

## Purpose

Private math helpers for diffraction MTF extraction.

## Exports

```python
def _diffraction_limited_mtf(freqs, cutoff: float) -> np.ndarray: ...
def _directional_na_from_ray_dirs(chief_dir, negative_dir, positive_dir, axis: int) -> float: ...
def _mtf_frequency_axis(cutoff: float, sample_count: int) -> np.ndarray: ...
```

## Key Conventions

- `_diffraction_limited_mtf` implements the incoherent circular-pupil MTF formula and returns zero outside the cutoff.
- `_directional_na_from_ray_dirs` measures marginal ray directions relative to the chief ray so tilted or folded systems do not treat chief-ray fold angle as aperture cone angle.
- `_mtf_frequency_axis` maps non-negative OTF samples linearly onto a directional cutoff and returns zeros for one or fewer samples.
