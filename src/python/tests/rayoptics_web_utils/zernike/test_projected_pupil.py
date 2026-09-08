"""Behavioral tests for finite image-space projected-pupil sampling."""

import numpy as np
import pytest


def _rigid_transform(point, rotation, translation):
    return rotation @ np.asarray(point, dtype=float) + translation


class TestReferenceSphereGeometry:
    """Reference-sphere points use one explicit Cartesian frame."""

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


class TestProjectedAreaWeights:
    """Connected mapped cells provide projected-area quadrature."""

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


class TestOpticalSamplingConvergence:
    """Finite optical fits converge with a frozen sphere and normalization disk."""

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
