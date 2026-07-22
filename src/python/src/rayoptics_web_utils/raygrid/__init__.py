"""Expose the shared RayGrid factory and image-point resolver."""

from rayoptics_web_utils.raygrid.opd_reference import _resolve_image_point
from rayoptics_web_utils.raygrid.raygrid import make_ray_grid

__all__ = ["make_ray_grid", "_resolve_image_point"]
