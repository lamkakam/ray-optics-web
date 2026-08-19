"""Resolve opt-in physical optical specifications with exact real rays.

``ExactOpticalModel`` preserves RayOptics' requested pupil key/value for
paraxial first-order reporting while resolving a separate physical launch after
every ``update_model()``.  Image-space geometric F-number is solved from the
real angle between the axial chief and +Y marginal rays.  Object-space
numerical aperture is converted with the reference-wavelength object index.
These pupil extensions are active only when the field's ``is_wide_angle``
attribute is exactly ``True``; otherwise the exact classes delegate to their
RayOptics superclasses.

``ExactImageHeightFieldSpec`` treats every image-height sample as a requested
local image-surface intersection.  Centred, flat-image, infinite-conjugate
fields first reuse RayOptics' native real-image-height evaluator and refine its
launch only when strict forward verification requires it.  Finite conjugates,
curved images, decentered stops, and continuation retain the extension's
reverse solve through the physical stop centre.  Configured launches also
populate RayOptics-compatible aiming and chief-ray caches for later analysis.
Cached chief rays retain the verified geometry but use RayOptics' standard
optical-path normalization so infinite-conjugate dummy gaps cannot contaminate
OPD results.  Centred meridional refinements use their one physical degree of
freedom so an identically-zero sagittal residual cannot make the numerical
Jacobian singular.

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
from rayoptics.raytr import RayPkg
from rayoptics.raytr import raytrace
from rayoptics.raytr.opticalspec import Field, FieldSpec, OpticalSpecs
from rayoptics.raytr.trace import trace_base
from rayoptics.raytr.traceerror import (
    TraceError,
    TraceMissedSurfaceError,
    TraceTIRError,
)
from rayoptics.raytr.waveabr import transfer_to_exit_pupil
from rayoptics.raytr.wideangle import eval_real_image_ht
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


def _is_exact_stack_enabled(optical_spec):
    """Return whether the field explicitly opts into exact real-ray handling."""
    return getattr(optical_spec["fov"], "is_wide_angle", False) is True


class ExactOpticalSpecs(OpticalSpecs):
    """Optical specs whose opted-in launches use the model's resolved pupil."""

    def update_optical_properties(self, **kwargs):
        """Resolve exact image fields after current first-order properties."""
        field_of_view = self["fov"]
        if (
            not _is_exact_stack_enabled(self)
            or not isinstance(field_of_view, ExactImageHeightFieldSpec)
        ):
            return super().update_optical_properties(**kwargs)

        do_aiming = self.do_aiming
        self.do_aiming = False
        try:
            result = super().update_optical_properties(**kwargs)
        finally:
            self.do_aiming = do_aiming
        field_of_view._resolve_all_fields()
        return result

    def ray_start_from_osp(self, pupil, fld, pupil_type):
        """Return an exact physical start when the pupil requires resolution."""
        if pupil_type != "rel pupil" or not _is_exact_stack_enabled(self):
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
    """Native-first image-height fields with strict real-ray extensions."""

    def __init__(
        self,
        *args,
        vector_solver=None,
        native_image_height_evaluator=None,
        **kwargs,
    ):
        """Initialize injectable native evaluation and refinement solvers."""
        self._vector_solver = vector_solver or _least_squares_vector_solver
        self._native_image_height_evaluator = (
            native_image_height_evaluator or eval_real_image_ht
        )
        self._clear_solution_cache()
        super().__init__(*args, **kwargs)

    def _clear_solution_cache(self):
        """Discard launches and RayOptics analysis caches from prior geometry."""
        self._object_launches = {}
        self._coordinate_launches = {}
        self._coordinate_tangents = {}
        self._coordinate_aim_info = {}
        self._coordinate_chief_rays = {}

    def update_model(self, **kwargs):
        """Clear stale exact state and otherwise follow RayOptics' field update."""
        self._clear_solution_cache()
        result = super().update_model(**kwargs)
        if self.is_wide_angle is True and self.key != ("image", "height"):
            raise ExactSpecError(
                "ExactImageHeightFieldSpec requires key ('image', 'height')"
            )
        return result

    def obj_coords(self, fld):
        """Return the verified object-space launch for ``fld``."""
        if self.key != ("image", "height") or self.is_wide_angle is not True:
            return super().obj_coords(fld)

        launch = self._object_launches.get(id(fld))
        if launch is None:
            coordinate = self._absolute_field_coordinate(fld)
            key = self._coordinate_key(coordinate)
            launch = self._coordinate_launches.get(key)
        if launch is None:
            coordinate = self._absolute_field_coordinate(fld)
            if self._supports_native_image_height_evaluator():
                solution = self._solve_native_first(fld, coordinate)
            else:
                solution = self._solve_coordinate_from_axis(coordinate)
            self._store_coordinate_solution(coordinate, solution)
            self._apply_coordinate_solution(fld, coordinate)
            launch = solution[1]
        elif id(fld) not in self._object_launches:
            self._apply_coordinate_solution(fld, coordinate)
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
        """Resolve configured fields natively or by radial continuation."""
        self._clear_solution_cache()
        if len(self.fields) == 0:
            return

        ordered_fields = sorted(
            self.fields,
            key=lambda field: float(
                np.linalg.norm(self._absolute_field_coordinate(field))
            ),
        )
        if self._supports_native_image_height_evaluator():
            for field in ordered_fields:
                coordinate = self._absolute_field_coordinate(field)
                key = self._coordinate_key(coordinate)
                if key not in self._coordinate_launches:
                    solution = self._solve_native_first(field, coordinate)
                    self._store_coordinate_solution(coordinate, solution)
                self._apply_coordinate_solution(field, coordinate)
            return

        axial_coordinate = np.array([0.0, 0.0], dtype=float)
        axial_solution = self._solve_reverse_direction(
            axial_coordinate,
            np.array([0.0, 0.0], dtype=float),
        )
        self._store_coordinate_solution(axial_coordinate, axial_solution)

        previous_coordinate = axial_coordinate
        previous_tangent = axial_solution[0]
        for field in ordered_fields:
            coordinate = self._absolute_field_coordinate(field)
            key = self._coordinate_key(coordinate)
            if key not in self._coordinate_launches:
                solution = self._continue_reverse_solution(
                    previous_coordinate,
                    coordinate,
                    previous_tangent,
                )
                previous_coordinate = coordinate
                previous_tangent = solution[0]
                self._store_coordinate_solution(coordinate, solution)
            self._apply_coordinate_solution(field, coordinate)

    def _store_coordinate_solution(self, coordinate, solution):
        """Cache a verified coordinate launch and its RayOptics metadata."""
        tangent, launch, aim_info, chief_ray = solution
        key = self._coordinate_key(coordinate)
        self._coordinate_tangents[key] = tangent
        self._coordinate_launches[key] = launch
        self._coordinate_aim_info[key] = aim_info
        self._coordinate_chief_rays[key] = chief_ray

    def _apply_coordinate_solution(self, field, coordinate):
        """Attach one cached solution to a configured RayOptics field."""
        key = self._coordinate_key(coordinate)
        launch = self._coordinate_launches[key]
        self._object_launches[id(field)] = launch
        field.aim_info = self._coordinate_aim_info[key]
        field.chief_ray = self._coordinate_chief_rays[key]

    def _solve_coordinate_from_axis(self, coordinate):
        """Solve an ad-hoc field coordinate from the cached axial real ray."""
        axial_coordinate = np.array([0.0, 0.0], dtype=float)
        axial_key = self._coordinate_key(axial_coordinate)
        if axial_key not in self._coordinate_launches:
            axial_solution = self._solve_reverse_direction(
                axial_coordinate,
                np.array([0.0, 0.0], dtype=float),
            )
            self._store_coordinate_solution(axial_coordinate, axial_solution)
        solution = self._continue_reverse_solution(
            axial_coordinate,
            coordinate,
            self._coordinate_tangents[axial_key],
        )
        return solution

    def _continue_reverse_solution(
        self,
        start_coordinate,
        target_coordinate,
        initial_tangent,
    ):
        """Continue a verified real reverse ray to ``target_coordinate``."""
        tangent = np.asarray(initial_tangent, dtype=float)
        solution = None
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
            solution = self._solve_reverse_direction(coordinate, tangent)
            tangent = solution[0]
        if solution is None:
            solution = self._solve_reverse_direction(
                target_coordinate,
                tangent,
            )
        return solution

    def _supports_native_image_height_evaluator(self):
        """Return whether RayOptics supports this exact image-height geometry."""
        if self.optical_spec.conjugate_type("object") != "infinite":
            return False

        seq_model = self.optical_spec.opt_model["seq_model"]
        image_profile = seq_model.ifcs[-1].profile
        image_curvature = getattr(image_profile, "cv", None)
        if image_curvature is None or float(image_curvature) != 0.0:
            return False

        stop_index, stop_centre = _stop_index_and_center(seq_model)
        stop_interface = seq_model.ifcs[stop_index]
        if not _is_close(stop_centre, np.zeros(2)):
            return False
        return getattr(stop_interface, "decenter", None) is None

    def _solve_native_first(self, field, image_coordinate):
        """Use RayOptics' launch, refining only failed strict verification."""
        opm = self.optical_spec.opt_model
        wavelength = self.optical_spec["wvls"].central_wvl
        try:
            native_launch, native_aim_info = (
                self._native_image_height_evaluator(opm, field, wavelength)
            )
        except TraceError as error:
            _raise_trace_error(error, "Native image-height evaluation")

        native_point, native_direction = native_launch
        launch = (
            np.asarray(native_point, dtype=float),
            _normalize(native_direction),
        )
        stop_index, stop_centre = _stop_index_and_center(opm["seq_model"])
        forward_ray, stop_residual, image_residual = (
            self._trace_forward_retrace(
                launch,
                image_coordinate,
                stop_index,
                stop_centre,
                wavelength,
            )
        )
        initial_tangent = self._reverse_tangent_from_forward_ray(forward_ray)
        if not (
            _is_close(stop_residual, np.zeros(2))
            and _is_close(image_residual, np.zeros(2))
        ):
            return self._solve_reverse_direction(
                image_coordinate,
                initial_tangent,
            )

        aim_info = float(native_aim_info)
        if not math.isfinite(aim_info):
            raise ExactSpecConvergenceError(
                "Native image-height evaluation returned invalid aiming data"
            )
        chief_ray = self._chief_ray_cache(forward_ray)
        return initial_tangent, launch, aim_info, chief_ray

    @staticmethod
    def _reverse_tangent_from_forward_ray(forward_ray):
        """Return a reverse-image tangent seeded by a forward chief ray."""
        reverse_direction = -np.asarray(
            forward_ray[mc.ray][-1][mc.d],
            dtype=float,
        )
        if abs(float(reverse_direction[2])) <= np.finfo(float).eps:
            raise ExactSpecError(
                "Exact image-height chief ray is parallel to the image plane"
            )
        return reverse_direction[:2] / abs(float(reverse_direction[2]))

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
        forward_ray = self._verify_forward_retrace(
            launch,
            image_coordinate,
            stop_index,
            stop_centre,
            wavelength,
        )
        aim_info = self._aim_info_from_reverse_ray(last_reverse_ray)
        chief_ray = self._chief_ray_cache(forward_ray)
        return final_tangent, launch, aim_info, chief_ray

    def _aim_info_from_reverse_ray(self, reverse_ray):
        """Derive RayOptics' scalar real entrance-pupil cache value."""
        first_surface_segment = reverse_ray[mc.ray][-2]
        first_surface_point = np.asarray(
            first_surface_segment[mc.p],
            dtype=float,
        )
        reverse_direction = np.asarray(
            first_surface_segment[mc.d],
            dtype=float,
        )
        transverse_direction = float(np.linalg.norm(reverse_direction[:2]))
        if transverse_direction == 0.0:
            paraxial_data = self.optical_spec.opt_model["analysis_results"][
                "parax_data"
            ]
            if paraxial_data is None:
                raise ExactSpecError(
                    "Exact image-height aiming requires current first-order data"
                )
            return float(paraxial_data.fod.enp_dist)

        object_direction = -reverse_direction
        return float(
            first_surface_point[2]
            + np.linalg.norm(first_surface_point[:2])
            * object_direction[2]
            / transverse_direction
        )

    def _chief_ray_cache(self, forward_ray):
        """Build a geometrically verified, OPD-compatible chief-ray package.

        ``_trace_forward_retrace`` deliberately uses ``trace_raw`` across the
        complete path so strict stop and image intersection checks see every
        segment. Its optical-path value therefore includes dummy object and
        image gaps that RayOptics' normal analysis trace excludes. Retrace the
        already-solved launch through the standard wrapper to normalize only
        that bookkeeping; this does not repeat entrance-pupil aiming.
        """
        opm = self.optical_spec.opt_model
        paraxial_data = opm["analysis_results"]["parax_data"]
        if paraxial_data is None:
            raise ExactSpecError(
                "Exact image-height caching requires current first-order data"
            )
        verified_ray = RayPkg(*forward_ray)
        try:
            chief_ray = RayPkg(
                *raytrace.trace(
                    opm["seq_model"],
                    verified_ray.ray[0][mc.p],
                    verified_ray.ray[0][mc.d],
                    verified_ray.wvl,
                    check_apertures=False,
                    intersect_obj=False,
                )
            )
        except TraceError as error:
            _raise_trace_error(error, "Exact image-height chief-ray caching")
        chief_exit_segment = transfer_to_exit_pupil(
            opm["seq_model"].ifcs[-2],
            (
                chief_ray.ray[-2][mc.p],
                chief_ray.ray[-2][mc.d],
            ),
            paraxial_data.fod.exp_dist,
        )
        return chief_ray, chief_exit_segment

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
        forward_ray, stop_residual, image_residual = self._trace_forward_retrace(
            launch,
            image_coordinate,
            stop_index,
            stop_centre,
            wavelength,
        )
        if not _is_close(stop_residual, np.zeros(2)):
            raise ExactSpecConvergenceError(
                "Exact image-height forward retrace did not reach the stop centre"
            )
        if not _is_close(image_residual, np.zeros(2)):
            raise ExactSpecConvergenceError(
                "Exact image-height forward retrace did not reach the requested "
                "image-surface intersection"
            )
        return forward_ray

    def _trace_forward_retrace(
        self,
        launch,
        image_coordinate,
        stop_index,
        stop_centre,
        wavelength,
    ):
        """Trace a candidate launch and return its stop and image residuals."""
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
        return (
            forward_ray,
            stop_point[:2] - stop_centre,
            image_point[:2] - image_coordinate,
        )


class ExactOpticalModel(OpticalModel):
    """RayOptics model that re-resolves opted-in exact pupil constraints."""

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
        """Update RayOptics, resolving pupils only for explicit wide-angle use."""
        self._resolved_object_epd = None
        self._resolved_object_na_tangent = None
        super().update_model(**kwargs)
        if not _is_exact_stack_enabled(self["optical_spec"]):
            return
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
