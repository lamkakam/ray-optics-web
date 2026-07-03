# `python/src/rayoptics_web_utils/analysis/_mtf.py`

## Purpose

Private math helpers for diffraction MTF extraction.

## Exports

```python
def _diffraction_limited_mtf(freqs, cutoff: float) -> np.ndarray: ...
def _directional_na_from_ray_dirs(chief_dir, negative_dir, positive_dir, axis: int) -> float: ...
def _mtf_frequency_axis(cutoff: float, sample_count: int) -> np.ndarray: ...
def _psf_image_axis(cutoff: float, sample_count: int) -> np.ndarray: ...
```

## Key Conventions

- `_diffraction_limited_mtf` implements the incoherent circular-pupil MTF formula and returns zero outside the cutoff.
- `_directional_na_from_ray_dirs` estimates one image-space numerical aperture component from final ray direction cosines. It compares the two marginal ray directions against the chief ray direction along one coordinate axis, then returns the larger absolute relative component.
- `_directional_na_from_ray_dirs(..., axis=0)` is used as the sagittal/horizontal aperture component in this project.
- `_directional_na_from_ray_dirs(..., axis=1)` is used as the tangential/vertical aperture component in this project.
- Subtracting `chief_dir` removes the field tilt or fold direction from the measurement. This prevents the chief-ray angle itself from being mistaken for the aperture cone angle, which is important for tilted or folded systems.
- `_mtf_frequency_axis` maps non-negative OTF samples linearly onto a directional cutoff and returns zeros for one or fewer samples.
- `_psf_image_axis` maps a directional cutoff to a centered image-plane coordinate axis using Nyquist PSF spacing `1 / (2 * cutoff)`.
