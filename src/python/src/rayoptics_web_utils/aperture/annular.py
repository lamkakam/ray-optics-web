"""Annular aperture helper."""

from math import sqrt

from rayoptics.elem.surface import Aperture


class Annular(Aperture):
    """Circular clear aperture with a centered circular obstruction."""

    def __init__(self, radius=1.0, obstruction_radius=0.5, **kwargs):
        super().__init__(**kwargs)
        self.radius = radius
        self.obstruction_radius = obstruction_radius
        self._validate_obstruction_radius()

    def _validate_obstruction_radius(self):
        if self.obstruction_radius <= 0 or self.obstruction_radius >= self.radius:
            raise ValueError("obstruction_radius must be greater than 0 and smaller than radius")

    def listobj_str(self):
        o_str = f"ca: annular radius={self.radius} obstruction_radius={self.obstruction_radius}\n"
        o_str += super().listobj_str()
        return o_str

    def dimension(self):
        return (self.radius, self.radius)

    def set_dimension(self, x, y):
        self.radius = x
        self._validate_obstruction_radius()

    def max_dimension(self):
        return self.radius

    def point_inside(self, x: float, y: float, fuzz: float = 1e-5) -> bool:
        x, y = self.tform(x, y)
        radius = sqrt(x * x + y * y)
        return self.obstruction_radius - fuzz <= radius <= self.radius + fuzz

    def edge_pt_target(self, rel_dir):
        return [
            self.x_offset + self.radius * rel_dir[0],
            self.y_offset + self.radius * rel_dir[1],
        ]

    def apply_scale_factor(self, scale_factor):
        super().apply_scale_factor(scale_factor)
        self.radius *= scale_factor
        self.obstruction_radius *= scale_factor
