"""Define coordinates for an offset, rotated rectangular aperture.

## Coordinate Convention

- Global coordinates are RayOptics surface coordinates: `x` and `y` are transverse surface coordinates and `z` is the optical axis.
- `x_offset` and `y_offset` are aperture-center offsets in the RayOptics surface `x` and `y` directions.
- The rectangle-local frame has its origin at `(x_offset, y_offset)`. Its unrotated local `+x` axis corresponds to `x_half_width`; its unrotated local `+y` axis corresponds to `y_half_width`.
- `rotation` is an in-plane angle in degrees, measured from the RayOptics surface `+x` axis toward the surface `+y` axis. Equivalently, it is a positive rotation about the surface `+z` axis.
- This is consistent with RayOptics decenter/tilt coordinates for the surface frame. RayOptics' `DecenterData` uses `dec = [x, y, z]`; its Euler `gamma` is the comparable rotation about `z`. RayOptics applies optical-design sign handling to `alpha` and `beta`, but not to `gamma`.
- For the usual RayOptics field convention where the meridional plane is the `y-z` plane, surface `x` is the sagittal direction and surface `y` is the tangential/meridional direction.

"""

from math import cos, radians, sin, sqrt

from rayoptics.elem.surface import Rectangular


class OffsetRotatedRectangular(Rectangular):
    """Rectangular aperture whose geometry respects offsets and rotation.

    - Constructor behavior is inherited from `rayoptics.elem.surface.Rectangular`; accepted keyword arguments include `x_half_width`, `y_half_width`, `x_offset`, `y_offset`, and `rotation`.
    - `rotation` is interpreted in degrees.
    - `point_inside(x, y, fuzz)` subtracts `x_offset` and `y_offset`, inverse-rotates the point into the rectangle's local coordinates, and checks against `x_half_width` and `y_half_width` with fuzz.
    - `edge_pt_target(rel_dir)` computes the local edge target from the half widths, rotates it into global coordinates, and then adds offsets.
    - The private coordinate helpers include inline comments describing the surface-origin global frame, aperture-centered rectangle-local frame, global-to-local transform, local-to-global transform, and rotated corner-vector calculation.
    - `set_dimension(x, y)` preserves RayOptics-compatible direct resizing for non-equal values by assigning `abs(x)` to `x_half_width` and `abs(y)` to `y_half_width`.
    - When `set_dimension(x, y)` is called with equal values, it treats `abs(x)` as a target radius from the surface origin to the farthest rotated, offset rectangle corner. It uniformly scales the current half widths so the existing half-width ratio is preserved.
    - Equal-value `set_dimension` computes all four rotated corner vectors and solves for the scale where `max(||offset + scale * corner||)` reaches the target radius. If the target is at or inside the offset radius, the aperture clamps to zero size while leaving offsets and rotation unchanged.
    - `apply_scale_factor(scale_factor)` is inherited from `Rectangular`, which scales offsets and half widths while leaving rotation unchanged."""

    def _to_local(self, x, y):
        # RayOptics passes points in the global surface coordinate frame, whose
        # origin is the surface origin. The rectangular aperture center is
        # (x_offset, y_offset) in that frame. The rectangle-local frame has its
        # origin at that aperture center, with axes aligned to the unrotated
        # x_half_width and y_half_width directions. Translate to the aperture
        # center, then undo the rectangle rotation so containment can be tested
        # against the axis-aligned local half widths.
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
        # The input point is in the rectangle-local frame: origin at the
        # aperture center, +x along x_half_width, and +y along y_half_width.
        # Rotate it into the global surface axes, then translate by the aperture
        # center offset to recover the absolute surface coordinate.
        angle = radians(self.rotation)
        cos_angle = cos(angle)
        sin_angle = sin(angle)
        return [
            self.x_offset + x * cos_angle - y * sin_angle,
            self.y_offset + x * sin_angle + y * cos_angle,
        ]

    def _rotated_corner_vectors(self, x_half_width, y_half_width):
        # Start from the four rectangle-local corners:
        # (+/-x_half_width, +/-y_half_width). Rotate each around the local
        # origin, but do not add x_offset/y_offset; the result remains a vector
        # from the aperture center. set_dimension() combines these with
        # offset + scale * vector when solving for the farthest absolute corner.
        angle = radians(self.rotation)
        cos_angle = cos(angle)
        sin_angle = sin(angle)
        return [
            (
                rel_x * x_half_width * cos_angle - rel_y * y_half_width * sin_angle,
                rel_x * x_half_width * sin_angle + rel_y * y_half_width * cos_angle,
            )
            for rel_x in (-1, 1)
            for rel_y in (-1, 1)
        ]

    def set_dimension(self, x, y):
        if x != y:
            self.x_half_width = abs(x)
            self.y_half_width = abs(y)
            return

        target = abs(x)
        x_half_width = abs(self.x_half_width)
        y_half_width = abs(self.y_half_width)
        corner_radius_sq = x_half_width * x_half_width + y_half_width * y_half_width
        if corner_radius_sq == 0:
            self.x_half_width = 0
            self.y_half_width = 0
            return

        offset_radius_sq = self.x_offset * self.x_offset + self.y_offset * self.y_offset
        if target * target <= offset_radius_sq:
            scale = 0
        else:
            max_projection = max(
                self.x_offset * corner_x + self.y_offset * corner_y
                for corner_x, corner_y in self._rotated_corner_vectors(
                    x_half_width,
                    y_half_width,
                )
            )
            discriminant = max_projection * max_projection + corner_radius_sq * (
                target * target - offset_radius_sq
            )
            scale = (-max_projection + sqrt(max(discriminant, 0))) / corner_radius_sq

        scale = max(scale, 0)
        self.x_half_width = x_half_width * scale
        self.y_half_width = y_half_width * scale

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
