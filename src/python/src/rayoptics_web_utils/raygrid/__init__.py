"""raygrid subpackage: RayGrid factory."""

from rayoptics_web_utils.raygrid.opd_reference import _resolve_opd_image_point
from rayoptics_web_utils.raygrid.raygrid import make_ray_grid

__all__ = ["make_ray_grid", "_resolve_opd_image_point"]
