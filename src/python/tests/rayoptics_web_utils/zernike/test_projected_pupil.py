"""Behavioral tests for projected-pupil geometry and finite image-space sampling."""

import numpy as np
import pytest


def _rigid_transform(point, rotation, translation):
    return rotation @ np.asarray(point, dtype=float) + translation


class TestReferenceSphereGeometry:
    """Reference-sphere points use one explicit Cartesian frame."""

    def test_finite_vector_coerces_numeric_text_to_float(self):
        from rayoptics_web_utils.zernike.projected_pupil import _finite_vector

        result = _finite_vector(["1.0", "-2.5", "3.25"], "Vector")

        assert result.dtype == np.dtype(float)
        np.testing.assert_allclose(result, [1.0, -2.5, 3.25])

    @pytest.mark.parametrize(
        "value",
        [np.array([1.0, 2.0]), np.array([[1.0, 2.0, 3.0]])],
    )
    def test_finite_vector_rejects_finite_non_three_vector_shapes(self, value):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            _finite_vector,
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Vector must be a finite 3-vector\.$",
        ):
            _finite_vector(value, "Vector")

    def test_finite_vector_uses_the_supplied_name_in_its_error(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            _finite_vector,
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Ray origin must be a finite 3-vector\.$",
        ):
            _finite_vector([np.inf, 0.0, 0.0], "Ray origin")

    def test_non_axis_aligned_ray_intersects_pupil_side_cap(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
            project_reference_sphere_point,
        )

        center = np.array([4.0, -3.0, 12.0])
        pupil_reference = np.array([-1.0, 2.0, 0.0])
        geometry = build_reference_sphere_geometry(
            center, pupil_reference, preferred_x_axis=np.array([1.0, 0.0, 0.0])
        )
        radial = pupil_reference - center
        tangent = geometry.ex * 0.12 + geometry.ey * 0.08
        target = center + geometry.radius * (radial / geometry.radius + tangent)
        target = center + geometry.radius * (target - center) / np.linalg.norm(target - center)
        origin = target - 3.0 * (center - target)
        direction = (center - target) / np.linalg.norm(center - target)

        intersection = intersect_pupil_side_sphere(origin, direction, geometry)

        assert np.linalg.norm(intersection - center) == pytest.approx(geometry.radius)
        assert np.dot(intersection - center, pupil_reference - center) > 0.0
        x, y = project_reference_sphere_point(intersection, geometry)
        assert np.isfinite([x, y]).all()
        np.testing.assert_allclose(
            project_reference_sphere_point(pupil_reference, geometry),
            [0.0, 0.0],
            atol=1.0e-12,
        )

    @pytest.mark.parametrize(
        ("argument", "name"),
        [
            (np.array([1.0, 2.0]), "Sphere center"),
            (np.array([1.0, np.nan, 3.0]), "Pupil reference"),
            (np.array([1.0, 2.0, np.inf]), "Preferred x axis"),
        ],
    )
    def test_rejects_nonfinite_or_malformed_geometry_vectors(self, argument, name):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
        )

        values = {
            "Sphere center": np.array([0.0, 0.0, 10.0]),
            "Pupil reference": np.array([0.0, 0.0, 0.0]),
            "Preferred x axis": np.array([1.0, 0.0, 0.0]),
        }
        values[name] = argument

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=rf"^{name} must be a finite 3-vector\.$",
        ):
            build_reference_sphere_geometry(**{
                "center": values["Sphere center"],
                "pupil_reference": values["Pupil reference"],
                "preferred_x_axis": values["Preferred x axis"],
            })

    def test_parallel_preferred_axis_uses_a_right_handed_cartesian_fallback(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            build_reference_sphere_geometry,
        )

        geometry = build_reference_sphere_geometry(
            center=[0.0, 0.0, 10.0],
            pupil_reference=[0.0, 0.0, 0.0],
            preferred_x_axis=[0.0, 0.0, 1.0],
        )

        np.testing.assert_allclose(geometry.ex, [1.0, 0.0, 0.0])
        np.testing.assert_allclose(geometry.ey, [0.0, 1.0, 0.0])
        np.testing.assert_allclose(geometry.ez, [0.0, 0.0, 1.0])
        np.testing.assert_allclose(np.cross(geometry.ex, geometry.ey), geometry.ez)

    def test_scale_aware_radius_guard_rejects_a_roundoff_sized_sphere(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
        )

        center = np.array([1000.0, 0.0, 0.0])
        pupil_reference = center - np.array([np.spacing(center[0]), 0.0, 0.0])

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Reference sphere has an invalid radius\.$",
        ):
            build_reference_sphere_geometry(
                center, pupil_reference, [0.0, 1.0, 0.0]
            )

    def test_radius_equal_to_the_roundoff_guard_is_rejected(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
        )

        epsilon = np.finfo(float).eps

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Reference sphere has an invalid radius\.$",
        ):
            build_reference_sphere_geometry(
                [1.0, 0.0, 0.0], [1.0 - epsilon, 0.0, 0.0], [0.0, 1.0, 0.0]
            )

    def test_fallback_chooses_the_least_parallel_axis_for_a_tilted_sphere(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            build_reference_sphere_geometry,
        )

        geometry = build_reference_sphere_geometry(
            [10.0, 1.0, 2.0], [0.0, 0.0, 0.0], [10.0, 1.0, 2.0]
        )

        expected_basis = np.array([0.0, 1.0, 0.0])
        expected = expected_basis - np.dot(expected_basis, geometry.ez) * geometry.ez
        expected /= np.linalg.norm(expected)
        np.testing.assert_allclose(geometry.ex, expected)

    def test_fallback_threshold_uses_the_deterministic_cartesian_axis(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            build_reference_sphere_geometry,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [0.0, 1.0e-12, 1.0]
        )

        np.testing.assert_allclose(geometry.ex, [1.0, 0.0, 0.0])

    def test_projection_axes_are_normalized_for_a_nonunit_preferred_axis(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            build_reference_sphere_geometry,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [2.0, 0.0, 1.0]
        )

        np.testing.assert_allclose(geometry.ex, [1.0, 0.0, 0.0])
        np.testing.assert_allclose(geometry.ey, [0.0, 1.0, 0.0])
        np.testing.assert_allclose(geometry.ez, [0.0, 0.0, 1.0])

    def test_rejects_a_zero_reference_sphere_with_an_exact_error(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Reference sphere has an invalid radius\.$",
        ):
            build_reference_sphere_geometry(
                center=[0.0, 0.0, 0.0],
                pupil_reference=[0.0, 0.0, 0.0],
                preferred_x_axis=[1.0, 0.0, 0.0],
            )

    def test_virtual_ray_extension_uses_same_pupil_side_branch(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
        )

        geometry = build_reference_sphere_geometry(
            center=np.array([0.0, 0.0, 10.0]),
            pupil_reference=np.array([0.0, 0.0, 0.0]),
            preferred_x_axis=np.array([1.0, 0.0, 0.0]),
        )
        # The directed ray points away from the sphere, so the selected point is
        # reached through a negative line parameter (a virtual extension).
        intersection = intersect_pupil_side_sphere(
            ray_origin=np.array([1.0, 0.0, -2.0]),
            ray_direction=np.array([0.0, 0.0, -1.0]),
            geometry=geometry,
        )

        assert intersection[2] < geometry.center[2]
        assert np.dot(
            intersection - geometry.center,
            geometry.pupil_reference - geometry.center,
        ) > 0.0

    def test_rejects_zero_ray_direction_with_an_exact_error(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        with pytest.raises(
            ProjectedPupilGeometryError, match=r"^Ray direction must be non-zero\.$"
        ):
            intersect_pupil_side_sphere([0.0, 0.0, 0.0], [0.0, 0.0, 0.0], geometry)

    @pytest.mark.parametrize(
        ("ray_origin", "ray_direction", "message"),
        [
            ([np.nan, 0.0, 0.0], [1.0, 0.0, 0.0], "Ray origin"),
            ([0.0, 0.0, 0.0], [np.nan, 0.0, 0.0], "Ray direction"),
        ],
    )
    def test_invalid_ray_vectors_have_exact_labels(
        self, ray_origin, ray_direction, message
    ):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=rf"^{message} must be a finite 3-vector\.$",
        ):
            intersect_pupil_side_sphere(ray_origin, ray_direction, geometry)

    def test_direction_at_machine_epsilon_is_rejected(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        with pytest.raises(
            ProjectedPupilGeometryError, match=r"^Ray direction must be non-zero\.$"
        ):
            intersect_pupil_side_sphere(
                [0.0, 0.0, 0.0], [np.finfo(float).eps, 0.0, 0.0], geometry
            )

    def test_rejects_a_ray_that_misses_the_reference_sphere_exactly(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Outgoing ray does not intersect the reference sphere\.$",
        ):
            intersect_pupil_side_sphere([0.0, 0.0, 30.0], [1.0, 0.0, 0.0], geometry)

    def test_near_miss_with_small_geometry_uses_the_absolute_scale_floor(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 0.1], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Outgoing ray has no intersection on the pupil-side reference-sphere cap\.$",
        ):
            intersect_pupil_side_sphere(
                [0.1 + 2.5e-12, 0.0, 0.1], [0.0, 1.0, 0.0], geometry
            )

    def test_near_miss_beyond_the_absolute_tolerance_is_rejected(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 0.1], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Outgoing ray does not intersect the reference sphere\.$",
        ):
            intersect_pupil_side_sphere(
                [0.1 + 7.5e-12, 0.0, 0.1], [0.0, 1.0, 0.0], geometry
            )

    def test_near_miss_with_a_large_parallel_offset_uses_the_relative_scale(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 1.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Outgoing ray has no intersection on the pupil-side reference-sphere cap\.$",
        ):
            intersect_pupil_side_sphere(
                [1.0 + 1.0e-7, 1000.0, 1.0], [0.0, 1.0, 0.0], geometry
            )

    def test_selected_cap_point_must_clear_the_radius_scaled_side_tolerance(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Outgoing ray has no intersection on the pupil-side reference-sphere cap\.$",
        ):
            intersect_pupil_side_sphere(
                [0.0, 0.0, 10.0 - 5.0e-12], [1.0, 0.0, 0.0], geometry
            )

    def test_tangent_ray_returns_the_tangent_point_on_the_pupil_side(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )
        tangent_point = np.array([6.0, 0.0, 2.0])

        intersection = intersect_pupil_side_sphere(
            tangent_point, [0.0, 1.0, 0.0], geometry
        )

        np.testing.assert_allclose(intersection, tangent_point)

    def test_rejects_a_tangent_only_to_the_equator_as_no_cap_intersection(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Outgoing ray has no intersection on the pupil-side reference-sphere cap\.$",
        ):
            intersect_pupil_side_sphere([10.0, 0.0, 10.0], [0.0, 1.0, 0.0], geometry)

    def test_projection_is_covariant_under_rigid_frame_change(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
            project_reference_sphere_point,
        )

        angle = np.deg2rad(37.0)
        rotation = np.array(
            [
                [np.cos(angle), -np.sin(angle), 0.0],
                [np.sin(angle), np.cos(angle), 0.0],
                [0.0, 0.0, 1.0],
            ]
        )
        translation = np.array([9.0, -4.0, 2.0])
        center = np.array([1.0, 2.0, 11.0])
        pupil_reference = np.array([0.0, 0.0, 0.0])
        origin = np.array([1.3, -0.4, -1.0])
        direction = np.array([-0.02, 0.03, 1.0])
        base = build_reference_sphere_geometry(
            center, pupil_reference, np.array([1.0, 0.0, 0.0])
        )
        moved = build_reference_sphere_geometry(
            _rigid_transform(center, rotation, translation),
            _rigid_transform(pupil_reference, rotation, translation),
            rotation @ np.array([1.0, 0.0, 0.0]),
        )

        base_point = intersect_pupil_side_sphere(origin, direction, base)
        moved_point = intersect_pupil_side_sphere(
            _rigid_transform(origin, rotation, translation),
            rotation @ direction,
            moved,
        )

        np.testing.assert_allclose(
            project_reference_sphere_point(base_point, base),
            project_reference_sphere_point(moved_point, moved),
            atol=1.0e-11,
        )

    def test_rejects_a_point_off_the_reference_sphere_with_an_exact_error(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
            project_reference_sphere_point,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Projected point is not on the reference sphere\.$",
        ):
            project_reference_sphere_point([0.0, 0.0, 21.0], geometry)

    def test_invalid_sphere_point_has_an_exact_label(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
            project_reference_sphere_point,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Sphere point must be a finite 3-vector\.$",
        ):
            project_reference_sphere_point([np.nan, 0.0, 0.0], geometry)

    def test_projection_accepts_a_point_within_the_scale_aware_residual_tolerance(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            build_reference_sphere_geometry,
            project_reference_sphere_point,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        np.testing.assert_allclose(
            project_reference_sphere_point([0.0, 0.0, 20.0 + 5.0e-9], geometry),
            [0.0, 0.0],
        )

    def test_projection_rejects_a_point_beyond_the_scale_aware_residual_tolerance(
        self,
    ):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            build_reference_sphere_geometry,
            project_reference_sphere_point,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Projected point is not on the reference sphere\.$",
        ):
            project_reference_sphere_point([0.0, 0.0, 20.0 + 1.5e-8], geometry)

    def test_ideal_converging_spherical_wave_has_only_zero_opd(self):
        """Equal optical paths from one sphere produce no non-piston phase."""
        from rayoptics_web_utils.zernike import fit_zernike
        from rayoptics_web_utils.zernike.projected_pupil import (
            build_reference_sphere_geometry,
            intersect_pupil_side_sphere,
            project_reference_sphere_point,
        )

        geometry = build_reference_sphere_geometry(
            center=np.array([2.0, -1.0, 20.0]),
            pupil_reference=np.array([0.0, 0.0, 0.0]),
            preferred_x_axis=np.array([1.0, 0.0, 0.0]),
        )
        axis = np.linspace(-0.25 * geometry.radius, 0.25 * geometry.radius, 9)
        xx, yy = np.meshgrid(axis, axis)
        px = np.full_like(xx, np.nan)
        py = np.full_like(yy, np.nan)
        opd = np.full_like(xx, np.nan)
        aperture_radius = 0.3 * geometry.radius
        for index in np.ndindex(xx.shape):
            x = xx[index]
            y = yy[index]
            if np.hypot(x, y) > aperture_radius:
                continue
            axial = np.sqrt(geometry.radius**2 - x**2 - y**2)
            sphere_point = (
                geometry.center
                + x * geometry.ex
                + y * geometry.ey
                - axial * geometry.ez
            )
            direction = geometry.center - sphere_point
            reconstructed = intersect_pupil_side_sphere(
                sphere_point - direction, direction, geometry
            )
            projected = project_reference_sphere_point(reconstructed, geometry)
            px[index], py[index] = np.asarray(projected) / aperture_radius
            # Every reference-sphere point is exactly one radius from Q.
            opd[index] = np.linalg.norm(reconstructed - geometry.center) - geometry.radius

        coefficients = fit_zernike(
            np.array([px, py, opd]),
            [(0, 0), (1, 1), (1, -1), (2, 0), (2, 2), (2, -2)],
        )

        np.testing.assert_allclose(coefficients, 0.0, atol=1.0e-12)


class TestProjectedGridHelpers:
    """Raw ray grids retain geometry and OPD reference semantics."""

    @staticmethod
    def _transformed_case():
        from types import SimpleNamespace

        from rayoptics_web_utils.zernike.projected_pupil import (
            build_reference_sphere_geometry,
        )

        rotation = np.array(
            [
                [0.0, -1.0, 0.0],
                [1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0],
            ]
        )
        translation = np.array([10.0, 20.0, 0.0])
        geometry = build_reference_sphere_geometry(
            [10.0, 20.0, 10.0],
            [10.0, 20.0, 0.0],
            [1.0, 0.0, 0.0],
        )
        ray = [
            [["0.0", "0.0", "0.0"], ["0.0", "1.0", "0.0"]],
            [["1.0", "0.0", "0.0"], ["0.0", "0.0", "1.0"]],
            [["100.0", "100.0", "100.0"], ["1.0", "0.0", "0.0"]],
        ]
        ray_pkg = (ray,)
        raw_grid = [[("pupil", "trace", ray_pkg), ("blocked", "trace", None)]]
        optical_model = SimpleNamespace(
            seq_model=SimpleNamespace(
                gbl_tfrms=[
                    (np.eye(3), np.zeros(3)),
                    (rotation, translation),
                    (np.eye(3), np.array([100.0, 100.0, 100.0])),
                ]
            )
        )
        return raw_grid, optical_model, geometry

    def test_project_raw_grid_transforms_the_final_physical_ray_and_preserves_holes(
        self,
    ):
        from rayoptics_web_utils.zernike.projected_pupil import (
            _project_raw_grid,
        )

        raw_grid, optical_model, geometry = self._transformed_case()

        coordinates, valid = _project_raw_grid(raw_grid, optical_model, geometry)

        assert coordinates.shape == (1, 2, 2)
        assert valid.tolist() == [[True, False]]
        np.testing.assert_allclose(coordinates[0, 0], [0.0, 1.0], atol=1.0e-12)
        assert np.isnan(coordinates[0, 1]).all()

    def test_project_raw_grid_rejects_a_non_rectangular_grid_exactly(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            _project_raw_grid,
        )

        raw_grid, optical_model, geometry = self._transformed_case()
        raw_grid.append([raw_grid[0][0]])

        with pytest.raises(
            ValueError,
            match=r"^Projected-pupil input ray grid must be rectangular\.$",
        ):
            _project_raw_grid(raw_grid, optical_model, geometry)

    def test_project_raw_grid_empty_input_has_no_phantom_column(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            _project_raw_grid,
            build_reference_sphere_geometry,
        )

        geometry = build_reference_sphere_geometry(
            [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [1.0, 0.0, 0.0]
        )
        optical_model = self._transformed_case()[1]

        coordinates, valid = _project_raw_grid([], optical_model, geometry)

        assert coordinates.shape == (0, 0, 2)
        assert valid.shape == (0, 0)


class TestFrozenReferenceOpd:
    """Refined rays use the selected wavelength and frozen reference data."""

    def test_evaluates_only_traceable_rays_and_forwards_every_reference_argument(
        self, monkeypatch
    ):
        from types import SimpleNamespace

        from rayoptics.raytr import waveabr
        from rayoptics_web_utils import _finite_opd
        from rayoptics_web_utils.zernike import projected_pupil as module

        first_order_data = object()
        model_view = {
            "analysis_results": {
                "parax_data": SimpleNamespace(fod=first_order_data)
            }
        }
        calls = {}

        def fake_model_view(optical_model, wavelength_nm):
            calls["model_view"] = (optical_model, wavelength_nm)
            return model_view

        def fake_wave_abr(
            fod, field, wavelength_nm, foc, ray_pkg, chief_ray_pkg, ref_sphere
        ):
            calls["wave_abr"] = (
                fod,
                field,
                wavelength_nm,
                foc,
                ray_pkg,
                chief_ray_pkg,
                ref_sphere,
            )
            return 10.25

        monkeypatch.setattr(_finite_opd, "model_view_for_wavelength_opd", fake_model_view)
        monkeypatch.setattr(waveabr, "wave_abr_full_calc", fake_wave_abr)

        field = object()
        chief_ray_pkg = (object(), object())
        ref_sphere = (object(), object(), 12.0, object())
        ray_pkg = (object(),)
        raw_grid = [[("valid", "trace", ray_pkg), ("blocked", "trace", None)]]
        optical_model = SimpleNamespace(nm_to_sys_units=lambda value: value / 275.0)
        ray_grid = SimpleNamespace(
            piston="0.25",
            fld=field,
            foc="0.5",
            chief_ray_pkg=chief_ray_pkg,
            ref_sphere=ref_sphere,
        )

        result = module._opd_for_frozen_reference(
            raw_grid, ray_grid, optical_model, 550.0
        )

        assert calls["model_view"] == (optical_model, 550.0)
        assert calls["wave_abr"] == (
            first_order_data,
            field,
            550.0,
            "0.5",
            ray_pkg,
            chief_ray_pkg,
            ref_sphere,
        )
        np.testing.assert_allclose(result, [[5.0, np.nan]], equal_nan=True)
        assert result.dtype == np.dtype(float)

    def test_empty_raw_grid_returns_an_empty_two_dimensional_array(self, monkeypatch):
        from types import SimpleNamespace

        from rayoptics_web_utils import _finite_opd
        from rayoptics_web_utils.zernike import projected_pupil as module

        monkeypatch.setattr(
            _finite_opd,
            "model_view_for_wavelength_opd",
            lambda optical_model, wavelength_nm: {
                "analysis_results": {
                    "parax_data": SimpleNamespace(fod=object())
                }
            },
        )
        optical_model = SimpleNamespace(nm_to_sys_units=lambda value: 1.0)
        ray_grid = SimpleNamespace(
            fld=object(),
            foc=0.0,
            chief_ray_pkg=(object(), object()),
            ref_sphere=(object(), object(), 1.0, object()),
        )

        result = module._opd_for_frozen_reference([], ray_grid, optical_model, 550.0)

        assert result.shape == (0, 0)

    def test_missing_piston_defaults_to_zero(self, monkeypatch):
        from types import SimpleNamespace

        from rayoptics.raytr import waveabr
        from rayoptics_web_utils import _finite_opd
        from rayoptics_web_utils.zernike import projected_pupil as module

        monkeypatch.setattr(
            _finite_opd,
            "model_view_for_wavelength_opd",
            lambda optical_model, wavelength_nm: {
                "analysis_results": {
                    "parax_data": SimpleNamespace(fod=object())
                }
            },
        )
        monkeypatch.setattr(
            waveabr,
            "wave_abr_full_calc",
            lambda *args: 3.0,
        )
        optical_model = SimpleNamespace(nm_to_sys_units=lambda value: 2.0)
        ray_pkg = (object(),)
        ray_grid = SimpleNamespace(
            fld=object(),
            foc=0.0,
            chief_ray_pkg=(object(), object()),
            ref_sphere=(object(), object(), 1.0, object()),
        )

        result = module._opd_for_frozen_reference(
            [[("valid", "trace", ray_pkg)]], ray_grid, optical_model, 550.0
        )

        np.testing.assert_allclose(result, [[1.5]])


class TestReferenceSphereFromRayGrid:
    """RayGrid metadata resolves one transformed sphere in global coordinates."""

    @staticmethod
    def _case():
        from types import SimpleNamespace

        image_rotation = np.array(
            [
                [0.0, -1.0, 0.0],
                [1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0],
            ]
        )
        image_translation = np.array([10.0, 20.0, 0.0])
        last_rotation = np.eye(3)
        last_translation = np.array([10.0, 21.0, 0.0])
        chief_ray = SimpleNamespace(
            ray=[
                [["9.0", "9.0", "9.0"], ["1.0", "0.0", "0.0"]],
                [["1.0", "0.0", "0.0"], ["0.0", "0.0", "1.0"]],
                [["100.0", "100.0", "100.0"], ["1.0", "0.0", "0.0"]],
            ]
        )
        radius = float(np.sqrt(101.0))
        ray_grid = SimpleNamespace(
            ref_sphere=(["1.0", "0.0", "10.0"], object(), str(radius)),
            chief_ray_pkg=(chief_ray, ["unused", "unused", "0.0"]),
        )
        optical_model = SimpleNamespace(
            seq_model=SimpleNamespace(
                gbl_tfrms=[
                    (np.eye(3), np.zeros(3)),
                    (last_rotation, last_translation),
                    (image_rotation, image_translation),
                ]
            )
        )
        return ray_grid, optical_model, radius

    def test_resolves_transformed_numeric_metadata_and_image_x_axis(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            reference_sphere_geometry_from_ray_grid,
        )

        ray_grid, optical_model, radius = self._case()

        geometry = reference_sphere_geometry_from_ray_grid(ray_grid, optical_model)

        np.testing.assert_allclose(geometry.center, [10.0, 21.0, 10.0])
        np.testing.assert_allclose(geometry.pupil_reference, [11.0, 21.0, 0.0])
        assert geometry.radius == pytest.approx(radius)
        np.testing.assert_allclose(geometry.ex, [0.0, 1.0, 0.0])

    def test_requires_both_reference_sphere_metadata_fields(self):
        from types import SimpleNamespace

        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            reference_sphere_geometry_from_ray_grid,
        )

        ray_grid, optical_model, _ = self._case()
        missing_ref_sphere = SimpleNamespace(chief_ray_pkg=ray_grid.chief_ray_pkg)
        missing_chief_ray = SimpleNamespace(ref_sphere=ray_grid.ref_sphere)

        for incomplete in (missing_ref_sphere, missing_chief_ray):
            with pytest.raises(
                ProjectedPupilGeometryError,
                match=(
                    r"^Finite projected-pupil sampling requires explicit "
                    r"RayGrid reference metadata\.$"
                ),
            ):
                reference_sphere_geometry_from_ray_grid(incomplete, optical_model)

    def test_rejects_a_ray_grid_sphere_with_a_different_radius_exactly(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            reference_sphere_geometry_from_ray_grid,
        )

        ray_grid, optical_model, radius = self._case()
        ray_grid.ref_sphere = (
            ray_grid.ref_sphere[0],
            ray_grid.ref_sphere[1],
            radius * (1.0 + 1.0e-7),
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=(
                r"^RayGrid OPD sphere and projected-pupil sphere have different "
                r"radii\.$"
            ),
        ):
            reference_sphere_geometry_from_ray_grid(ray_grid, optical_model)


class TestProjectedAreaWeights:
    """Connected mapped cells provide projected-area quadrature."""

    def test_coerces_numeric_coordinates_and_numeric_validity_to_public_types(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            projected_area_vertex_weights,
        )

        coordinates = np.array(
            [
                [["0.0", "0.0"], ["1.0", "0.0"]],
                [["0.0", "1.0"], ["1.0", "1.0"]],
            ]
        )
        valid = np.ones((2, 2), dtype=int)

        weights = projected_area_vertex_weights(coordinates, valid)

        assert weights.dtype == np.dtype(float)
        assert np.sum(weights) == pytest.approx(1.0)

    def test_duplicate_detection_uses_the_absolute_coordinate_scale_floor(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            projected_area_vertex_weights,
        )

        coordinates = np.zeros((4, 4, 2))
        coordinates[:2, :2] = [
            [[0.0, 0.0], [1.0, 0.0]],
            [[0.0, 1.0], [1.0, 1.0]],
        ]
        coordinates[3, 2] = [0.8, 0.9]
        coordinates[3, 3] = [0.8 + 1.5e-10, 0.9]
        valid = np.zeros((4, 4), dtype=bool)
        valid[:2, :2] = True
        valid[3, 2:] = True

        weights = projected_area_vertex_weights(coordinates, valid)

        assert np.sum(weights) == pytest.approx(1.0)

    def test_duplicate_detection_scales_with_a_wider_projected_support(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            projected_area_vertex_weights,
        )

        coordinates = np.zeros((4, 4, 2))
        coordinates[:2, :2] = [
            [[0.0, 0.0], [2.0, 0.0]],
            [[0.0, 1.0], [2.0, 1.0]],
        ]
        coordinates[3, 2] = [1.8, 0.9]
        coordinates[3, 3] = [1.8 + 1.0e-10, 0.9]
        valid = np.zeros((4, 4), dtype=bool)
        valid[:2, :2] = True
        valid[3, 2:] = True

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Projected pupil contains overlapping or duplicate mapping branches\.$",
        ):
            projected_area_vertex_weights(coordinates, valid)

    def test_two_duplicate_vertices_are_reported_before_the_no_cell_error(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            projected_area_vertex_weights,
        )

        coordinates = np.zeros((2, 2, 2))
        valid = np.array([[True, False], [False, True]])

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Projected pupil contains overlapping or duplicate mapping branches\.$",
        ):
            projected_area_vertex_weights(coordinates, valid)

    @pytest.mark.parametrize("offset,scale", [((0.25, 0.25), 1.0), ((0.2, 0.2), 0.3)])
    def test_overlapping_interiors_without_duplicate_vertices_are_rejected(self, offset, scale):
        """Crossing and contained branches must fail even with distinct vertices."""
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            projected_area_vertex_weights,
        )

        coordinates = np.zeros((2, 5, 2))
        coordinates[:, :2] = [[[0, 0], [0, 1]], [[1, 0], [1, 1]]]
        coordinates[:, 3:] = coordinates[:, :2] * scale + offset
        valid = np.ones((2, 5), dtype=bool)
        valid[:, 2] = False
        with pytest.raises(ProjectedPupilGeometryError, match="overlapping"):
            projected_area_vertex_weights(coordinates, valid)

    @pytest.mark.parametrize(
        "coordinates, valid",
        [
            (np.zeros((2, 2, 3)), np.ones((2, 2), dtype=bool)),
            (np.zeros((2, 2, 2)), np.ones((3, 2), dtype=bool)),
        ],
    )
    def test_rejects_incompatible_coordinate_and_mask_shapes_exactly(
        self, coordinates, valid
    ):
        from rayoptics_web_utils.zernike.projected_pupil import projected_area_vertex_weights

        with pytest.raises(
            ValueError,
            match=r"^Projected coordinates and validity mask have incompatible shapes\.$",
        ):
            projected_area_vertex_weights(coordinates, valid)

    @pytest.mark.parametrize("shape", [(1, 2), (2, 1)])
    def test_requires_at_least_a_two_by_two_grid(self, shape):
        from rayoptics_web_utils.zernike.projected_pupil import projected_area_vertex_weights

        with pytest.raises(
            ValueError,
            match=r"^Projected-area integration requires at least a 2 by 2 grid\.$",
        ):
            projected_area_vertex_weights(
                np.zeros((*shape, 2)), np.ones(shape, dtype=bool)
            )

    def test_rejects_nonfinite_valid_coordinates_exactly(self):
        from rayoptics_web_utils.zernike.projected_pupil import projected_area_vertex_weights

        coordinates = np.zeros((2, 2, 2))
        coordinates[0, 0, 0] = np.nan

        with pytest.raises(
            ValueError, match=r"^Valid projected coordinates must be finite\.$"
        ):
            projected_area_vertex_weights(coordinates, np.ones((2, 2), dtype=bool))

    def test_rejects_a_grid_with_no_fully_transmitted_cell_exactly(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            projected_area_vertex_weights,
        )

        valid = np.array([[True, False], [False, False]])

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Projected pupil contains no fully transmitted connected cells\.$",
        ):
            projected_area_vertex_weights(np.zeros((2, 2, 2)), valid)

    def test_rejects_a_singular_mapped_cell_with_an_exact_error(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            projected_area_vertex_weights,
        )

        axis = np.linspace(0.0, 3.0, 4)
        coordinates = np.stack(
            [np.tile(axis[:2], (2, 1)), np.zeros((2, 2))], axis=-1
        )
        coordinates[1, :, 0] = axis[2:]

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Projected-pupil mapping contains a singular cell\.$",
        ):
            projected_area_vertex_weights(coordinates, np.ones((2, 2), dtype=bool))

    def test_keeps_the_second_triangle_when_the_first_triangle_is_clipped(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            projected_area_vertex_weights,
        )

        coordinates = np.array(
            [
                [[0.0, 0.0], [0.0, 1.0]],
                [[1.0, 1.0], [2.0, 2.0]],
            ]
        )
        valid = np.array([[True, True], [False, True]])

        weights = projected_area_vertex_weights(coordinates, valid)

        assert np.sum(weights) == pytest.approx(1.0)
        assert weights[1, 0] == 0.0
        assert np.count_nonzero(weights) == 3

    def test_singular_area_at_machine_epsilon_is_rejected(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            projected_area_vertex_weights,
        )

        epsilon = np.finfo(float).eps
        coordinates = np.array(
            [
                [[0.0, 0.0], [0.0, 1.0]],
                [[1.0, 1.0], [2.0, 2.0 + 2.0 * epsilon]],
            ]
        )

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Projected-pupil mapping contains a singular cell\.$",
        ):
            projected_area_vertex_weights(coordinates, np.ones((2, 2), dtype=bool))

    def test_rejects_orientation_reversal_with_an_exact_error(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            projected_area_vertex_weights,
        )

        axis = np.array([-1.0, -0.1, 0.1, 1.0])
        xx, yy = np.meshgrid(axis, axis)
        coordinates = np.stack([xx**2 + 0.02 * xx, yy], axis=-1)

        with pytest.raises(
            ProjectedPupilGeometryError,
            match=r"^Projected-pupil mapping contains a fold or orientation reversal\.$",
        ):
            projected_area_vertex_weights(coordinates, np.ones(xx.shape, dtype=bool))

    def test_disjoint_triangles_with_overlapping_bounding_boxes_are_accepted(self):
        """Broad-phase bounds alone must not reject separate pupil regions."""
        from rayoptics_web_utils.zernike.projected_pupil import projected_area_vertex_weights

        coordinates = np.zeros((2, 5, 2))
        coordinates[0, 0], coordinates[1, 0], coordinates[1, 1] = [0, 0], [1, 0], [0, 1]
        coordinates[0, 3], coordinates[1, 3], coordinates[1, 4] = [1, 1], [0.6, 1], [1, 0.6]
        valid = np.zeros((2, 5), dtype=bool)
        valid[0, [0, 3]] = True
        valid[1, [0, 1, 3, 4]] = True
        assert projected_area_vertex_weights(coordinates, valid).sum() == pytest.approx(0.58)

    def test_linear_elliptical_mapping_integrates_exact_area(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            projected_area_vertex_weights,
        )

        axis = np.linspace(-1.0, 1.0, 9)
        xx, yy = np.meshgrid(axis, axis, indexing="ij")
        coordinates = np.stack([2.0 * xx + 0.3 * yy, 0.5 * yy], axis=-1)

        weights = projected_area_vertex_weights(
            coordinates, np.ones(xx.shape, dtype=bool)
        )

        # det([[2, .3], [0, .5]]) * area([-1,1]^2) = 4.
        assert np.sum(weights) == pytest.approx(4.0, rel=1.0e-12)
        assert np.all(weights > 0.0)

    def test_blocked_hole_is_not_triangulated(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            projected_area_vertex_weights,
        )

        axis = np.linspace(-1.0, 1.0, 5)
        xx, yy = np.meshgrid(axis, axis, indexing="ij")
        coordinates = np.stack([xx, yy], axis=-1)
        valid = np.ones(xx.shape, dtype=bool)
        valid[2, 2] = False

        weights = projected_area_vertex_weights(coordinates, valid)

        assert weights[2, 2] == 0.0
        assert np.sum(weights) < 4.0

    def test_mapping_reversal_is_rejected_before_absolute_area(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            projected_area_vertex_weights,
        )

        axis = np.linspace(-1.0, 1.0, 7)
        xx, yy = np.meshgrid(axis, axis, indexing="ij")
        coordinates = np.stack([xx**2, yy], axis=-1)

        with pytest.raises(
            ProjectedPupilGeometryError, match="fold|overlapping"
        ):
            projected_area_vertex_weights(
                coordinates, np.ones(xx.shape, dtype=bool)
            )

    def test_disconnected_overlapping_branches_are_rejected(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            projected_area_vertex_weights,
        )

        coordinates = np.zeros((2, 5, 2), dtype=float)
        coordinates[:, 0, :] = [[0.0, 0.0], [1.0, 0.0]]
        coordinates[:, 1, :] = [[0.0, 1.0], [1.0, 1.0]]
        coordinates[:, 3, :] = coordinates[:, 0, :]
        coordinates[:, 4, :] = coordinates[:, 1, :]
        valid = np.ones((2, 5), dtype=bool)
        valid[:, 2] = False

        with pytest.raises(ProjectedPupilGeometryError, match="overlapping"):
            projected_area_vertex_weights(coordinates, valid)


class TestProjectedAreaOverlapBatches:
    """Broad-phase overlap detection examines every triangle batch."""

    @staticmethod
    def _triangle(x, y):
        return np.array([[x, y], [x + 1.0, y], [x, y + 1.0]])

    def test_overlap_in_the_first_triangle_batch_is_not_skipped(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            _reject_overlapping_triangles,
        )

        vertices = np.array(
            [
                self._triangle(0.0, 0.0),
                self._triangle(0.25, 0.25),
                *[self._triangle(10.0 + 3.0 * index, 10.0) for index in range(256)],
            ]
        )

        with pytest.raises(
            ProjectedPupilGeometryError, match=r"^Projected pupil contains overlapping"
        ):
            _reject_overlapping_triangles(vertices)

    def test_overlap_in_a_later_triangle_batch_is_not_skipped(self):
        from rayoptics_web_utils.zernike.projected_pupil import (
            ProjectedPupilGeometryError,
            _reject_overlapping_triangles,
        )

        vertices = np.array(
            [
                *[self._triangle(10.0 + 3.0 * index, 10.0) for index in range(256)],
                self._triangle(2000.0, 2000.0),
                self._triangle(2000.25, 2000.25),
            ]
        )

        with pytest.raises(
            ProjectedPupilGeometryError, match=r"^Projected pupil contains overlapping"
        ):
            _reject_overlapping_triangles(vertices)


class TestOpticalSamplingConvergence:
    """Finite optical fits converge with a frozen sphere and normalization disk."""

    @staticmethod
    def _mocked_sampling(
        monkeypatch,
        *,
        coordinates=None,
        geometry_valid=None,
        weights=None,
        opd=None,
        num_rays=2,
    ):
        from types import SimpleNamespace

        from rayoptics_web_utils.zernike import projected_pupil as module

        if coordinates is None:
            axis = np.linspace(0.0, 1.0, num_rays)
            coordinates = np.stack(
                np.meshgrid(axis, axis, indexing="xy"), axis=-1
            )
        coordinates = np.array(coordinates, dtype=float)
        grid_shape = coordinates.shape[:2]
        geometry_valid = np.array(
            geometry_valid
            if geometry_valid is not None
            else np.ones(grid_shape, dtype=bool),
            dtype=bool,
        )
        weights = np.array(
            weights
            if weights is not None
            else np.full(grid_shape, 0.1),
            dtype=float,
        )
        raw_opd = opd if opd is not None else np.ones(grid_shape)
        opd = np.array(raw_opd, dtype=None if opd is not None else float)
        geometry = object()
        calls = {"raw_grid": [], "sample_valid_rays": []}

        class OpticalModel:
            optical_spec = SimpleNamespace(
                wvls=SimpleNamespace(central_wvl=500.0)
            )

            def __getitem__(self, key):
                if key == "optical_spec":
                    return {"wvls": self.optical_spec.wvls}
                raise KeyError(key)

            @staticmethod
            def nm_to_sys_units(value):
                return float(value) / 100.0

        ray_grid = SimpleNamespace(
            num_rays=num_rays,
            raw_grid=[["raw"]],
            grid_pkg=[["fallback"]],
            grid=[
                np.zeros((num_rays, num_rays)),
                np.zeros((num_rays, num_rays)),
                opd,
            ],
            fld="field",
            foc="focus",
        )
        optical_model = OpticalModel()

        monkeypatch.setattr(
            module,
            "reference_sphere_geometry_from_ray_grid",
            lambda ray_grid, optical_model: geometry,
        )

        def fake_project(raw_grid, optical_model, received_geometry):
            calls["raw_grid"].append(raw_grid)
            return coordinates.copy(), geometry_valid.copy()

        monkeypatch.setattr(module, "_project_raw_grid", fake_project)
        monkeypatch.setattr(
            module,
            "projected_area_vertex_weights",
            lambda received_coordinates, received_valid: weights.copy(),
        )
        return module, ray_grid, optical_model, geometry, calls

    def test_public_defaults_preserve_the_sampling_contract(self):
        import inspect

        from rayoptics_web_utils.zernike.projected_pupil import (
            build_finite_projected_pupil_samples,
        )

        parameters = inspect.signature(build_finite_projected_pupil_samples).parameters

        assert parameters["boundary_tolerance"].default == 5.0e-3
        assert parameters["area_tolerance"].default == 2.0e-2
        assert parameters["max_boundary_resolution"].default == 129

    def test_two_by_two_fit_uses_the_raw_grid_and_scales_cached_opd(self, monkeypatch):
        coordinates = [
            [[0.0, 0.0], [3.0, 0.0]],
            [[0.0, 4.0], [3.0, 4.0]],
        ]
        opd = np.array([["1.0", "2.0"], ["3.0", "4.0"]])
        module, ray_grid, optical_model, _, calls = self._mocked_sampling(
            monkeypatch,
            coordinates=coordinates,
            opd=opd,
        )

        result = module.build_finite_projected_pupil_samples(
            ray_grid,
            optical_model,
            550.0,
            fit_resolution=2,
            max_boundary_resolution=2,
        )

        assert calls["raw_grid"] == [ray_grid.raw_grid]
        assert result.normalization_radius == pytest.approx(
            5.0 * (1.0 + 1.0e-10)
        )
        np.testing.assert_allclose(
            result.grid[2], np.asarray(opd, dtype=float) * (500.0 / 550.0)
        )
        assert result.boundary_resolution == 2

    def test_fixed_normalization_radius_prevents_boundary_refinement(self, monkeypatch):
        from rayoptics_web_utils.raygrid import opd_reference

        module, ray_grid, optical_model, _, calls = self._mocked_sampling(monkeypatch)
        monkeypatch.setattr(
            opd_reference,
            "sample_valid_rays",
            lambda *args: pytest.fail("fixed normalization should not refine"),
        )

        result = module.build_finite_projected_pupil_samples(
            ray_grid,
            optical_model,
            550.0,
            fixed_normalization_radius=1.0,
            max_boundary_resolution=5,
        )

        assert result.boundary_converged
        assert calls["raw_grid"] == [ray_grid.raw_grid]

    def test_fit_grid_falls_back_to_the_raygrid_package_raw_grid(self, monkeypatch):
        """The initial fit uses the packaged raw grid when no direct raw grid exists."""
        module, ray_grid, optical_model, _, calls = self._mocked_sampling(monkeypatch)
        fallback_raw_grid = ray_grid.grid_pkg[0]
        del ray_grid.raw_grid

        module.build_finite_projected_pupil_samples(
            ray_grid,
            optical_model,
            550.0,
            fixed_normalization_radius=1.0,
            max_boundary_resolution=2,
        )

        assert calls["raw_grid"] == [fallback_raw_grid]

    def test_boundary_refinement_uses_nested_resolution_and_all_raygrid_arguments(
        self, monkeypatch
    ):
        """Refinement doubles resolution minus one and preserves wavelength/focus."""
        from rayoptics_web_utils.raygrid import opd_reference

        coordinates = [
            [[0.0, 0.0], [2.0, 0.0]],
            [[0.0, 0.5], [2.0, 0.5]],
        ]
        module, ray_grid, optical_model, _, calls = self._mocked_sampling(
            monkeypatch, coordinates=coordinates, num_rays=2
        )
        refined_raw_grid = [["refined"]]
        monkeypatch.setattr(
            opd_reference,
            "sample_valid_rays",
            lambda *args: calls["sample_valid_rays"].append(args) or refined_raw_grid,
        )
        monkeypatch.setattr(
            module,
            "_opd_for_frozen_reference",
            lambda *args: np.ones((2, 2)),
        )

        result = module.build_finite_projected_pupil_samples(
            ray_grid,
            optical_model,
            550.0,
            max_boundary_resolution=5,
        )

        assert calls["sample_valid_rays"] == [
            (optical_model, ray_grid.fld, 550.0, ray_grid.foc, 3)
        ]
        assert result.boundary_resolution == 3
        assert result.boundary_converged is True

    def test_refined_final_acceptance_keeps_only_geometry_valid_samples(self, monkeypatch):
        """Finite OPD cannot make a geometrically blocked refined sample valid."""
        from rayoptics_web_utils.raygrid import opd_reference

        module, ray_grid, optical_model, _, calls = self._mocked_sampling(
            monkeypatch, num_rays=2
        )
        refined_raw_grid = [["refined"]]
        refined_valid = np.array([[True, False], [False, False]])
        monkeypatch.setattr(
            opd_reference,
            "sample_valid_rays",
            lambda *args: calls["sample_valid_rays"].append(args) or refined_raw_grid,
        )
        monkeypatch.setattr(
            module,
            "_project_raw_grid",
            lambda raw_grid, optical_model, geometry: (
                (
                    np.array(
                        [
                            [[0.0, 0.0], [1.0, 0.0]],
                            [[0.0, 1.0], [1.0, 1.0]],
                        ]
                    ),
                    refined_valid,
                )
                if raw_grid == refined_raw_grid
                else (
                    np.array(
                        [
                            [[0.0, 0.0], [1.0, 0.0]],
                            [[0.0, 1.0], [1.0, 1.0]],
                        ]
                    ),
                    np.ones((2, 2), dtype=bool),
                )
            ),
        )
        monkeypatch.setattr(
            module,
            "_opd_for_frozen_reference",
            lambda *args: np.ones((2, 2)),
        )

        result = module.build_finite_projected_pupil_samples(
            ray_grid,
            optical_model,
            550.0,
            max_boundary_resolution=3,
        )

        assert result.sample_count == 1
        assert result.support_area == pytest.approx(0.1)

    def test_final_acceptance_includes_the_normalization_boundary_tolerance(
        self, monkeypatch
    ):
        """A point at the documented numerical enclosure margin remains accepted."""
        coordinates = [
            [[0.0, 0.0], [1.0 + 1.0e-12, 0.0]],
            [[0.0, 0.5], [0.5, 0.5]],
        ]
        module, ray_grid, optical_model, _, _ = self._mocked_sampling(
            monkeypatch, coordinates=coordinates
        )

        result = module.build_finite_projected_pupil_samples(
            ray_grid,
            optical_model,
            550.0,
            fixed_normalization_radius=1.0,
            max_boundary_resolution=2,
        )

        assert result.sample_count == 4
        assert np.isfinite(result.grid[0, 0, 1])

    def test_fit_resolution_two_samples_refined_rays_with_wavelength_and_focus(
        self, monkeypatch
    ):
        from rayoptics_web_utils.raygrid import opd_reference

        module, ray_grid, optical_model, _, calls = self._mocked_sampling(
            monkeypatch, num_rays=3
        )
        ray_grid.grid[2] = np.ones((3, 3))
        refined_raw_grid = [["refined"]]
        monkeypatch.setattr(
            opd_reference,
            "sample_valid_rays",
            lambda *args: calls["sample_valid_rays"].append(args) or refined_raw_grid,
        )
        monkeypatch.setattr(
            module,
            "_opd_for_frozen_reference",
            lambda raw_grid, *args: np.ones((3, 3)),
        )

        module.build_finite_projected_pupil_samples(
            ray_grid,
            optical_model,
            550.0,
            fit_resolution=2,
            fixed_normalization_radius=1.0,
            max_boundary_resolution=2,
        )

        assert calls["sample_valid_rays"] == [
            (optical_model, ray_grid.fld, 550.0, ray_grid.foc, 2)
        ]

    @pytest.mark.parametrize(
        ("boundary_tolerance", "area_tolerance"),
        [(np.nan, 0.1), (0.1, np.nan)],
    )
    def test_rejects_nonfinite_convergence_tolerances_exactly(
        self, monkeypatch, boundary_tolerance, area_tolerance
    ):
        from types import SimpleNamespace

        from rayoptics_web_utils.zernike import projected_pupil as module

        monkeypatch.setattr(
            module,
            "reference_sphere_geometry_from_ray_grid",
            lambda ray_grid, optical_model: object(),
        )
        ray_grid = SimpleNamespace(num_rays=2)

        with pytest.raises(
            ValueError,
            match=r"^Projected-pupil convergence tolerances must be positive\.$",
        ):
            module.build_finite_projected_pupil_samples(
                ray_grid,
                object(),
                550.0,
                boundary_tolerance=boundary_tolerance,
                area_tolerance=area_tolerance,
            )

    def test_rejects_a_nonfinite_fixed_normalization_radius_exactly(self, monkeypatch):
        from types import SimpleNamespace

        from rayoptics_web_utils.zernike import projected_pupil as module

        monkeypatch.setattr(
            module,
            "reference_sphere_geometry_from_ray_grid",
            lambda ray_grid, optical_model: object(),
        )
        ray_grid = SimpleNamespace(num_rays=2)

        with pytest.raises(
            ValueError,
            match=r"^Fixed normalization radius must be positive and finite\.$",
        ):
            module.build_finite_projected_pupil_samples(
                ray_grid, object(), 550.0, fixed_normalization_radius=np.nan
            )

    def test_no_finite_initial_samples_have_an_exact_error(self, monkeypatch):
        module, ray_grid, optical_model, _, _ = self._mocked_sampling(
            monkeypatch,
            opd=np.full((2, 2), np.nan),
        )

        with pytest.raises(
            module.ProjectedPupilGeometryError,
            match=r"^No finite projected-pupil samples are available\.$",
        ):
            module.build_finite_projected_pupil_samples(
                ray_grid, optical_model, 550.0, max_boundary_resolution=2
            )

    def test_zero_initial_enclosing_radius_has_an_exact_error(self, monkeypatch):
        module, ray_grid, optical_model, _, _ = self._mocked_sampling(
            monkeypatch,
            coordinates=np.zeros((2, 2, 2)),
        )

        with pytest.raises(
            module.ProjectedPupilGeometryError,
            match=r"^Projected pupil has an invalid enclosing radius\.$",
        ):
            module.build_finite_projected_pupil_samples(
                ray_grid, optical_model, 550.0, max_boundary_resolution=2
            )

    def test_empty_refined_geometry_has_an_exact_error(self, monkeypatch):
        from rayoptics_web_utils.raygrid import opd_reference

        module, ray_grid, optical_model, _, _ = self._mocked_sampling(monkeypatch)
        monkeypatch.setattr(
            opd_reference, "sample_valid_rays", lambda *args: [["refined"]]
        )

        def project_raw_grid(raw_grid, optical_model, geometry):
            if raw_grid == [["refined"]]:
                return (
                    np.full((2, 2, 2), np.nan),
                    np.zeros((2, 2), dtype=bool),
                )
            return np.array(
                [
                    [[0.0, 0.0], [1.0, 0.0]],
                    [[0.0, 1.0], [1.0, 1.0]],
                ]
            ), np.ones((2, 2), dtype=bool)

        monkeypatch.setattr(
            module, "_project_raw_grid", project_raw_grid
        )

        with pytest.raises(
            module.ProjectedPupilGeometryError,
            match=r"^Boundary refinement produced no projected-pupil samples\.$",
        ):
            module.build_finite_projected_pupil_samples(
                ray_grid, optical_model, 550.0, max_boundary_resolution=3
            )

    def test_final_acceptance_requires_valid_positive_weight_inside_disk(
        self, monkeypatch
    ):
        module, ray_grid, optical_model, _, _ = self._mocked_sampling(
            monkeypatch,
            coordinates=[
                [[0.0, 0.0], [0.5, 0.0]],
                [[0.0, 0.5], [1.0, 0.0]],
            ],
            geometry_valid=[[True, False], [True, True]],
            weights=[[0.1, 0.1], [0.1, 0.0]],
        )

        result = module.build_finite_projected_pupil_samples(
            ray_grid,
            optical_model,
            550.0,
            fixed_normalization_radius=1.0,
            max_boundary_resolution=2,
        )

        assert result.sample_count == 2
        assert result.weights.tolist() == [[0.1, 0.0], [0.1, 0.0]]
        assert np.isnan(result.grid[2, 0, 1])
        assert np.isnan(result.grid[2, 1, 1])

    def test_boundary_point_is_included_and_outside_point_is_excluded(self, monkeypatch):
        module, ray_grid, optical_model, _, _ = self._mocked_sampling(
            monkeypatch,
            coordinates=[
                [[0.0, 0.0], [1.0, 0.0]],
                [[0.0, 1.0], [1.5, 0.0]],
            ],
        )

        result = module.build_finite_projected_pupil_samples(
            ray_grid,
            optical_model,
            550.0,
            fixed_normalization_radius=1.0,
            max_boundary_resolution=2,
        )

        assert result.sample_count == 3
        assert np.isfinite(result.grid[0, 0, 1])
        assert np.isnan(result.grid[0, 1, 1])

    def test_support_exceeding_the_normalization_circle_has_an_exact_error(
        self, monkeypatch
    ):
        module, ray_grid, optical_model, _, _ = self._mocked_sampling(
            monkeypatch,
            weights=np.full((2, 2), 2.0),
        )

        with pytest.raises(
            module.ProjectedPupilGeometryError,
            match=r"^Projected support exceeds its enclosing normalization circle\.$",
        ):
            module.build_finite_projected_pupil_samples(
                ray_grid,
                optical_model,
                550.0,
                fixed_normalization_radius=1.0,
                max_boundary_resolution=2,
            )

    def test_build_samples_rejects_invalid_resolution_and_tolerances(self, monkeypatch):
        from types import SimpleNamespace

        from rayoptics_web_utils.zernike import projected_pupil as module

        monkeypatch.setattr(
            module,
            "reference_sphere_geometry_from_ray_grid",
            lambda ray_grid, optical_model: object(),
        )
        ray_grid = SimpleNamespace(num_rays=5)

        with pytest.raises(
            ValueError,
            match=r"^Projected-pupil sampling requires at least two rays per axis\.$",
        ):
            module.build_finite_projected_pupil_samples(
                ray_grid, object(), 550.0, fit_resolution=1
            )

        with pytest.raises(
            ValueError,
            match=r"^Projected-pupil convergence tolerances must be positive\.$",
        ):
            module.build_finite_projected_pupil_samples(
                ray_grid, object(), 550.0, boundary_tolerance=0.0
            )

        with pytest.raises(
            ValueError,
            match=r"^Projected-pupil convergence tolerances must be positive\.$",
        ):
            module.build_finite_projected_pupil_samples(
                ray_grid, object(), 550.0, area_tolerance=0.0
            )

        with pytest.raises(
            ValueError,
            match=r"^Maximum boundary resolution cannot be below the fit grid resolution\.$",
        ):
            module.build_finite_projected_pupil_samples(
                ray_grid, object(), 550.0, max_boundary_resolution=4
            )

        with pytest.raises(
            ValueError,
            match=r"^Fixed normalization radius must be positive and finite\.$",
        ):
            module.build_finite_projected_pupil_samples(
                ray_grid, object(), 550.0, fixed_normalization_radius=0.0
            )

    def test_sasian_on_and_full_field_converge_for_both_references(
        self, sasian_triplet_autoaperture
    ):
        from rayoptics_web_utils.raygrid import make_ray_grid
        from rayoptics_web_utils.zernike.projected_pupil import (
            build_finite_projected_pupil_samples,
        )
        from rayoptics_web_utils.zernike.zernike import _fit_zernike_details

        wavelength = (
            sasian_triplet_autoaperture.optical_spec.spectral_region.central_wvl
        )
        for image_point in ("chief_ray", "centroid"):
            for field_index in (0, 2):
                reference_grid = make_ray_grid(
                    sasian_triplet_autoaperture,
                    fi=field_index,
                    wavelength_nm=wavelength,
                    image_point=image_point,
                    num_rays=33,
                )
                resolved = build_finite_projected_pupil_samples(
                    reference_grid,
                    sasian_triplet_autoaperture,
                    wavelength,
                    max_boundary_resolution=129,
                )
                assert resolved.boundary_converged
                assert resolved.boundary_resolution >= 129
                areas = []
                rms_values = []
                defocus_coefficients = []
                terms = [
                    (0, 0), (1, 1), (1, -1), (2, 0), (2, -2),
                    (2, 2), (3, -1), (3, 1), (4, 0),
                ]
                for resolution in (9, 17, 33):
                    samples = build_finite_projected_pupil_samples(
                        reference_grid,
                        sasian_triplet_autoaperture,
                        wavelength,
                        fit_resolution=resolution,
                        max_boundary_resolution=resolution,
                        fixed_normalization_radius=resolved.normalization_radius,
                    )
                    accepted = samples.weights > 0.0
                    values = samples.grid[2][accepted]
                    weights = samples.weights[accepted]
                    mean = np.average(values, weights=weights)
                    areas.append(samples.support_area)
                    rms_values.append(
                        float(
                            np.sqrt(
                                np.average((values - mean) ** 2, weights=weights)
                            )
                        )
                    )
                    coefficients, _, _, _ = _fit_zernike_details(
                        samples.grid, terms, samples.weights
                    )
                    defocus_coefficients.append(float(coefficients[3]))

                assert abs(areas[2] - areas[1]) < abs(areas[1] - areas[0])
                assert abs(rms_values[2] - rms_values[1]) < abs(
                    rms_values[1] - rms_values[0]
                )
                assert abs(defocus_coefficients[2] - defocus_coefficients[1]) < abs(
                    defocus_coefficients[1] - defocus_coefficients[0]
                )
