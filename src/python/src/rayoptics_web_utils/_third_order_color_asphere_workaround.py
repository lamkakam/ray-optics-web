"""Let RayOptics 0.9.10's third-order colour package handle aspheric surfaces.

REMOVE WHEN FIXED UPSTREAM. This module works around a RayOptics bug that is
pinned by ``tests/rayoptics_web_utils/test_rayoptics_third_order_color_bugs.py``.
When ``test_aspheric_surface_raises_length_mismatch`` there fails after a
RayOptics upgrade, delete this module, its
``WORKAROUND(rayoptics 0.9.10 third-order colour asphere bug)`` call site in
``analysis/seidel.py``, ``test_third_order_color_asphere_workaround.py`` and
that pinning test.

``thirdorder.compute_third_order_and_color`` labels every row with the seven
types ``S-I``..``S-V``, ``C-I`` and ``C-II``, but the
``aspheric_seidel_contribution`` it calls for conic and ``a4`` surfaces still
returns only the five Seidel values, so pandas raises ``ValueError``. The
fourth-order aspheric term does not change the paraxial rays, so it adds no
primary colour; padding the contribution with two zeros is the exact result.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from rayoptics.parax import thirdorder

if TYPE_CHECKING:
    import pandas as pd
    from rayoptics.optical.opticalmodel import OpticalModel

    from rayoptics_web_utils._finite_opd import FirstOrderDataModelView

_COLOR_TYPE_COUNT = 2


def compute_third_order_and_color_with_aspheres(
    opt_model: OpticalModel | FirstOrderDataModelView,
) -> pd.DataFrame:
    """Return ``compute_third_order_and_color(opt_model)`` for any profile.

    Temporarily replaces ``thirdorder.aspheric_seidel_contribution`` with a
    wrapper that appends zero ``C-I`` and ``C-II`` terms to five-value
    contributions, and restores the original afterwards even on failure.
    Contributions that already have seven values pass through unchanged. The
    patch is not thread-safe; the Pyodide worker and tests run it serially.

    Args:
        opt_model: RayOptics optical model, or a model view such as
            ``corrected_parax_model_view(opm)``.

    Returns:
        RayOptics' third-order and primary colour package: one row per surface,
        aspheric ``"<surface>.asp"`` rows and a ``"sum"`` row, with columns
        ``S-I``..``S-V``, ``C-I`` and ``C-II``.
    """
    upstream_contribution = thirdorder.aspheric_seidel_contribution

    def padded_contribution(*args: Any, **kwargs: Any) -> list[float] | None:
        """Return the upstream contribution padded to seven terms."""
        contribution = upstream_contribution(*args, **kwargs)
        if contribution is None or len(contribution) != 5:
            return contribution
        return [*contribution, *([0.0] * _COLOR_TYPE_COUNT)]

    thirdorder.aspheric_seidel_contribution = padded_contribution
    try:
        return thirdorder.compute_third_order_and_color(opt_model)
    finally:
        thirdorder.aspheric_seidel_contribution = upstream_contribution
