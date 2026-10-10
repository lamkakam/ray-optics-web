"""Extract paraxial y-ybar (Delano) diagram data."""

from __future__ import annotations

from typing import TYPE_CHECKING

import rayoptics.optical.model_constants as mc

from rayoptics_web_utils._paraxial_na_workaround import corrected_parax_data
from rayoptics_web_utils.utils import _json_float_list, _system_units

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel


def get_y_ybar_data(opm: OpticalModel) -> dict:
    """Return paraxial marginal- and chief-ray heights for a y-ybar diagram.

    - `y` is the paraxial axial (marginal) ray height and `yBar` the paraxial
      chief ray height at each sequential surface, in surface order.
    - Reads the cached paraxial rays through `corrected_parax_data`, so an
      NA-specified pupil uses the axial ray whose NA equals the spec rather
      than RayOptics 0.9.10's index-doubled one.
    - Omits the object node when the object is at infinity and the image node
      when the image is at infinity (RayOptics `conjugate_type`), because their
      ray heights grow to the `1e10` infinite-distance sentinel.
    - `surfaceLabels` are `"Obj"`, the sequential surface indices `"1"` to
      `"N"` (matching the third-order `surfaceLabels`), and `"Img"`.
    - `unit` is the system length unit of both heights.

    Args:
        opm: RayOptics optical model.

    Returns:
        JSON-serialisable `surfaceLabels`, `y`, `yBar` and `unit`.
    """
    # WORKAROUND(rayoptics 0.9.10 NA bug): read `ax_ray` and `pr_ray` from
    # `opm["analysis_results"]["parax_data"]` again once
    # tests/rayoptics_web_utils/test_rayoptics_paraxial_na_bug.py fails.
    ax_ray, pr_ray, _fod = corrected_parax_data(opm)
    osp = opm["optical_spec"]
    last = len(ax_ray) - 1
    first_node = 1 if osp.conjugate_type("object") == "infinite" else 0
    last_node = last - 1 if osp.conjugate_type("image") == "infinite" else last
    nodes = range(first_node, last_node + 1)

    def label(index: int) -> str:
        if index == 0:
            return "Obj"
        if index == last:
            return "Img"
        return str(index)

    return {
        "surfaceLabels": [label(i) for i in nodes],
        "y": _json_float_list([ax_ray[i][mc.ht] for i in nodes]),
        "yBar": _json_float_list([pr_ray[i][mc.ht] for i in nodes]),
        "unit": _system_units(opm),
    }
