"""Offset-aware circular aperture target helper."""

from rayoptics.elem.surface import Circular


class OffsetCircular(Circular):
    """Circular aperture whose edge targets include the aperture offset."""

    def edge_pt_target(self, rel_dir):
        """Return an aperture edge target shifted by x/y offsets."""
        return [
            self.x_offset + self.radius * rel_dir[0],
            self.y_offset + self.radius * rel_dir[1],
        ]
