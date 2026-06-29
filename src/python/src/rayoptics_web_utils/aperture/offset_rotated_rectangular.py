"""Offset and rotation aware rectangular aperture helper."""

from math import cos, radians, sin

from rayoptics.elem.surface import Rectangular


class OffsetRotatedRectangular(Rectangular):
    """Rectangular aperture whose geometry respects offsets and rotation."""

    def _to_local(self, x, y):
        x -= self.x_offset
        y -= self.y_offset
        angle = radians(self.rotation)
        cos_angle = cos(angle)
        sin_angle = sin(angle)
        return (
            x * cos_angle + y * sin_angle,
            -x * sin_angle + y * cos_angle,
        )

    def _to_global(self, x, y):
        angle = radians(self.rotation)
        cos_angle = cos(angle)
        sin_angle = sin(angle)
        return [
            self.x_offset + x * cos_angle - y * sin_angle,
            self.y_offset + x * sin_angle + y * cos_angle,
        ]

    def point_inside(self, x: float, y: float, fuzz: float = 1e-5) -> bool:
        local_x, local_y = self._to_local(x, y)
        return (
            abs(local_x) <= self.x_half_width + fuzz
            and abs(local_y) <= self.y_half_width + fuzz
        )

    def edge_pt_target(self, rel_dir):
        return self._to_global(
            self.x_half_width * rel_dir[0],
            self.y_half_width * rel_dir[1],
        )
