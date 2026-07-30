"""Regression tests for exact real-ray pupil and image-height specifications.

The exact specification path keeps RayOptics' paraxial data available for
first-order reporting, but it must never use a paraxial conversion as the final
physical launch.  These tests exercise the public exact model and field classes
through normal RayOptics tracing calls.
"""

from __future__ import annotations

from math import acos, atan, sin
from types import SimpleNamespace
from typing import Callable

import numpy as np
import pytest
import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr.opticalspec import FieldSpec, PupilSpec, WvlSpec
from rayoptics.raytr.trace import trace_base
from rayoptics.seq.medium import decode_medium
from scipy.optimize import root as scipy_root

from rayoptics_web_utils.optical_specs import (
    ExactImageHeightFieldSpec,
    ExactOpticalModel,
    ExactSpecConvergenceError,
    ExactSpecError,
    ExactSpecTraceError,
)


REFERENCE_WAVELENGTH_NM = 587.562


def _ray_angle(first_direction: np.ndarray, second_direction: np.ndarray) -> float:
    """Return the unsigned angle between two normalized ray directions."""
    first = first_direction / np.linalg.norm(first_direction)
    second = second_direction / np.linalg.norm(second_direction)
    return acos(float(np.clip(np.dot(first, second), -1.0, 1.0)))


def _trace_axial_rays(opm: OpticalModel):
    """Trace the on-axis chief and +Y marginal rays without clipping."""
    osp = opm["optical_spec"]
    field = osp["fov"].fields[0]
    wavelength = osp["wvls"].central_wvl
    return [
        trace_base(
            opm,
            pupil,
            field,
            wavelength,
            apply_vignetting=False,
            check_apertures=False,
        )
        for pupil in ([0.0, 0.0], [0.0, 1.0])
    ]


def _image_space_angle(opm: OpticalModel) -> float:
    """Return the real image-space angle between axial chief and +Y rays."""
    chief, marginal = _trace_axial_rays(opm)
    chief_direction = np.asarray(chief[mc.ray][-1][mc.d])
    marginal_direction = np.asarray(marginal[mc.ray][-1][mc.d])
    return _ray_angle(chief_direction, marginal_direction)


def _build_cooke(
    model_factory: Callable[[], OpticalModel],
    *,
    pupil_key: tuple[str, str],
    pupil_value: float,
    field_key: tuple[str, str] = ("object", "angle"),
    max_field: float = 0.0,
    fields: list[float] | None = None,
    object_distance: float = 1.0e10,
    image_distance: float = 41.2365,
    vector_solver: Callable | None = None,
    update: bool = True,
) -> OpticalModel:
    """Build a clear-aperture-free Cooke triplet for exact-spec tests."""
    opm = model_factory()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    osp["pupil"] = PupilSpec(osp, key=pupil_key, value=pupil_value)
    field_class = (
        ExactImageHeightFieldSpec
        if field_key == ("image", "height")
        else FieldSpec
    )
    field_kwargs = {}
    if field_class is ExactImageHeightFieldSpec:
        field_kwargs["vector_solver"] = vector_solver
    osp["fov"] = field_class(
        osp,
        key=field_key,
        value=max_field,
        flds=fields if fields is not None else [0.0],
        is_relative=True,
        **field_kwargs,
    )
    osp["wvls"] = WvlSpec([(REFERENCE_WAVELENGTH_NM, 1.0)], ref_wl=0)
    opm.radius_mode = True
    sm.do_apertures = False
    sm.gaps[0].thi = object_distance
    sm.gaps[0].medium = decode_medium("air")

    sm.add_surface([23.713, 4.831, "N-LAK9", "Schott"], sd=100.0)
    sm.add_surface([7331.288, 5.86, "air"], sd=100.0)
    sm.add_surface([-24.456, 0.975, "N-SF5", "Schott"], sd=100.0)
    sm.set_stop()
    sm.add_surface([21.896, 4.822, "air"], sd=100.0)
    sm.add_surface([86.759, 3.127, "N-LAK9", "Schott"], sd=100.0)
    sm.add_surface([-20.4942, image_distance, "air"], sd=100.0)

    if update:
        opm.update_model()
    return opm


def _build_uniform_medium_na_model(
    na: float,
    *,
    object_index: float = 1.5,
) -> ExactOpticalModel:
    """Build an unpowered model whose object-space angle is easy to verify."""
    opm = ExactOpticalModel()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    osp["pupil"] = PupilSpec(osp, key=("object", "NA"), value=na)
    osp["fov"] = FieldSpec(
        osp,
        key=("object", "height"),
        value=0.0,
        flds=[0.0],
        is_relative=True,
    )
    osp["wvls"] = WvlSpec([(REFERENCE_WAVELENGTH_NM, 1.0)], ref_wl=0)
    opm.radius_mode = True
    sm.do_apertures = False
    sm.gaps[0].thi = 10.0
    sm.gaps[0].medium = decode_medium(object_index)
    sm.add_surface([0.0, 5.0, object_index], sd=100.0)
    sm.set_stop()
    sm.add_surface([0.0, 5.0, object_index], sd=100.0)
    return opm


def test_image_f_number_is_resolved_from_the_real_image_space_angle():
    """Image F/# follows atan(1/(2F)), not RayOptics' paraxial launch."""
    f_number = 2.4
    exact = _build_cooke(
        ExactOpticalModel,
        pupil_key=("image", "f/#"),
        pupil_value=f_number,
    )
    paraxial = _build_cooke(
        OpticalModel,
        pupil_key=("image", "f/#"),
        pupil_value=f_number,
    )
    expected_angle = atan(1.0 / (2.0 * f_number))

    assert _image_space_angle(exact) == pytest.approx(
        expected_angle,
        rel=1.0e-9,
        abs=1.0e-9,
    )
    assert abs(_image_space_angle(paraxial) - expected_angle) > 1.0e-4
    assert exact.resolved_object_epd != pytest.approx(
        2.0 * paraxial["analysis_results"]["parax_data"].fod.enp_radius,
    )


def test_object_na_uses_the_reference_wavelength_object_medium_index():
    """Object NA is n_object*sin(theta), including immersion media."""
    requested_na = 1.2
    object_index = 1.5
    opm = _build_uniform_medium_na_model(
        requested_na,
        object_index=object_index,
    )
    opm.update_model()

    chief, marginal = _trace_axial_rays(opm)
    actual_angle = _ray_angle(
        np.asarray(chief[mc.ray][0][mc.d]),
        np.asarray(marginal[mc.ray][0][mc.d]),
    )

    assert object_index * sin(actual_angle) == pytest.approx(
        requested_na,
        rel=1.0e-9,
        abs=1.0e-9,
    )
    assert actual_angle != pytest.approx(atan(requested_na))


@pytest.mark.parametrize("invalid_na", [-0.1, 1.5, 1.6])
def test_object_na_rejects_negative_and_non_propagating_values(invalid_na: float):
    """Negative NA and NA at or above the object index are invalid."""
    opm = _build_uniform_medium_na_model(invalid_na, object_index=1.5)

    with pytest.raises(ExactSpecError, match="Object NA"):
        opm.update_model()


@pytest.mark.parametrize(
    ("object_distance", "max_height"),
    [(120.0, 2.0), (1.0e10, 5.0)],
)
def test_image_height_samples_are_exact_real_chief_ray_intersections(
    object_distance: float,
    max_height: float,
):
    """Finite and infinite conjugates hit every nonuniform relative sample."""
    relative_samples = [0.0, 0.19, 0.63, 1.0]
    opm = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=max_height,
        fields=relative_samples,
        object_distance=object_distance,
    )
    osp = opm["optical_spec"]
    wavelength = osp["wvls"].central_wvl

    for relative_height, field in zip(relative_samples, osp["fov"].fields):
        chief = trace_base(
            opm,
            [0.0, 0.0],
            field,
            wavelength,
            apply_vignetting=False,
            check_apertures=False,
        )
        image_point = np.asarray(chief[mc.ray][-1][mc.p])
        assert image_point[0] == pytest.approx(0.0, abs=1.0e-9)
        assert image_point[1] == pytest.approx(
            relative_height * max_height,
            rel=1.0e-9,
            abs=1.0e-9,
        )


def test_meridional_image_height_uses_a_nonsingular_scalar_solve():
    """A centred Y-only field must not expose a singular two-axis Jacobian."""
    solve_dimensions: list[int] = []

    def dimension_recording_solver(residual, initial, **kwargs):
        initial = np.atleast_1d(initial)
        solve_dimensions.append(initial.size)
        if initial.size != 1:
            return SimpleNamespace(
                success=False,
                message="singular two-axis meridional Jacobian",
            )
        return scipy_root(residual, initial, **kwargs)

    _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=2.0,
        fields=[0.0, 0.25, 1.0],
        vector_solver=dimension_recording_solver,
    )

    assert solve_dimensions
    assert set(solve_dimensions) == {1}


def test_exact_constraints_are_resolved_again_after_geometry_changes():
    """Pupil and image-height launches track focusing/optimization mutations."""
    pupil_model = _build_cooke(
        ExactOpticalModel,
        pupil_key=("image", "f/#"),
        pupil_value=3.0,
    )
    initial_epd = pupil_model.resolved_object_epd
    initial_count = pupil_model.exact_pupil_resolve_count

    pupil_model["seq_model"].ifcs[1].profile.r = 25.0
    pupil_model.update_model()

    assert pupil_model.exact_pupil_resolve_count == initial_count + 1
    assert pupil_model.resolved_object_epd != pytest.approx(initial_epd)
    assert _image_space_angle(pupil_model) == pytest.approx(
        atan(1.0 / 6.0),
        rel=1.0e-9,
        abs=1.0e-9,
    )

    field_model = _build_cooke(
        ExactOpticalModel,
        pupil_key=("object", "epd"),
        pupil_value=8.0,
        field_key=("image", "height"),
        max_field=2.0,
        fields=[0.0, 1.0],
        object_distance=120.0,
    )
    fov = field_model["optical_spec"]["fov"]
    edge_field = fov.fields[-1]
    _, initial_direction = fov.obj_coords(edge_field)

    field_model["seq_model"].gaps[-1].thi += 2.0
    field_model.update_model()
    _, updated_direction = fov.obj_coords(edge_field)

    assert updated_direction != pytest.approx(initial_direction)
    wavelength = field_model["optical_spec"]["wvls"].central_wvl
    chief = trace_base(
        field_model,
        [0.0, 0.0],
        edge_field,
        wavelength,
        apply_vignetting=False,
        check_apertures=False,
    )
    assert chief[mc.ray][-1][mc.p][1] == pytest.approx(
        2.0,
        rel=1.0e-9,
        abs=1.0e-9,
    )


def test_total_internal_reflection_is_a_hard_exact_spec_error():
    """An exact Object NA ray that TIRs must not fall back to paraxial data."""
    opm = _build_uniform_medium_na_model(1.2, object_index=1.5)
    opm["seq_model"].gaps[1].medium = decode_medium("air")

    with pytest.raises(ExactSpecTraceError, match="total internal reflection"):
        opm.update_model()


def test_missed_surface_is_a_hard_exact_spec_error():
    """A physical marginal ray that misses a profile must abort model update."""
    opm = ExactOpticalModel()
    osp = opm["optical_spec"]
    sm = opm["seq_model"]
    osp["pupil"] = PupilSpec(osp, key=("object", "NA"), value=0.9)
    osp["fov"] = FieldSpec(
        osp,
        key=("object", "height"),
        value=0.0,
        flds=[0.0],
        is_relative=True,
    )
    osp["wvls"] = WvlSpec([(REFERENCE_WAVELENGTH_NM, 1.0)], ref_wl=0)
    sm.do_apertures = False
    sm.gaps[0].thi = 10.0
    sm.add_surface([1.0, 2.0, "air"], sd=100.0)
    sm.set_stop()
    sm.add_surface([0.0, 2.0, "air"], sd=100.0)

    with pytest.raises(ExactSpecTraceError, match="missed surface"):
        opm.update_model()


def test_non_converged_image_f_number_solve_is_a_hard_error():
    """A solver result without convergence must never supply a launch."""

    def non_converging_solver(*_args, **_kwargs):
        return SimpleNamespace(converged=False, root=0.0)

    opm = _build_cooke(
        lambda: ExactOpticalModel(scalar_solver=non_converging_solver),
        pupil_key=("image", "f/#"),
        pupil_value=4.0,
        update=False,
    )

    with pytest.raises(ExactSpecConvergenceError, match="did not converge"):
        opm.update_model()
