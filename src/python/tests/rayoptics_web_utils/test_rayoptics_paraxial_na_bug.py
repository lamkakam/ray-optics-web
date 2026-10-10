"""Pin RayOptics' NA-specified paraxial aperture bug (RayOptics 0.9.10).

READ THIS IF A TEST HERE FAILS AFTER A RAYOPTICS UPGRADE.

These tests deliberately assert RayOptics' *wrong* behaviour. RayOptics 0.9.10
changed ``etendue.na2slp(na, n)`` to return the reduced slope
``n * tan(asin(NA / n))`` and ``PupilSpec.derive_parax_params`` now passes the
object/image index to it, but ``firstorder.compute_first_order`` still seeds
the paraxial axial ray with that value as an ordinary slope ``u`` and then
multiplies by ``n`` again (``fod.obj_na = n * u``). Image-space NA is further
divided by an air-only reduction ratio.

``rayoptics_web_utils._paraxial_na_workaround`` rescales the paraxial data to
compensate. A failure here most likely means RayOptics fixed the bug upstream.
Then do NOT "fix" these tests; instead delete the workaround:

- ``src/rayoptics_web_utils/_paraxial_na_workaround.py``
- its call sites in ``analysis/first_order.py``, ``analysis/seidel.py``,
  ``analysis/y_ybar.py`` and ``optimization/operands.py`` (marked
  ``WORKAROUND(rayoptics 0.9.10 NA bug)``)
- this test module

and re-check the workaround tests in ``analysis/test_analysis.py`` and
``optimization/test_operands.py`` against the fixed RayOptics.
"""

import math

import pytest
from rayoptics.optical import model_constants as mc
from rayoptics.parax import etendue

NA = 0.9


def _raw_parax_data(opm):
    """Return RayOptics' cached paraxial data without the workaround."""
    return opm["analysis_results"]["parax_data"]


@pytest.mark.parametrize("n_obj", [1.0, 1.5])
def test_object_na_seeds_axial_ray_with_reduced_slope(make_constant_index_singlet, n_obj):
    """RayOptics seeds u0 = n*tan(asin(NA/n)) instead of the paraxial NA/n.

    If this fails, RayOptics has probably fixed the NA bug: remove the
    workaround (see the module docstring) instead of updating this test.
    """
    ax_ray, _, _ = _raw_parax_data(make_constant_index_singlet(("object", "NA"), NA, n_obj=n_obj))

    buggy_slope = n_obj * math.tan(math.asin(NA / n_obj))
    assert etendue.na2slp(NA, n_obj) == pytest.approx(buggy_slope)
    assert ax_ray[0][mc.slp] == pytest.approx(buggy_slope)
    assert ax_ray[0][mc.slp] != pytest.approx(NA / n_obj)


@pytest.mark.parametrize("n_obj", [1.0, 1.5])
def test_object_na_reports_object_index_applied_twice(make_constant_index_singlet, n_obj):
    """Reported object NA is n*n*tan(asin(NA/n)), not the specified NA.

    Even in air (n=1) it reports tan(asin(NA)) rather than NA. If this fails,
    RayOptics has probably fixed the NA bug: remove the workaround (see the
    module docstring) instead of updating this test.
    """
    _, _, fod = _raw_parax_data(make_constant_index_singlet(("object", "NA"), NA, n_obj=n_obj))

    assert fod.obj_na == pytest.approx(n_obj * etendue.na2slp(NA, n_obj))
    assert fod.obj_na != pytest.approx(NA)


@pytest.mark.parametrize("n_obj", [1.0, 1.5])
def test_object_na_error_propagates_to_f_number(make_constant_index_singlet, n_obj):
    """The f/# is too fast by na2slp(NA, n) / (NA / n) versus the EPD equivalent.

    If this fails, RayOptics has probably fixed the NA bug: remove the
    workaround (see the module docstring) instead of updating this test.
    """
    paraxial_slope = NA / n_obj
    na_fod = _raw_parax_data(make_constant_index_singlet(("object", "NA"), NA, n_obj=n_obj)).fod
    epd_fod = _raw_parax_data(
        make_constant_index_singlet(("object", "epd"), 2 * 20.0 * paraxial_slope, n_obj=n_obj)
    ).fod

    assert epd_fod.obj_na == pytest.approx(NA)
    assert na_fod.fno == pytest.approx(
        epd_fod.fno * paraxial_slope / etendue.na2slp(NA, n_obj)
    )


def test_image_na_reports_neither_specified_nor_simply_doubled_index(make_constant_index_singlet):
    """Image NA 0.3 in n=1.5 (object also in n=1.5) reports |NA IMG| ~0.4977.

    The seed is n*tan(asin(NA/n)) and is then divided by the reduction ratio
    ``dk1 + thi0*ck1``, which omits the object-space index. If this fails,
    RayOptics has probably fixed the NA bug: remove the workaround (see the
    module docstring) instead of updating this test.
    """
    _, _, fod = _raw_parax_data(
        make_constant_index_singlet(("image", "NA"), 0.3, n_img=1.5)
    )

    assert abs(fod.img_na) == pytest.approx(0.4977206166, rel=1e-8)
    assert abs(fod.img_na) != pytest.approx(0.3)
