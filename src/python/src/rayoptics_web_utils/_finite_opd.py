"""Provide wavelength-correct first-order boundary indices for finite OPD.

RayOptics stores first-order data at the configured reference wavelength, but
its finite wave-aberration equations read ``n_obj`` and ``n_img`` from that
data even when tracing another wavelength.  This module supplies a shallow
copy with only those boundary indices replaced.  The cached model data and all
other first-order quantities remain unchanged.
"""

from __future__ import annotations

import copy


def first_order_data_for_wavelength(opm, wavelength_nm: float):
    """Return copied first-order data with indices for ``wavelength_nm``.

    The first and last sequential gaps define object and image space. Their
    media are evaluated directly at the traced wavelength. The model's cached
    reference-wavelength ``FirstOrderData`` is never mutated.

    Args:
        opm: RayOptics optical model.
        wavelength_nm: Traced wavelength in nanometres.

    Returns:
        A shallow first-order-data copy with wavelength-specific boundary
        indices.
    """
    cached_fod = opm["analysis_results"]["parax_data"].fod
    wavelength_fod = copy.copy(cached_fod)
    gaps = opm["seq_model"].gaps
    wavelength_fod.n_obj = float(gaps[0].medium.rindex(wavelength_nm))
    wavelength_fod.n_img = float(gaps[-1].medium.rindex(wavelength_nm))
    return wavelength_fod


class FirstOrderDataModelView:
    """Delegate to a model while exposing replacement first-order data.

    RayOptics' ``RayGrid`` obtains first-order data internally from the model.
    This read-only view replaces only that lookup, allowing normal ray tracing
    and reference-sphere setup to continue through the original model without
    changing its cached analysis results.
    """

    def __init__(self, opm, first_order_data):
        """Create a delegating model view for one first-order-data copy."""
        self._opm = opm
        parax_data = opm["analysis_results"]["parax_data"]._replace(
            fod=first_order_data,
        )
        self._analysis_results = dict(opm["analysis_results"])
        self._analysis_results["parax_data"] = parax_data

    def __getitem__(self, key):
        """Return replacement analysis results or delegate model indexing."""
        if key == "analysis_results":
            return self._analysis_results
        return self._opm[key]

    def __getattr__(self, name):
        """Delegate attribute access to the original optical model."""
        return getattr(self._opm, name)


def model_view_for_wavelength_opd(opm, wavelength_nm: float):
    """Return a model view whose finite OPD uses traced-wavelength indices."""
    return FirstOrderDataModelView(
        opm,
        first_order_data_for_wavelength(opm, wavelength_nm),
    )
