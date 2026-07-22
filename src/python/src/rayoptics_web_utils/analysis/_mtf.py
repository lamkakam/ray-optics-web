"""
Private math helpers for diffraction MTF extraction.

## Key Conventions
- `axis` is 0 for sagittal/horizontal and 1 for tangential/vertical.

"""

import numpy as np


def _diffraction_limited_mtf(freqs, cutoff: float) -> np.ndarray:
    """Return the incoherent circular-pupil diffraction-limited MTF. Returns zero outside the cutoff."""
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
    """
    Return one directional image-space NA from marginal directions relative to the chief ray.

    - Two marginal rays (from `negative_dir` and `positive_dir`) are compared against the chief ray direction along the specified axis (`axis`).
    - The larger absolute relative component is returned.
    """
    chief_dir = np.asarray(chief_dir, dtype=float)
    marginal_dirs = [
        np.asarray(negative_dir, dtype=float),
        np.asarray(positive_dir, dtype=float),
    ]

    # Subtracting `chief_dir` removes the field tilt or fold direction from the measurement.
    # This prevents the chief-ray angle itself from being mistaken for the aperture cone angle, which is important for tilted or folded systems.
    relative_components = [abs(float((direction - chief_dir)[axis])) for direction in marginal_dirs]
    return max(relative_components)


def _mtf_frequency_axis(cutoff: float, sample_count: int) -> np.ndarray:
    """Map non-negative OTF samples linearly onto a directional diffraction cutoff and returns zeros for one or fewer samples."""
    if sample_count <= 1:
        return np.zeros(sample_count, dtype=float)
    return np.linspace(0.0, cutoff, sample_count, dtype=float)


def _psf_image_axis(cutoff: float, sample_count: int) -> np.ndarray:
    """Return a centered image-plane axis sampled at the Nyquist PSF spacing."""
    if sample_count <= 0 or cutoff <= 0.0:
        return np.zeros(sample_count, dtype=float)

    spacing = 1.0 / (2.0 * cutoff)
    return (np.arange(sample_count, dtype=float) - ((sample_count - 1) / 2.0)) * spacing
