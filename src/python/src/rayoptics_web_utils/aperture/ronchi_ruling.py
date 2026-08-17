"""Provide a binary geometric Ronchi ruling and safe vignetting setup.

The aperture is a ray-blocking mask only. It does not model diffraction,
partial transmission, intensity, or a Ronchigram analysis. Vignetting setup
uses only the ruling's circular outer envelope so RayOptics does not mistake an
internal opaque band for the pupil rim.
"""

from math import cos, hypot, isfinite, radians, remainder, sin, ulp

from rayoptics.elem.surface import Aperture
from rayoptics.raytr.vigcalc import set_vig as _rayoptics_set_vig


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
        # x and y are in the surface's local right-handed frame, where X × Y = Z.
        dx = x - self.x_offset
        dy = y - self.y_offset
        if hypot(dx, dy) > self.radius + fuzz:
            return False

        angle = radians(self.rotation)
        # At 0° the lines run along +Y. Positive rotation turns them
        # toward +X, clockwise when viewed from +Z toward the surface.
        # This dot product is the signed projection of the offset point onto the
        # axis across the lines.
        coordinate_across_lines = cos(angle) * dx - sin(angle) * dy
        # pitch = 1 / lpmm is one complete clear-plus-opaque line-pair period.
        pitch = 1 / self.lpmm
        # remainder wraps the coordinate to the nearest period center.
        wrapped_distance = abs(remainder(coordinate_across_lines, pitch))
        # The clear band is pitch / 2 wide, so each boundary is pitch / 4 from
        # its center. 4 * ulp(pitch) covers the few rounding steps in calculating
        # pitch, wrapping the coordinate, and boundary arithmetic. The factor four
        # allows this safety margin without meaningfully widening the clear band.
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


class _RonchiEnvelope(Aperture):
    """Temporary clear circle used only while RayOptics sizes vignetting."""

    def __init__(self, ruling):
        super().__init__(
            x_offset=ruling.x_offset,
            y_offset=ruling.y_offset,
            rotation=ruling.rotation,
        )
        self.radius = ruling.radius

    def point_inside(self, x: float, y: float, fuzz: float = 1e-5) -> bool:
        """Check only the translated circular envelope, not ruling bands."""
        return hypot(x - self.x_offset, y - self.y_offset) <= self.radius + fuzz

    def edge_pt_target(self, rel_dir):
        """Target the translated circular envelope for pupil-edge aiming."""
        return [
            self.x_offset + self.radius * rel_dir[0],
            self.y_offset + self.radius * rel_dir[1],
        ]


def set_vig_with_ronchi_envelopes(opm, set_vig_fn=None):
    """Calculate vignetting without treating opaque bands as pupil edges.

    Each ``RonchiRuling`` in an interface's clear-aperture list is temporarily
    replaced by an offset-aware clear circular envelope. Other apertures retain
    their identity and order. The original lists are restored in ``finally``,
    including when the injected or RayOptics vignetting function raises.

    Args:
        opm: RayOptics optical model to update.
        set_vig_fn: Optional vignetting function for dependency injection.

    Returns:
        The return value of the selected vignetting function.
    """
    calculate_vignetting = _rayoptics_set_vig if set_vig_fn is None else set_vig_fn
    replaced_aperture_lists = []

    for interface in opm["seq_model"].ifcs:
        original_apertures = interface.clear_apertures
        if any(isinstance(aperture, RonchiRuling) for aperture in original_apertures):
            replaced_aperture_lists.append((interface, original_apertures))
            interface.clear_apertures = [
                _RonchiEnvelope(aperture)
                if isinstance(aperture, RonchiRuling)
                else aperture
                for aperture in original_apertures
            ]

    try:
        return calculate_vignetting(opm)
    finally:
        for interface, original_apertures in replaced_aperture_lists:
            interface.clear_apertures = original_apertures
