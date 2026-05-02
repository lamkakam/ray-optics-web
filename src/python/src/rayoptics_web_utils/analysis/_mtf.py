"""Diffraction MTF math helpers."""

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
