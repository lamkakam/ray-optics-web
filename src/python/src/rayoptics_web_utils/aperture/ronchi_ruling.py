"""Provide a binary geometric Ronchi ruling clear aperture.

The aperture is a ray-blocking mask only. It does not model diffraction,
partial transmission, intensity, or a Ronchigram analysis.
"""

from math import cos, hypot, isfinite, radians, remainder, sin, ulp

from rayoptics.elem.surface import Aperture


def _require_finite(name, value):
    """Raise ``ValueError`` unless *value* is a finite real number."""
    try:
        finite = isfinite(value)
    except TypeError as error:
        raise ValueError(f"{name} must be a finite number") from error
    if not finite:
        raise ValueError(f"{name} must be a finite number")


def _require_positive_finite(name, value):
    """Raise ``ValueError`` unless *value* is finite and greater than zero."""
    _require_finite(name, value)
    if value <= 0:
        raise ValueError(f"{name} must be greater than zero")


class RonchiRuling(Aperture):
    """Circular binary ruling made from equal-width clear and opaque bands.

    - ``radius`` is the circular outer-envelope radius in surface units and
      must be positive and finite.
    - ``lpmm`` is the positive finite line-pair density in cycles per
      millimetre. The pitch is ``1 / lpmm``; each clear and opaque band has
      width ``pitch / 2``.
    - ``rotation`` is a finite angle in degrees. At zero degrees the lines are
      vertical and repeat along surface X. Positive rotation turns the line
      direction toward surface +X.
    - ``x_offset`` and ``y_offset`` are finite translations shared by the
      circular envelope and ruling origin.
    - ``point_inside(x, y, fuzz)`` accepts points inside the translated circular
      envelope whose wrapped distance to a period centre is no more than one
      quarter pitch. ``fuzz`` expands both boundaries; a few pitch ULPs avoid
      rejecting mathematically exact repeated boundaries after float wrapping.
    - ``dimension()`` returns ``(radius, radius)`` and ``max_dimension()``
      returns ``radius``.
    - ``set_dimension(x, y)`` changes only ``radius`` from positive finite
      ``x`` so RayOptics automatic aperture sizing preserves density, rotation,
      and offsets.
    - ``edge_pt_target(rel_dir)`` targets the translated circular envelope.
    - ``apply_scale_factor(scale_factor)`` scales the outer radius and offsets
      while preserving ``lpmm`` and ``rotation``.
    """

    def __init__(
        self,
        radius=1.0,
        lpmm=10.0,
        rotation=0.0,
        x_offset=0.0,
        y_offset=0.0,
    ):
        _require_positive_finite("radius", radius)
        _require_positive_finite("lpmm", lpmm)
        _require_finite("rotation", rotation)
        _require_finite("x_offset", x_offset)
        _require_finite("y_offset", y_offset)
        super().__init__(
            x_offset=x_offset,
            y_offset=y_offset,
            rotation=rotation,
        )
        self.radius = radius
        self.lpmm = lpmm

    def listobj_str(self):
        """Return RayOptics' object-list representation for the ruling."""
        o_str = f"ca: Ronchi radius={self.radius} lpmm={self.lpmm}\n"
        o_str += super().listobj_str()
        return o_str

    def dimension(self):
        """Return the circular envelope half dimensions."""
        return (self.radius, self.radius)

    def set_dimension(self, x, y):
        """Set only the circular envelope radius from the X dimension."""
        _require_positive_finite("radius", x)
        self.radius = x

    def max_dimension(self):
        """Return the circular envelope radius."""
        return self.radius

    def point_inside(self, x: float, y: float, fuzz: float = 1e-5) -> bool:
        """Return whether a surface point lies in a clear ruling band."""
        dx = x - self.x_offset
        dy = y - self.y_offset
        if hypot(dx, dy) > self.radius + fuzz:
            return False

        angle = radians(self.rotation)
        u = cos(angle) * dx - sin(angle) * dy
        pitch = 1 / self.lpmm
        wrapped_distance = abs(remainder(u, pitch))
        return wrapped_distance <= pitch / 4 + fuzz + 4 * ulp(pitch)

    def edge_pt_target(self, rel_dir):
        """Return a target on the translated circular outer envelope."""
        return [
            self.x_offset + self.radius * rel_dir[0],
            self.y_offset + self.radius * rel_dir[1],
        ]

    def apply_scale_factor(self, scale_factor):
        """Scale the envelope and offsets without changing ruling density."""
        super().apply_scale_factor(scale_factor)
        self.radius *= scale_factor
