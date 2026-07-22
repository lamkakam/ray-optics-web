"""# `python/src/rayoptics_web_utils/analysis/_mtf.py`

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

Diffraction MTF math helpers."""

import numpy as np


def _diffraction_limited_mtf(freqs, cutoff: float) -> np.ndarray:
    """Return the incoherent circular-pupil diffraction-limited MTF."""
    freqs = np.asarray(freqs, dtype=float)
    if cutoff <= 0.0:
        return np.zeros_like(freqs, dtype=float)

    normalized_freqs = np.abs(freqs) / cutoff
    mtf = np.zeros_like(normalized_freqs, dtype=float)
    inside_cutoff = normalized_freqs <= 1.0
    nu = normalized_freqs[inside_cutoff]
    phi = np.arccos(nu)
    mtf[inside_cutoff] = (2.0 / np.pi) * (phi - nu * np.sqrt(np.clip(1.0 - nu**2, 0.0, 1.0)))
    return mtf


def _directional_na_from_ray_dirs(chief_dir, negative_dir, positive_dir, axis: int) -> float:
    """Return one directional NA from marginal directions relative to the chief ray."""
    chief_dir = np.asarray(chief_dir, dtype=float)
    marginal_dirs = [
        np.asarray(negative_dir, dtype=float),
        np.asarray(positive_dir, dtype=float),
    ]
    relative_components = [abs(float((direction - chief_dir)[axis])) for direction in marginal_dirs]
    return max(relative_components)


def _mtf_frequency_axis(cutoff: float, sample_count: int) -> np.ndarray:
    """Map non-negative OTF samples onto their directional diffraction cutoff."""
    if sample_count <= 1:
        return np.zeros(sample_count, dtype=float)
    return np.linspace(0.0, cutoff, sample_count, dtype=float)


def _psf_image_axis(cutoff: float, sample_count: int) -> np.ndarray:
    """Return a centered image-plane axis sampled at the Nyquist PSF spacing."""
    if sample_count <= 0 or cutoff <= 0.0:
        return np.zeros(sample_count, dtype=float)

    spacing = 1.0 / (2.0 * cutoff)
    return (np.arange(sample_count, dtype=float) - ((sample_count - 1) / 2.0)) * spacing
