"""Resolve physical optical specifications with exact real rays.

``ExactOpticalModel`` preserves RayOptics' requested pupil key/value for
paraxial first-order reporting while resolving a separate physical launch after
every ``update_model()``.  Image-space geometric F-number is solved from the
real angle between the axial chief and +Y marginal rays.  Object-space
numerical aperture is converted with the reference-wavelength object index.

``ExactImageHeightFieldSpec`` treats every image-height sample as a requested
local image-surface intersection.  It continues a reverse real chief ray from
the axial solution through the physical stop centre, then forward retraces the
result before exposing object-space launch coordinates.  Centred meridional
targets are solved in their one physical degree of freedom so their
identically-zero sagittal residual cannot make the numerical Jacobian
singular.

All final residuals use a combined relative/absolute tolerance of ``1e-9``.
Clear apertures are ignored while resolving specifications; later vignetting is
responsible for physical aperture clipping.  Missed profiles, total internal
reflection, unreachable targets, and non-converged numerical solves raise an
exact-spec exception and never fall back to a paraxial launch.
"""

import math

import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.optical.opticalmodel import OpticalModel
from rayoptics.raytr import raytrace
from rayoptics.raytr.opticalspec import Field, FieldSpec, OpticalSpecs
from rayoptics.raytr.trace import trace_base
from rayoptics.raytr.traceerror import (
    TraceError,
    TraceMissedSurfaceError,
    TraceTIRError,
)
from scipy.optimize import least_squares, root_scalar


EXACT_SPEC_RELATIVE_TOLERANCE = 1.0e-9
EXACT_SPEC_ABSOLUTE_TOLERANCE = 1.0e-9
_ROOT_X_TOLERANCE = 1.0e-12
_ROOT_RELATIVE_TOLERANCE = 1.0e-12
_MAX_SCALAR_CONTINUATION_STEPS = 256
_MIN_VECTOR_CONTINUATION_SUBDIVISIONS = 8
_MAX_IMAGE_HEIGHT_CONTINUATION_STEP = 0.1


def _least_squares_vector_solver(residual, initial, *, method=None, options=None):
    """Solve a real-ray vector residual with strict trust-region tolerances."""
    del method
    options = options or {}
    return least_squares(
        residual,
        initial,
        xtol=float(options.get("xtol", _ROOT_X_TOLERANCE)),
        ftol=_ROOT_X_TOLERANCE,
        gtol=_ROOT_X_TOLERANCE,
        max_nfev=int(options.get("maxfev", 400)),
    )


class ExactSpecError(ValueError):
    """Base error for an invalid or unreachable exact optical specification."""


class ExactSpecTraceError(ExactSpecError):
    """A required physical specification ray failed to traverse the model."""


class ExactSpecConvergenceError(ExactSpecError):
    """A required exact-spec root solve did not converge to tolerance."""


def _normalize(vector):
    """Return ``vector`` normalized, rejecting a zero or non-finite norm."""
    vector = np.asarray(vector, dtype=float)
    magnitude = float(np.linalg.norm(vector))
    if not math.isfinite(magnitude) or magnitude == 0.0:
        raise ExactSpecError("Exact real-ray direction must be finite and nonzero")
    return vector / magnitude


def _angle_between(first, second):
    """Return the unsigned angle between two ray directions."""
    first = _normalize(first)
    second = _normalize(second)
    cosine = float(np.clip(np.dot(first, second), -1.0, 1.0))
    return math.acos(cosine)


def _raise_trace_error(error, context):
    """Translate a RayOptics trace failure into a stable exact-spec error."""
    surface = getattr(error, "surf", None)
    suffix = "" if surface is None else f" at surface {surface}"
    if isinstance(error, TraceTIRError):
        detail = f"total internal reflection{suffix}"
    elif isinstance(error, TraceMissedSurfaceError):
        detail = f"missed surface{suffix}"
    else:
        detail = f"{type(error).__name__}{suffix}"
    raise ExactSpecTraceError(
        f"{context} failed because the real ray encountered {detail}"
    ) from error


def _stop_index_and_center(seq_model):
    """Return the physical stop index and its local aperture centre."""
    stop_index = 1 if seq_model.stop_surface is None else seq_model.stop_surface
    stop_interface = seq_model.ifcs[stop_index]
    centre = np.array([0.0, 0.0], dtype=float)
    clear_apertures = getattr(stop_interface, "clear_apertures", None)
    if clear_apertures:
        aperture = clear_apertures[0]
        centre = np.array(
            [
                float(getattr(aperture, "x_offset", 0.0)),
                float(getattr(aperture, "y_offset", 0.0)),
            ],
            dtype=float,
        )
    return stop_index, centre


def _is_close(actual, expected):
    """Return whether scalar or vector residuals meet the exact-spec tolerance."""
    return bool(
        np.allclose(
            actual,
            expected,
            rtol=EXACT_SPEC_RELATIVE_TOLERANCE,
            atol=EXACT_SPEC_ABSOLUTE_TOLERANCE,
        )
    )


class ExactOpticalSpecs(OpticalSpecs):
    """Optical specs whose real-ray launches use the model's resolved pupil."""

    def update_optical_properties(self, **kwargs):
        """Keep exact image-height chief rays independent of paraxial aiming."""
        if not isinstance(self["fov"], ExactImageHeightFieldSpec):
            return super().update_optical_properties(**kwargs)

        do_aiming = self.do_aiming
        self.do_aiming = False
        try:
            return super().update_optical_properties(**kwargs)
        finally:
            self.do_aiming = do_aiming

    def ray_start_from_osp(self, pupil, fld, pupil_type):
        """Return an exact physical start when the pupil requires resolution."""
        if pupil_type != "rel pupil":
            return super().ray_start_from_osp(pupil, fld, pupil_type)

        opm = self.opt_model
        pupil_key = self["pupil"].key
        exact_image_field = isinstance(self["fov"], ExactImageHeightFieldSpec)

        if pupil_key == ("object", "NA"):
            tangent = opm._resolved_object_na_tangent
            if tangent is None:
                return super().ray_start_from_osp(pupil, fld, pupil_type)
            return self._start_from_exact_object_na(pupil, fld, tangent)

        if pupil_key == ("image", "f/#"):
            object_epd = opm._resolved_object_epd
            if object_epd is None:
                return super().ray_start_from_osp(pupil, fld, pupil_type)
            return self._start_from_object_epd(pupil, fld, object_epd)

        if exact_image_field and pupil_key == ("object", "epd"):
            return self._start_from_object_epd(
                pupil,
                fld,
                float(self["pupil"].value),
            )

        return super().ray_start_from_osp(pupil, fld, pupil_type)

    def _start_from_object_epd(self, pupil, fld, object_epd):
        """Launch through an exact-chief-centred object-space pupil plane."""
        point, chief_direction = self.obj_coords(fld)
        point = np.asarray(point, dtype=float)
        chief_direction = _normalize(chief_direction)
        pupil = np.asarray(pupil, dtype=float)

        if (
            isinstance(self["fov"], ExactImageHeightFieldSpec)
            and self.conjugate_type("object") == "infinite"
        ):
            x_axis, y_axis = self._transverse_axes(chief_direction)
            shifted_point = point + 0.5 * object_epd * (
                pupil[0] * x_axis + pupil[1] * y_axis
            )
            return shifted_point, chief_direction

        paraxial_data = self.opt_model["analysis_results"]["parax_data"]
        if paraxial_data is None:
            raise ExactSpecError(
                "Exact object-space pupil launch requires current first-order data"
            )
        pupil_plane_z = float(
            paraxial_data.fod.obj_dist + paraxial_data.fod.enp_dist
        )
        if abs(float(chief_direction[2])) <= np.finfo(float).eps:
            raise ExactSpecError(
                "Exact chief ray cannot reach the object-space pupil plane"
            )

        distance = (pupil_plane_z - point[2]) / chief_direction[2]
        pupil_centre = point + distance * chief_direction
        pupil_target = np.array(
            [
                pupil_centre[0] + 0.5 * object_epd * pupil[0],
                pupil_centre[1] + 0.5 * object_epd * pupil[1],
                pupil_plane_z,
            ],
            dtype=float,
        )
        return point, _normalize(pupil_target - point)

    def _start_from_exact_object_na(self, pupil, fld, tangent):
        """Launch a rotational cone with the exact object-space NA tangent."""
        point, chief_direction = self.obj_coords(fld)
        chief_direction = _normalize(chief_direction)
        pupil = np.asarray(pupil, dtype=float)

        x_axis, y_axis = self._transverse_axes(chief_direction)
        direction = chief_direction + tangent * (
            pupil[0] * x_axis + pupil[1] * y_axis
        )
        return np.asarray(point, dtype=float), _normalize(direction)

    @staticmethod
    def _transverse_axes(chief_direction):
        """Return object-local +X/+Y axes orthogonal to ``chief_direction``."""
        x_reference = np.array([1.0, 0.0, 0.0], dtype=float)
        x_axis = x_reference - np.dot(x_reference, chief_direction) * chief_direction
        if np.linalg.norm(x_axis) <= np.finfo(float).eps:
            x_reference = np.array([0.0, 1.0, 0.0], dtype=float)
            x_axis = (
                x_reference
                - np.dot(x_reference, chief_direction) * chief_direction
            )
        x_axis = _normalize(x_axis)
        y_axis = _normalize(np.cross(chief_direction, x_axis))
        return x_axis, y_axis


class ExactImageHeightFieldSpec(FieldSpec):
    """Image-height field specification backed by reverse real chief rays."""

    def __init__(self, *args, vector_solver=None, **kwargs):
        """Initialize the field and injectable vector root solver."""
        self._vector_solver = vector_solver or _least_squares_vector_solver
        self._object_launches = {}
        self._coordinate_launches = {}
        super().__init__(*args, **kwargs)

    def update_model(self, **kwargs):
        """Clear stale field state and re-resolve every requested image point."""
        super().update_model(**kwargs)
        if self.key != ("image", "height"):
            raise ExactSpecError(
                "ExactImageHeightFieldSpec requires key ('image', 'height')"
            )
        if self.optical_spec.conjugate_type("object") == "infinite":
            self.is_wide_angle = True
        self._resolve_all_fields()
        return self

    def obj_coords(self, fld):
        """Return the verified object-space launch for ``fld``."""
        if self.key != ("image", "height"):
            return super().obj_coords(fld)

        launch = self._object_launches.get(id(fld))
        if launch is None:
            coordinate = self._absolute_field_coordinate(fld)
            launch = self._coordinate_launches.get(self._coordinate_key(coordinate))
        if launch is None:
            launch = self._solve_coordinate_from_axis(
                self._absolute_field_coordinate(fld)
            )
        point, direction = launch
        return np.array(point, copy=True), np.array(direction, copy=True)

    def _absolute_field_coordinate(self, fld):
        """Return the requested local image-surface x/y intersection."""
        return np.array([float(fld.xv), float(fld.yv)], dtype=float)

    @staticmethod
    def _coordinate_key(coordinate):
        """Return a stable lookup key for a solved image coordinate."""
        return tuple(float(value) for value in coordinate)

    def _resolve_all_fields(self):
        """Resolve fields in radial order using real-ray continuation."""
        self._object_launches = {}
        self._coordinate_launches = {}
        if len(self.fields) == 0:
            return

        axial_tangent, axial_launch = self._solve_reverse_direction(
            np.array([0.0, 0.0], dtype=float),
            np.array([0.0, 0.0], dtype=float),
        )
        axial_key = self._coordinate_key(np.array([0.0, 0.0]))
        self._coordinate_launches[axial_key] = axial_launch

        previous_coordinate = np.array([0.0, 0.0], dtype=float)
        previous_tangent = axial_tangent
        ordered_fields = sorted(
            self.fields,
            key=lambda field: float(
                np.linalg.norm(self._absolute_field_coordinate(field))
            ),
        )
        for field in ordered_fields:
            coordinate = self._absolute_field_coordinate(field)
            key = self._coordinate_key(coordinate)
            if key in self._coordinate_launches:
                launch = self._coordinate_launches[key]
            else:
                previous_tangent, launch = self._continue_reverse_solution(
                    previous_coordinate,
                    coordinate,
                    previous_tangent,
                )
                previous_coordinate = coordinate
                self._coordinate_launches[key] = launch
            self._object_launches[id(field)] = launch

    def _solve_coordinate_from_axis(self, coordinate):
        """Solve an ad-hoc field coordinate from the cached axial real ray."""
        axial_key = self._coordinate_key(np.array([0.0, 0.0]))
        if axial_key not in self._coordinate_launches:
            _, axial_launch = self._solve_reverse_direction(
                np.array([0.0, 0.0], dtype=float),
                np.array([0.0, 0.0], dtype=float),
            )
            self._coordinate_launches[axial_key] = axial_launch
        tangent, launch = self._continue_reverse_solution(
            np.array([0.0, 0.0], dtype=float),
            coordinate,
            np.array([0.0, 0.0], dtype=float),
        )
        del tangent
        self._coordinate_launches[self._coordinate_key(coordinate)] = launch
        return launch

    def _continue_reverse_solution(
        self,
        start_coordinate,
        target_coordinate,
        initial_tangent,
    ):
        """Continue a verified real reverse ray to ``target_coordinate``."""
        tangent = np.asarray(initial_tangent, dtype=float)
        launch = None
        continuation_distance = float(
            np.linalg.norm(target_coordinate - start_coordinate)
        )
        subdivisions = max(
            _MIN_VECTOR_CONTINUATION_SUBDIVISIONS,
            math.ceil(
                continuation_distance / _MAX_IMAGE_HEIGHT_CONTINUATION_STEP
            ),
        )
        for fraction in np.linspace(
            0.0,
            1.0,
            subdivisions + 1,
        )[1:]:
            coordinate = (
                start_coordinate
                + fraction * (target_coordinate - start_coordinate)
            )
            tangent, launch = self._solve_reverse_direction(coordinate, tangent)
        if launch is None:
            tangent, launch = self._solve_reverse_direction(
                target_coordinate,
                tangent,
            )
        return tangent, launch

    def _solve_reverse_direction(self, image_coordinate, initial_tangent):
        """Solve a reverse real direction through the physical stop centre.

        A centred Y-only target has no sagittal degree of freedom in a centred
        system.  Detect that symmetry from the current real-ray residual and
        solve only its tangential component, while retaining the full
        two-dimensional residual verification below.
        """
        opm = self.optical_spec.opt_model
        seq_model = opm["seq_model"]
        wavelength = self.optical_spec["wvls"].central_wvl
        stop_index, stop_centre = _stop_index_and_center(seq_model)
        reverse_path = list(
            seq_model.reverse_path(
                wl=wavelength,
                start=len(seq_model.ifcs),
                stop=None,
                step=-1,
            )
        )
        reverse_stop_index = len(seq_model.ifcs) - stop_index - 1
        z_sign = float(reverse_path[0][mc.Zdir])
        image_point = self._image_surface_point(image_coordinate)
        last_reverse_ray = None

        def residual(tangent):
            nonlocal last_reverse_ray
            direction = _normalize([tangent[0], tangent[1], z_sign])
            try:
                reverse_ray = raytrace.trace_raw(
                    iter(reverse_path),
                    image_point,
                    direction,
                    wavelength,
                    check_apertures=False,
                    intersect_obj=False,
                )
            except TraceError as error:
                _raise_trace_error(error, "Exact image-height reverse trace")
            last_reverse_ray = reverse_ray
            stop_point = np.asarray(
                reverse_ray[mc.ray][reverse_stop_index][mc.p],
                dtype=float,
            )
            return stop_point[:2] - stop_centre

        initial_tangent = np.asarray(initial_tangent, dtype=float)
        meridional_tangent = np.array(
            [0.0, float(initial_tangent[1])],
            dtype=float,
        )
        initial_meridional_residual = residual(meridional_tangent)
        is_centred_meridional = (
            _is_close(image_coordinate[0], 0.0)
            and _is_close(stop_centre[0], 0.0)
            and _is_close(initial_tangent[0], 0.0)
            and _is_close(initial_meridional_residual[0], 0.0)
        )

        if is_centred_meridional:

            def meridional_residual(tangent):
                tangent = np.atleast_1d(tangent)
                return np.array(
                    [residual([0.0, float(tangent[0])])[1]],
                    dtype=float,
                )

            result = self._vector_solver(
                meridional_residual,
                np.array([meridional_tangent[1]], dtype=float),
                method="hybr",
                options={"xtol": _ROOT_X_TOLERANCE, "maxfev": 400},
            )
        else:
            result = self._vector_solver(
                residual,
                initial_tangent,
                method="hybr",
                options={"xtol": _ROOT_X_TOLERANCE, "maxfev": 400},
            )

        if not bool(getattr(result, "success", False)):
            raise ExactSpecConvergenceError(
                "Exact image-height reverse solve did not converge for "
                f"image coordinate {image_coordinate.tolist()}: "
                f"{getattr(result, 'message', 'unknown solver failure')}"
            )

        if is_centred_meridional:
            final_tangent = np.array(
                [0.0, float(np.atleast_1d(result.x)[0])],
                dtype=float,
            )
        else:
            final_tangent = np.asarray(result.x, dtype=float)
        final_residual = np.asarray(residual(final_tangent), dtype=float)
        if not _is_close(final_residual, np.zeros(2)):
            raise ExactSpecConvergenceError(
                "Exact image-height reverse solve did not converge within "
                "the required real-ray tolerance"
            )
        if last_reverse_ray is None:
            raise ExactSpecConvergenceError(
                "Exact image-height reverse solve produced no physical ray"
            )

        if self.optical_spec.conjugate_type("object") == "infinite":
            first_surface_segment = last_reverse_ray[mc.ray][-2]
            first_surface_point = np.asarray(
                first_surface_segment[mc.p],
                dtype=float,
            )
            first_surface_direction = -np.asarray(
                first_surface_segment[mc.d],
                dtype=float,
            )
            if abs(float(first_surface_direction[2])) <= np.finfo(float).eps:
                raise ExactSpecError(
                    "Exact infinite-conjugate chief ray is parallel to the "
                    "first-surface vertex plane"
                )
            vertex_plane_point = (
                first_surface_point
                - first_surface_point[2]
                / first_surface_direction[2]
                * first_surface_direction
            )
            rotation, translation = seq_model.lcl_tfrms[0]
            object_point = rotation.T.dot(vertex_plane_point) + translation
            object_direction = rotation.T.dot(first_surface_direction)
        else:
            object_segment = last_reverse_ray[mc.ray][-1]
            object_point = np.asarray(object_segment[mc.p], dtype=float)
            object_direction = -np.asarray(object_segment[mc.d], dtype=float)
        launch = (object_point, _normalize(object_direction))
        self._verify_forward_retrace(
            launch,
            image_coordinate,
            stop_index,
            stop_centre,
            wavelength,
        )
        return final_tangent, launch

    def _image_surface_point(self, image_coordinate):
        """Return the exact local point on the possibly curved image profile."""
        image_interface = self.optical_spec.opt_model["seq_model"].ifcs[-1]
        try:
            sag = float(
                image_interface.profile.sag(
                    float(image_coordinate[0]),
                    float(image_coordinate[1]),
                )
            )
        except TraceError as error:
            _raise_trace_error(error, "Exact image-height target")
        return np.array(
            [float(image_coordinate[0]), float(image_coordinate[1]), sag],
            dtype=float,
        )

    def _verify_forward_retrace(
        self,
        launch,
        image_coordinate,
        stop_index,
        stop_centre,
        wavelength,
    ):
        """Forward retrace a reverse solution and verify stop/image residuals."""
        seq_model = self.optical_spec.opt_model["seq_model"]
        point, direction = launch
        try:
            forward_ray = raytrace.trace_raw(
                seq_model.path(wl=wavelength),
                point,
                direction,
                wavelength,
                check_apertures=False,
                intersect_obj=False,
            )
        except TraceError as error:
            _raise_trace_error(error, "Exact image-height forward verification")

        stop_point = np.asarray(
            forward_ray[mc.ray][stop_index][mc.p],
            dtype=float,
        )
        image_point = np.asarray(forward_ray[mc.ray][-1][mc.p], dtype=float)
        if not _is_close(stop_point[:2], stop_centre):
            raise ExactSpecConvergenceError(
                "Exact image-height forward retrace did not reach the stop centre"
            )
        if not _is_close(image_point[:2], image_coordinate):
            raise ExactSpecConvergenceError(
                "Exact image-height forward retrace did not reach the requested "
                "image-surface intersection"
            )


class ExactOpticalModel(OpticalModel):
    """RayOptics model that re-resolves exact pupil constraints on every update."""

    def __init__(
        self,
        radius_mode=False,
        specsheet=None,
        scalar_solver=None,
        **kwargs,
    ):
        """Create a model with exact launch state and injectable scalar solver."""
        self._scalar_solver = scalar_solver or root_scalar
        self._resolved_object_epd = None
        self._resolved_object_na_tangent = None
        self._exact_pupil_resolve_count = 0
        self.optical_spec = ExactOpticalSpecs(
            self,
            specsheet=specsheet,
            **kwargs,
        )
        super().__init__(
            radius_mode=radius_mode,
            specsheet=specsheet,
            **kwargs,
        )

    @property
    def resolved_object_epd(self):
        """Return the current exact object-space beam diameter, if applicable."""
        return self._resolved_object_epd

    @property
    def exact_pupil_resolve_count(self):
        """Return the number of successful post-update pupil resolutions."""
        return self._exact_pupil_resolve_count

    def update_model(self, **kwargs):
        """Update RayOptics, then replace every physical pupil launch exactly."""
        self._resolved_object_epd = None
        self._resolved_object_na_tangent = None
        super().update_model(**kwargs)
        self._resolve_exact_pupil()
        if self["seq_model"].do_apertures and len(self["seq_model"].ifcs) > 2:
            self["seq_model"].set_clear_apertures()

    def _resolve_exact_pupil(self):
        """Resolve and verify the requested valid pupil combination."""
        pupil = self["optical_spec"]["pupil"]
        if pupil.key == ("image", "f/#"):
            self._resolve_image_f_number(float(pupil.value))
        elif pupil.key == ("object", "NA"):
            self._resolve_object_na(float(pupil.value))
        elif pupil.key == ("object", "epd"):
            self._resolved_object_epd = float(pupil.value)
        else:
            raise ExactSpecError(
                f"Unsupported physical pupil specification: {pupil.key!r}"
            )
        self._exact_pupil_resolve_count += 1

    def _on_axis_field(self):
        """Return an existing axial field or a temporary exact axial sample."""
        field_of_view = self["optical_spec"]["fov"]
        for field in field_of_view.fields:
            if float(field.xv) == 0.0 and float(field.yv) == 0.0:
                return field
        return Field(x=0.0, y=0.0, fov=field_of_view)

    def _trace_axial_pupil_ray(self, pupil_coordinate, context):
        """Trace one unclipped axial pupil ray and translate physical errors."""
        optical_spec = self["optical_spec"]
        field = self._on_axis_field()
        wavelength = optical_spec["wvls"].central_wvl
        try:
            return trace_base(
                self,
                pupil_coordinate,
                field,
                wavelength,
                apply_vignetting=False,
                check_apertures=False,
            )
        except TraceError as error:
            _raise_trace_error(error, context)

    def _real_image_space_angle(self):
        """Return the real local image-space chief-to-+Y marginal angle."""
        chief = self._trace_axial_pupil_ray(
            [0.0, 0.0],
            "Exact Image F/# chief ray",
        )
        marginal = self._trace_axial_pupil_ray(
            [0.0, 1.0],
            "Exact Image F/# +Y marginal ray",
        )
        return _angle_between(
            chief[mc.ray][-1][mc.d],
            marginal[mc.ray][-1][mc.d],
        )

    def _resolve_image_f_number(self, f_number):
        """Root solve object-space beam diameter for geometric Image F/#."""
        if not math.isfinite(f_number) or f_number <= 0.0:
            raise ExactSpecError("Image F/# must be finite and greater than zero")
        target_angle = math.atan(1.0 / (2.0 * f_number))
        self._resolved_object_epd = 0.0
        axial_angle = self._real_image_space_angle()
        if not _is_close(axial_angle, 0.0):
            raise ExactSpecConvergenceError(
                "Exact Image F/# axial real-ray initialization is not on axis"
            )

        paraxial_data = self["analysis_results"]["parax_data"]
        paraxial_scale = (
            abs(2.0 * float(paraxial_data.fod.enp_radius))
            if paraxial_data is not None
            else 1.0
        )
        search_scale = max(paraxial_scale, 1.0e-6)
        step = search_scale / 32.0
        lower_epd = 0.0
        lower_residual = -target_angle
        upper_epd = None

        for step_index in range(1, _MAX_SCALAR_CONTINUATION_STEPS + 1):
            candidate_epd = step_index * step
            self._resolved_object_epd = candidate_epd
            candidate_residual = self._real_image_space_angle() - target_angle
            if candidate_residual >= 0.0:
                upper_epd = candidate_epd
                break
            lower_epd = candidate_epd
            lower_residual = candidate_residual

        if upper_epd is None:
            raise ExactSpecConvergenceError(
                "Exact Image F/# target is unreachable by continued real rays"
            )
        if lower_residual > 0.0:
            raise ExactSpecConvergenceError(
                "Exact Image F/# continuation did not bracket the target"
            )

        def residual(object_epd):
            self._resolved_object_epd = float(object_epd)
            return self._real_image_space_angle() - target_angle

        result = self._scalar_solver(
            residual,
            bracket=(lower_epd, upper_epd),
            method="brentq",
            xtol=_ROOT_X_TOLERANCE,
            rtol=_ROOT_RELATIVE_TOLERANCE,
            maxiter=100,
        )
        if not bool(getattr(result, "converged", False)):
            raise ExactSpecConvergenceError(
                "Exact Image F/# real-ray solve did not converge"
            )

        self._resolved_object_epd = float(result.root)
        actual_angle = self._real_image_space_angle()
        if not _is_close(actual_angle, target_angle):
            raise ExactSpecConvergenceError(
                "Exact Image F/# real-ray solve did not converge within "
                "the required tolerance"
            )

    def _resolve_object_na(self, numerical_aperture):
        """Resolve Object NA analytically using the physical object medium."""
        spectral_region = self["optical_spec"]["wvls"]
        reference_index = spectral_region.reference_wvl
        object_index = abs(
            float(self["seq_model"].rndx[0][reference_index])
        )
        if (
            not math.isfinite(numerical_aperture)
            or numerical_aperture < 0.0
            or numerical_aperture >= object_index
        ):
            raise ExactSpecError(
                "Object NA must be non-negative and smaller than the "
                f"reference-wavelength object index ({object_index})"
            )

        denominator = math.sqrt(
            object_index * object_index
            - numerical_aperture * numerical_aperture
        )
        self._resolved_object_na_tangent = (
            0.0
            if numerical_aperture == 0.0
            else numerical_aperture / denominator
        )

        chief = self._trace_axial_pupil_ray(
            [0.0, 0.0],
            "Exact Object NA chief ray",
        )
        marginal = self._trace_axial_pupil_ray(
            [0.0, 1.0],
            "Exact Object NA +Y marginal ray",
        )
        actual_angle = _angle_between(
            chief[mc.ray][0][mc.d],
            marginal[mc.ray][0][mc.d],
        )
        actual_na = object_index * math.sin(actual_angle)
        if not _is_close(actual_na, numerical_aperture):
            raise ExactSpecConvergenceError(
                "Exact Object NA physical ray angle failed verification"
            )
