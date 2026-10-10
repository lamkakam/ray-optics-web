"""Correct RayOptics 0.9.10's paraxial data for NA-specified pupils.

REMOVE WHEN FIXED UPSTREAM. This module works around a RayOptics bug that is
pinned by ``tests/rayoptics_web_utils/test_rayoptics_paraxial_na_bug.py``. When
those tests fail after a RayOptics upgrade, delete this module, its
``WORKAROUND(rayoptics 0.9.10 NA bug)`` call sites in ``analysis/first_order.py``,
``analysis/seidel.py``, ``analysis/y_ybar.py`` and ``optimization/operands.py``,
and the pinning tests.

RayOptics 0.9.10's ``etendue.na2slp(na, n)`` returns the reduced slope
``n * tan(asin(NA / n))``, but ``firstorder.compute_first_order`` seeds the
paraxial axial ray with it as an ordinary slope ``u`` and multiplies by ``n``
again, e.g. ``fod.obj_na = n * u``. Image-space NA is additionally divided by a
reduction ratio that assumes an air object space.

The paraxial axial ray is linear in its seed slope, so the corrected data is the
cached data with the axial ray and every aperture-proportional first-order
quantity rescaled until ``|n * u|`` in the specified space equals the specified
NA, i.e. RayOptics' paraxial convention ``u = NA / n``. The scale is measured
from the cached axial ray rather than derived from the bug, so it becomes
``1.0`` once RayOptics seeds the paraxial slope correctly. RayOptics' cached
``parax_data`` is never mutated: vignetting, pupil-type conversion and other
RayOptics internals remain self-consistent with the uncorrected values.
"""

from __future__ import annotations

import copy
from typing import TYPE_CHECKING

from rayoptics.optical import model_constants as mc

from rayoptics_web_utils._finite_opd import FirstOrderDataModelView

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel
    from rayoptics.parax.firstorder import ParaxData

def na_aperture_scale(opm: OpticalModel) -> float:
    """Return the factor that corrects the cached axial ray of an NA pupil.

    Args:
        opm: RayOptics optical model with current paraxial data.

    Returns:
        ``|NA / (n * u)|`` using the specified space's index and axial-ray slope
        (object: first, image: last), or ``1.0`` for non-NA pupils and zero
        slopes.
    """
    pupil = opm["optical_spec"]["pupil"]
    space, value_key = pupil.key
    if value_key != "NA":
        return 1.0
    ax_ray, _pr_ray, fod = opm["analysis_results"]["parax_data"]
    if space == "object":
        rindex, slope = fod.n_obj, ax_ray[0][mc.slp]
    else:
        rindex, slope = fod.n_img, ax_ray[-1][mc.slp]
    if slope == 0:
        return 1.0
    return abs(float(pupil.value) / (rindex * slope))


def corrected_parax_data(opm: OpticalModel) -> ParaxData:
    """Return the model's paraxial data with the NA aperture bug compensated.

    Returns the cached ``ParaxData`` itself when no correction applies.
    Otherwise returns a copy whose ``ax_ray`` heights, slopes and incidence
    angles are scaled, and whose first-order data copy has ``opt_inv``,
    ``obj_na``, ``img_na``, ``enp_radius`` and ``exp_radius`` scaled and ``fno``
    divided by the scale. RayOptics' ``1e10`` sentinels are kept, using the same
    zero-slope guards as ``compute_first_order``. Aperture-independent values
    such as focal lengths, distances and ``img_ht`` are unchanged.

    Args:
        opm: RayOptics optical model with current paraxial data.

    Returns:
        Paraxial data whose axial ray matches the specified NA.
    """
    parax_data = opm["analysis_results"]["parax_data"]
    scale = na_aperture_scale(opm)
    if scale == 1.0:
        return parax_data

    ax_ray, pr_ray, fod = parax_data
    img = -2 if len(ax_ray) > 2 else -1
    corrected_fod = copy.copy(fod)
    corrected_fod.opt_inv *= scale
    corrected_fod.obj_na *= scale
    corrected_fod.img_na *= scale
    if ax_ray[img][mc.slp] != 0:
        corrected_fod.fno /= scale
    if pr_ray[0][mc.slp] != 0:
        corrected_fod.enp_radius *= scale
    if pr_ray[-1][mc.slp] != 0:
        corrected_fod.exp_radius *= scale
    scaled_ax_ray = [[value * scale for value in ray] for ray in ax_ray]
    return parax_data._replace(ax_ray=scaled_ax_ray, fod=corrected_fod)


def corrected_parax_model_view(opm: OpticalModel) -> FirstOrderDataModelView:
    """Return a read-only model view exposing ``corrected_parax_data(opm)``.

    Use it for RayOptics functions such as ``compute_third_order`` that read
    ``opm["analysis_results"]["parax_data"]`` internally.

    Args:
        opm: RayOptics optical model with current paraxial data.

    Returns:
        Delegating model view with corrected paraxial data.
    """
    return FirstOrderDataModelView(opm, corrected_parax_data(opm))
