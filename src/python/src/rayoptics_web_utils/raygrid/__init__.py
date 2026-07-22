"""# `python/src/rayoptics_web_utils/raygrid/__init__.py`

Package re-export surface for raygrid helpers.

Exports:

- `make_ray_grid`
- `_resolve_image_point`

raygrid subpackage: RayGrid factory."""

from rayoptics_web_utils.raygrid.opd_reference import _resolve_image_point
from rayoptics_web_utils.raygrid.raygrid import make_ray_grid

__all__ = ["make_ray_grid", "_resolve_image_point"]
