"""Provide an offset-aware circular aperture target."""

from rayoptics.elem.surface import Circular


class OffsetCircular(Circular):
    """Circular aperture whose edge targets include the aperture offset.

    RayOptics `Circular.point_inside()` already applies the aperture transform and remains correct for offset apertures. Its `edge_pt_target()` ignores offsets, so this subclass overrides only that method.
    - Inherits construction, offset storage, transforms, and `point_inside()` from `rayoptics.elem.surface.Circular`.
    - `edge_pt_target(rel_dir)` returns a two-item list:
      - `x_offset + radius * rel_dir[0]`
      - `y_offset + radius * rel_dir[1]`
    - Expects `rel_dir` to provide at least two numeric entries, matching the base class contract."""

    def edge_pt_target(self, rel_dir):
        """Return an aperture edge target shifted by x/y offsets."""
        return [
            self.x_offset + self.radius * rel_dir[0],
            self.y_offset + self.radius * rel_dir[1],
        ]
