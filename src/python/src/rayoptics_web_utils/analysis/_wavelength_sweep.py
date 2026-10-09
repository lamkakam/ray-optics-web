"""Share wavelength-axis sampling and temporary model wavelengths across sweeps."""

from __future__ import annotations

from collections.abc import Iterable
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel
    from rayoptics.raytr.opticalspec import WvlSpec

type WavelengthState = tuple[list[float], list[float], int]
"""Saved ``(wavelengths, spectral_wts, reference_wvl)`` of a spectral region."""


def _wavelength_axis(wavelengths: Iterable[float], wavelength_samples: int) -> np.ndarray:
    """Return uniformly spaced analysis wavelengths in nanometres.

    Two or more distinct configured wavelengths define the sampled range from
    their minimum to their maximum. A single distinct wavelength instead uses
    `center ± 200 nm`, clipping the lower bound to 201 nm.

    Args:
        wavelengths: Configured model wavelengths in nanometres.
        wavelength_samples: Number of uniformly spaced samples, endpoints included.

    Returns:
        Uniformly spaced analysis wavelengths in nanometres.
    """
    configured_wavelengths = [float(wavelength) for wavelength in wavelengths]
    if not configured_wavelengths:
        raise ValueError("Optical model must define at least one wavelength.")

    distinct_wavelengths = set(configured_wavelengths)
    if len(distinct_wavelengths) >= 2:
        start = min(configured_wavelengths)
        stop = max(configured_wavelengths)
    else:
        center = configured_wavelengths[0]
        start = max(center - 200.0, 201.0)
        stop = center + 200.0

    return np.linspace(start, stop, wavelength_samples)


def _unique_preserving_order(values: list[float]) -> list[float]:
    unique_values = []
    for value in values:
        if value not in unique_values:
            unique_values.append(value)
    return unique_values


def _set_analysis_wavelengths(opm: OpticalModel, sampled_wavelengths: np.ndarray) -> tuple[WvlSpec, WavelengthState]:
    """Temporarily replace model wavelengths with the sampled analysis wavelengths.

    RayOptics traces only wavelengths in its sequential index table, so the
    samples plus the original central wavelength become the model wavelengths,
    each with unit weight and the original central wavelength as reference.

    Args:
        opm: RayOptics optical model, updated in place.
        sampled_wavelengths: Analysis wavelengths in nanometres.

    Returns:
        The spectral region and the original state to pass to `_restore_wavelengths`.
    """
    spectral_region = opm["optical_spec"]["wvls"]
    original_state = (
        list(spectral_region.wavelengths),
        list(spectral_region.spectral_wts),
        spectral_region.reference_wvl,
    )
    original_central_wavelength = float(spectral_region.central_wvl)
    analysis_wavelengths = _unique_preserving_order(
        [float(wavelength) for wavelength in sampled_wavelengths] + [original_central_wavelength]
    )

    spectral_region.wavelengths = analysis_wavelengths
    spectral_region.spectral_wts = [1.0] * len(analysis_wavelengths)
    spectral_region.reference_wvl = analysis_wavelengths.index(original_central_wavelength)
    opm.update_model()

    return spectral_region, original_state


def _restore_wavelengths(opm: OpticalModel, spectral_region: WvlSpec, original_state: WavelengthState) -> None:
    """Restore the wavelengths, weights, and reference saved by `_set_analysis_wavelengths`.

    Args:
        opm: RayOptics optical model, updated in place.
        spectral_region: Spectral region returned by `_set_analysis_wavelengths`.
        original_state: Original state returned by `_set_analysis_wavelengths`.
    """
    original_wavelengths, original_weights, original_reference_wavelength = original_state
    spectral_region.wavelengths = original_wavelengths
    spectral_region.spectral_wts = original_weights
    spectral_region.reference_wvl = original_reference_wavelength
    opm.update_model()
