"""Pin RayOptics' ``compute_third_order_and_color`` bugs (RayOptics 0.9.10).

READ THIS IF A TEST HERE FAILS AFTER A RAYOPTICS UPGRADE.

These tests deliberately assert RayOptics' *wrong* behaviour:

- ``aspheric_seidel_contribution`` still returns the five Seidel values, but
  ``compute_third_order_and_color`` builds its aspheric row with the seven-entry
  ``S-I``..``S-V``, ``C-I``, ``C-II`` index, so any conic or ``a4`` surface
  raises ``ValueError``. ``rayoptics_web_utils._third_order_color_asphere_workaround``
  pads the contribution with zero colour terms. If
  ``test_aspheric_surface_raises_length_mismatch`` fails, delete that module,
  its ``WORKAROUND(rayoptics 0.9.10 third-order colour asphere bug)`` call site
  in ``analysis/seidel.py``, its tests in
  ``test_third_order_color_asphere_workaround.py`` and that pinning test.
- The index difference after each surface is only taken for more than two
  wavelengths (object space uses more than one), so two-wavelength systems
  report all-zero ``C-I`` and ``C-II``. The Seidel modal explains this in a note.
  If ``test_two_wavelengths_report_zero_color`` fails, update that note in
  ``SeidelAberrModal.tsx`` and delete this test.
"""

import pytest
from rayoptics.parax.thirdorder import compute_third_order_and_color

TWO_WAVELENGTHS = ((486.133, 1), (656.273, 1))


def test_aspheric_surface_raises_length_mismatch(make_cooke_triplet):
    """An aspheric surface breaks the seven-column colour package.

    If this fails, RayOptics has probably fixed the bug: remove the workaround
    (see the module docstring) instead of updating this test.
    """
    with pytest.raises(ValueError, match="does not match length of index"):
        compute_third_order_and_color(make_cooke_triplet(asphere=True))


def test_two_wavelengths_report_zero_color(make_cooke_triplet):
    """Two wavelengths give zero C-I and C-II for an air-spaced triplet.

    If this fails, RayOptics has probably fixed the bug: update the modal note
    (see the module docstring) instead of updating this test.
    """
    to_pkg = compute_third_order_and_color(make_cooke_triplet(wvls=TWO_WAVELENGTHS))

    assert (to_pkg[["C-I", "C-II"]] == 0.0).all().all()
