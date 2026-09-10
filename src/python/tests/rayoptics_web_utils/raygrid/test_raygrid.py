"""Behavioral tests for ray-grid sampling and image-reference helpers."""

import pytest
import numpy as np


class TestMakeRayGrid:
    """Tests for make_ray_grid()."""

    @pytest.mark.parametrize("wvl_idx", [0, 1, 2], ids=["F", "d", "C"])
    def test_finite_grid_uses_traced_wavelength_indices_without_mutating_cache(
        self,
        dispersive_image_space_model,
        monkeypatch,
        wvl_idx,
    ):
        """RayGrid consumers receive copied F/d/C object and image indices."""
        from rayoptics.raytr import waveabr
        from rayoptics_web_utils.raygrid import make_ray_grid

        opm = dispersive_image_space_model
        wavelengths = opm["optical_spec"]["wvls"].wavelengths
        wavelength_nm = wavelengths[wvl_idx]
        cached_fod = opm["analysis_results"]["parax_data"].fod
        cached_indices = (cached_fod.n_obj, cached_fod.n_img)
        captured_fod = []
        original_pre_calc = waveabr.wave_abr_pre_calc
        original_calc = waveabr.wave_abr_calc

        def capture_pre_calc(fod, *args, **kwargs):
            captured_fod.append(fod)
            return original_pre_calc(fod, *args, **kwargs)

        def capture_calc(fod, *args, **kwargs):
            captured_fod.append(fod)
            return original_calc(fod, *args, **kwargs)

        monkeypatch.setattr(waveabr, "wave_abr_pre_calc", capture_pre_calc)
        monkeypatch.setattr(waveabr, "wave_abr_calc", capture_calc)

        make_ray_grid(
            opm,
            fi=0,
            wavelength_nm=wavelength_nm,
            num_rays=3,
        )

        assert captured_fod
        expected_n_obj = opm["seq_model"].gaps[0].medium.rindex(
            wavelength_nm,
        )
        expected_n_img = opm["seq_model"].gaps[-1].medium.rindex(
            wavelength_nm,
        )
        assert [fod.n_obj for fod in captured_fod] == pytest.approx(
            [expected_n_obj] * len(captured_fod),
        )
        assert [fod.n_img for fod in captured_fod] == pytest.approx(
            [expected_n_img] * len(captured_fod),
        )
        assert all(fod is not cached_fod for fod in captured_fod)
        assert (cached_fod.n_obj, cached_fod.n_img) == cached_indices

    def test_returns_ray_grid_instance(self, cooke_triplet):
        """make_ray_grid should return a RayGrid instance."""
        from rayoptics.raytr.analyses import RayGrid
        from rayoptics_web_utils.raygrid import make_ray_grid

        osp = cooke_triplet['optical_spec']
        wavelength_nm = osp['wvls'].wavelengths[1]
        rg = make_ray_grid(cooke_triplet, fi=0, wavelength_nm=wavelength_nm)
        assert isinstance(rg, RayGrid)

    def test_grid_shape(self, cooke_triplet):
        """make_ray_grid().grid should have shape (3, n, n)."""
        from rayoptics_web_utils.raygrid import make_ray_grid

        osp = cooke_triplet['optical_spec']
        wavelength_nm = osp['wvls'].wavelengths[1]
        n = 16
        rg = make_ray_grid(cooke_triplet, fi=0, wavelength_nm=wavelength_nm, num_rays=n)
        assert rg.grid.shape == (3, n, n)

    def test_uses_correct_wavelength(self, cooke_triplet):
        """make_ray_grid should use the provided wavelength_nm."""
        from rayoptics_web_utils.raygrid import make_ray_grid

        osp = cooke_triplet['optical_spec']
        wavelength_nm = osp['wvls'].wavelengths[0]
        rg = make_ray_grid(cooke_triplet, fi=0, wavelength_nm=wavelength_nm)
        assert rg.wvl == wavelength_nm

    def test_default_num_rays(self, cooke_triplet):
        """make_ray_grid default num_rays should be 64."""
        from rayoptics_web_utils.raygrid import make_ray_grid
        import inspect

        sig = inspect.signature(make_ray_grid)
        assert sig.parameters['num_rays'].default == 64

    def test_default_foc(self, cooke_triplet):
        """make_ray_grid default foc should be 0.0."""
        from rayoptics_web_utils.raygrid import make_ray_grid
        import inspect

        sig = inspect.signature(make_ray_grid)
        assert sig.parameters['foc'].default == 0.0

    def test_default_image_point_is_chief_ray(self):
        """make_ray_grid should preserve RayOptics chief-ray default unless asked otherwise."""
        from rayoptics_web_utils.raygrid import make_ray_grid
        import inspect

        sig = inspect.signature(make_ray_grid)
        assert sig.parameters["image_point"].default == "chief_ray"

    def test_chief_ray_mode_does_not_resolve_centroid(self, cooke_triplet, monkeypatch):
        """Chief-ray mode does not enter the centroid reference implementation."""
        import rayoptics_web_utils.raygrid.raygrid as module

        monkeypatch.setattr(module, "_resolve_image_point", lambda *args, **kwargs: pytest.fail("unexpected centroid helper"))
        wavelength = cooke_triplet.optical_spec.spectral_region.central_wvl
        result = module.make_ray_grid(cooke_triplet, fi=1, wavelength_nm=wavelength)

        assert result.image_pt_2d is None

    def test_centroid_mode_uses_centroid_ray_grid(self, cooke_triplet):
        """Centroid mode uses the rebuild-capable best-fit RayGrid subclass."""
        import rayoptics_web_utils.raygrid.raygrid as module

        wavelength = cooke_triplet.optical_spec.spectral_region.wavelengths[0]
        result = module.make_ray_grid(
            cooke_triplet, fi=2, wavelength_nm=wavelength,
            num_rays=9, image_point="centroid"
        )

        assert isinstance(result, module.CentroidRayGrid)
        rebuilt = result.update_data(build="rebuild")
        assert rebuilt is result

    def test_centroid_grid_refreshes_wavelength_aiming_before_sampling(
        self, dispersive_image_space_model
    ):
        """A centroid grid is independent of the previously traced wavelength."""
        from rayoptics_web_utils.raygrid import make_ray_grid

        opm = dispersive_image_space_model
        wavelengths = opm.optical_spec.spectral_region.wavelengths
        make_ray_grid(
            opm, fi=1, wavelength_nm=wavelengths[0], num_rays=7,
            image_point="centroid"
        )
        first_d = make_ray_grid(
            opm, fi=1, wavelength_nm=wavelengths[1], num_rays=7,
            image_point="centroid"
        ).grid.copy()
        make_ray_grid(
            opm, fi=1, wavelength_nm=wavelengths[2], num_rays=7,
            image_point="centroid"
        )
        second_d = make_ray_grid(
            opm, fi=1, wavelength_nm=wavelengths[1], num_rays=7,
            image_point="centroid"
        ).grid.copy()

        np.testing.assert_allclose(first_d, second_d, equal_nan=True, atol=1.0e-12)

    def test_centroid_wavefront_removes_piston_and_both_tilts(self, cooke_triplet):
        """The centroid wavefront reference is a weighted best-fit sphere."""
        from rayoptics_web_utils.raygrid import make_ray_grid

        wavelength = cooke_triplet.optical_spec.spectral_region.wavelengths[0]
        ray_grid = make_ray_grid(
            cooke_triplet,
            fi=2,
            wavelength_nm=wavelength,
            num_rays=11,
            image_point="centroid",
        )
        pupil_x, pupil_y, opd = ray_grid.grid
        valid = np.isfinite(opd)
        design = np.column_stack(
            [np.ones(np.count_nonzero(valid)), pupil_x[valid], pupil_y[valid]]
        )
        coefficients = np.linalg.lstsq(design, opd[valid], rcond=None)[0]

        assert coefficients == pytest.approx([0.0, 0.0, 0.0], abs=1.0e-8)

    def test_tilted_image_reference_uses_complete_global_transform(
        self, tilted_houghton
    ):
        """Sphere centre and exit-pupil reference share one global frame."""
        from rayoptics_web_utils.raygrid import make_ray_grid
        from rayoptics_web_utils.zernike.projected_pupil import (
            reference_sphere_geometry_from_ray_grid,
        )

        wavelength = tilted_houghton.optical_spec.spectral_region.central_wvl
        ray_grid = make_ray_grid(
            tilted_houghton, fi=0, wavelength_nm=wavelength, num_rays=9
        )
        geometry = reference_sphere_geometry_from_ray_grid(
            ray_grid, tilted_houghton
        )
        image_rotation, image_translation = tilted_houghton.seq_model.gbl_tfrms[-1]
        expected_center = image_rotation @ ray_grid.ref_sphere[0] + image_translation

        np.testing.assert_allclose(geometry.center, expected_center, atol=1.0e-10)
        assert geometry.radius == pytest.approx(
            np.linalg.norm(geometry.center - geometry.pupil_reference)
        )
        assert ray_grid.ref_sphere[2] == pytest.approx(geometry.radius)

    def test_afocal_centroid_wavefront_removes_piston_and_both_tilts(
        self, afocal_two_lens
    ):
        """The centroid plane-wave reference also removes all linear phase."""
        from rayoptics_web_utils.raygrid import make_ray_grid

        wavelength = afocal_two_lens.optical_spec.spectral_region.central_wvl
        ray_grid = make_ray_grid(
            afocal_two_lens,
            fi=1,
            wavelength_nm=wavelength,
            num_rays=9,
            image_point="centroid",
        )
        pupil_x, pupil_y, opd = ray_grid.grid
        valid = np.isfinite(opd)
        design = np.column_stack(
            [np.ones(np.count_nonzero(valid)), pupil_x[valid], pupil_y[valid]]
        )
        coefficients = np.linalg.lstsq(design, opd[valid], rcond=None)[0]

        assert coefficients == pytest.approx([0.0, 0.0, 0.0], abs=1.0e-8)


class TestResolveImagePoint:
    """Tests for image-point selection."""

    def test_invalid_image_point_has_an_exact_error(self):
        from rayoptics_web_utils.raygrid.opd_reference import _validate_image_point

        with pytest.raises(
            ValueError, match=r"^Unsupported image point: image_plane$"
        ):
            _validate_image_point("image_plane")

    def test_resolve_image_point_defaults_to_the_chief_ray(self):
        from rayoptics_web_utils.raygrid.opd_reference import _resolve_image_point

        assert _resolve_image_point(None, 0, 550.0, 0.0, 3) is None

    def test_sample_valid_rays_forwards_the_vignetting_box_and_trace_options(
        self, monkeypatch
    ):
        from types import SimpleNamespace

        import rayoptics_web_utils.raygrid.opd_reference as module

        pupil = object()
        opm = SimpleNamespace(optical_spec=SimpleNamespace(pupil=pupil))
        field = SimpleNamespace()
        bbox = [np.array([-2.0, -1.0]), np.array([3.0, 4.0])]
        calls = {}

        def vignetting_bbox(received_pupil):
            calls["pupil"] = received_pupil
            return bbox

        field.vignetting_bbox = vignetting_bbox

        def fake_trace_ray_grid(*args, **kwargs):
            calls["args"] = args
            calls["kwargs"] = kwargs
            return "grid"

        monkeypatch.setattr(module, "trace_ray_grid", fake_trace_ray_grid)

        result = module.sample_valid_rays(opm, field, 550.0, 0.25, 7)

        assert result == "grid"
        assert calls["pupil"] is pupil
        assert calls["args"][:1] == (opm,)
        np.testing.assert_allclose(calls["args"][1][0], bbox[0])
        np.testing.assert_allclose(calls["args"][1][1], bbox[1])
        assert calls["args"][1][2] == 7
        assert calls["args"][2:] == (field, 550.0, 0.25)
        assert calls["kwargs"] == {
            "append_if_none": True,
            "check_apertures": True,
            "apply_vignetting": False,
        }

    def test_weighted_centroid_uses_numeric_conversion_and_exact_length_checks(self):
        from rayoptics_web_utils.raygrid.opd_reference import weighted_centroid

        result = weighted_centroid(
            [["1.0", "2.0"], ["3.0", "4.0"]], ["1.0", "3.0"]
        )

        np.testing.assert_allclose(result, [2.5, 3.5])
        with pytest.raises(
            ValueError,
            match=r"^zip\(\) argument 2 is longer than argument 1$",
        ):
            weighted_centroid([[1.0, 2.0]], [1.0, 2.0])

    def test_weighted_centroid_has_an_exact_no_valid_sample_error(self):
        from rayoptics_web_utils.raygrid.opd_reference import weighted_centroid

        with pytest.raises(
            ValueError,
            match=r"^No positively weighted valid rays are available to compute centroid\.$",
        ):
            weighted_centroid([[1.0, 2.0]], [0.0])

    def test_projected_image_points_refocuses_and_coerces_numeric_text(self):
        from rayoptics_web_utils.raygrid.opd_reference import projected_image_points

        ray = [
            [None, None, None],
            [["1.0", "2.0", "3.0"], ["2.0", "-1.0", "4.0"], None],
        ]

        result = projected_image_points([[[0.0, 0.0, (ray, None, 550.0)]]], 0.5)

        np.testing.assert_allclose(result, [[1.25, 1.875, 3.5]])

    def test_projected_image_points_uses_the_final_ray_segment(self):
        from rayoptics_web_utils.raygrid.opd_reference import projected_image_points

        ray = [
            [None, None, None],
            [[100.0, 200.0, 300.0], [1.0, 0.0, 0.0], None],
            [[1.0, 2.0, 3.0], [2.0, -1.0, 4.0], None],
        ]

        result = projected_image_points([[[0.0, 0.0, (ray, None, 550.0)]]], 0.5)

        np.testing.assert_allclose(result, [[1.25, 1.875, 3.5]])

    def test_projected_image_points_skips_invalid_points_without_skipping_later_rays(
        self,
    ):
        from rayoptics_web_utils.raygrid.opd_reference import projected_image_points

        short_ray = [[None, None, None], [[1.0, 2.0], [0.0, 0.0, 1.0], None]]
        valid_ray = [[None, None, None], [[3.0, 4.0, 5.0], [0.0, 0.0, 1.0], None]]

        result = projected_image_points(
            [[
                [0.0, 0.0, (short_ray, None, 550.0)],
                [0.0, 0.5, (valid_ray, None, 550.0)],
            ]],
            0.0,
        )

        np.testing.assert_allclose(result, [[3.0, 4.0, 5.0]])

    def test_projected_image_points_skips_short_directions_without_skipping_later_rays(
        self,
    ):
        from rayoptics_web_utils.raygrid.opd_reference import projected_image_points

        short_direction_ray = [
            [None, None, None],
            [[1.0, 2.0, 3.0], [1.0, 0.0], None],
        ]
        valid_ray = [
            [None, None, None],
            [[3.0, 4.0, 5.0], [0.0, 0.0, 1.0], None],
        ]

        result = projected_image_points(
            [[
                [0.0, 0.0, (short_direction_ray, None, 550.0)],
                [0.0, 0.5, (valid_ray, None, 550.0)],
            ]],
            0.5,
        )

        np.testing.assert_allclose(result, [[3.0, 4.0, 5.5]])

    def test_projected_image_points_rejects_an_axial_direction_at_machine_epsilon(
        self,
    ):
        from rayoptics_web_utils.raygrid.opd_reference import projected_image_points

        ray = [
            [None, None, None],
            [[1.0, 2.0, 3.0], [0.0, 0.0, np.finfo(float).eps], None],
        ]

        assert projected_image_points([[[0.0, 0.0, (ray, None, 550.0)]]], 0.5) == []

    def test_chief_ray_returns_none(self, cooke_triplet):
        from rayoptics_web_utils.raygrid.opd_reference import _resolve_image_point

        result = _resolve_image_point(cooke_triplet, fi=0, wavelength_nm=587.562, foc=0.0, num_rays=5, image_point="chief_ray")

        assert result is None

    def test_centroid_ignores_invalid_rays(self, monkeypatch):
        import rayoptics.optical.model_constants as mc
        import rayoptics_web_utils.raygrid.opd_reference as module

        class FakeField:
            def vignetting_bbox(self, pupil):
                return [np.array([-1.0, -1.0]), np.array([1.0, 1.0])]

        class FakeOpticalSpec:
            field_of_view = type("FakeFov", (), {"fields": [FakeField()]})()
            pupil = object()

        class FakeOpticalModel:
            optical_spec = FakeOpticalSpec()
            seq_model = type(
                "FakeSequentialModel",
                (),
                {"ifcs": [type("Image", (), {"profile": type("Profile", (), {"sag": staticmethod(lambda x, y: 0.0)})()})()]},
            )()

            def __getitem__(self, key):
                if key == "osp":
                    return {"pupil": self.optical_spec.pupil}
                raise KeyError(key)

        ray_a = [[None, None, None], [np.array([1.0, 2.0, 3.0]), None, None]]
        ray_b = [[None, None, None], [np.array([3.0, 6.0, 9.0]), None, None]]
        grid = [
            [[0.0, 0.0, (ray_a, None, 587.0)], [0.0, 0.5, None]],
            [[0.5, 0.0, (ray_b, None, 587.0)]],
        ]

        captured = {}

        def fake_trace_ray_grid(*args, **kwargs):
            captured["args"] = args
            captured.update(kwargs)
            return grid

        monkeypatch.setattr(module, "trace_ray_grid", fake_trace_ray_grid)

        result = module._resolve_image_point(
            FakeOpticalModel(),
            fi=0,
            wavelength_nm=587.0,
            foc=0.0,
            num_rays=3,
            image_point="centroid",
        )

        assert result == pytest.approx([2.0, 4.0, 0.0])
        assert captured["args"][3:5] == (587.0, 0.0)
        assert captured["apply_vignetting"] is False

    def test_centroid_restores_curved_image_surface_sag(self, monkeypatch):
        """The finite reference retains local image sag plus focus."""
        import rayoptics_web_utils.raygrid.opd_reference as module

        class FakeProfile:
            @staticmethod
            def sag(x, y):
                return x * x + 2.0 * y

        class FakeField:
            def vignetting_bbox(self, pupil):
                return [np.array([-1.0, -1.0]), np.array([1.0, 1.0])]

        class FakeOpticalSpec:
            field_of_view = type("FakeFov", (), {"fields": [FakeField()]})()
            pupil = object()

        class FakeOpticalModel:
            optical_spec = FakeOpticalSpec()
            seq_model = type(
                "FakeSequentialModel",
                (),
                {"ifcs": [object(), type("Image", (), {"profile": FakeProfile()})()]},
            )()

        ray = [[None, None, None], [np.array([2.0, 3.0, 0.0]), np.array([0.0, 0.0, 1.0]), None]]
        monkeypatch.setattr(
            module,
            "trace_ray_grid",
            lambda *args, **kwargs: [[[0.0, 0.0, (ray, None, 587.0)]]],
        )

        result = module._resolve_image_point(
            FakeOpticalModel(), 0, 587.0, 0.5, 3, "centroid"
        )

        assert result == pytest.approx([2.0, 3.0, 10.5])

    def test_weighted_centroid_rejects_all_zero_weights(self):
        """A spectral centroid requires positive effective throughput."""
        from rayoptics_web_utils.raygrid.opd_reference import weighted_centroid

        with pytest.raises(ValueError, match="positively weighted"):
            weighted_centroid([np.array([1.0, 2.0])], [0.0])

    def test_centroid_raises_when_no_valid_rays(self, monkeypatch):
        import rayoptics_web_utils.raygrid.opd_reference as module

        class FakeField:
            def vignetting_bbox(self, pupil):
                return [np.array([-1.0, -1.0]), np.array([1.0, 1.0])]

        class FakeOpticalSpec:
            field_of_view = type("FakeFov", (), {"fields": [FakeField()]})()
            pupil = object()

        class FakeOpticalModel:
            optical_spec = FakeOpticalSpec()

            def __getitem__(self, key):
                if key == "osp":
                    return {"pupil": self.optical_spec.pupil}
                raise KeyError(key)

        monkeypatch.setattr(module, "trace_ray_grid", lambda *args, **kwargs: [[[0.0, 0.0, None]]])

        with pytest.raises(
            ValueError,
            match=r"^No valid rays are available to compute centroid image point\.$",
        ):
            module._resolve_image_point(
                FakeOpticalModel(),
                fi=0,
                wavelength_nm=587.0,
                foc=0.0,
                num_rays=3,
                image_point="centroid",
            )

    def test_centroid_with_nonfinite_sag_has_an_exact_error(self, monkeypatch):
        from types import SimpleNamespace

        import rayoptics_web_utils.raygrid.opd_reference as module

        class FakeField:
            def vignetting_bbox(self, pupil):
                return [np.array([-1.0, -1.0]), np.array([1.0, 1.0])]

        ray = [[None, None, None], [[1.0, 2.0, 3.0], [0.0, 0.0, 1.0], None]]
        opm = SimpleNamespace(
            optical_spec=SimpleNamespace(
                field_of_view=SimpleNamespace(fields=[FakeField()]),
                pupil=object(),
            ),
            seq_model=SimpleNamespace(
                ifcs=[
                    SimpleNamespace(
                        profile=SimpleNamespace(sag=lambda x, y: np.nan)
                    )
                ]
            ),
        )
        monkeypatch.setattr(
            module,
            "trace_ray_grid",
            lambda *args, **kwargs: [[[0.0, 0.0, (ray, None, 550.0)]]],
        )

        with pytest.raises(
            ValueError,
            match=r"^Centroid is not projectable onto the image surface\.$",
        ):
            module._resolve_image_point(opm, 0, 550.0, 0.0, 3, "centroid")


class TestLinearOpdCoefficients:
    """Tests for the piston-and-tilt fit used by centroid grids."""

    def test_fits_piston_and_both_tilts_while_ignoring_invalid_samples(self):
        """The fit recovers an affine OPD plane from finite valid rays."""
        from rayoptics_web_utils.raygrid.raygrid import _linear_opd_coefficients

        ray_pkg = object()
        raw_grid = [
            [
                ["-1.0", "-1.0", ray_pkg],
                ["1.0", "-1.0", ray_pkg],
                ["5.0", "7.0", None],
            ],
            [
                ["-1.0", "1.0", ray_pkg],
                ["1.0", "1.0", ray_pkg],
                ["0.0", "0.0", ray_pkg],
            ],
        ]
        opd_values = np.array(
            [
                [3.0, 9.0, 100.0],
                [-5.0, 1.0, np.nan],
            ]
        )

        coefficients = _linear_opd_coefficients(raw_grid, opd_values)

        np.testing.assert_allclose(coefficients, [2.0, 3.0, -4.0])

    def test_requires_three_valid_rays(self):
        """The fit rejects a grid with fewer than three usable samples."""
        from rayoptics_web_utils.raygrid.raygrid import _linear_opd_coefficients

        raw_grid = [[[0.0, 0.0, object()], [1.0, 0.0, object()]]]

        with pytest.raises(
            ValueError,
            match=r"^Centroid wavefront reference requires at least three valid rays\.$",
        ):
            _linear_opd_coefficients(raw_grid, [[1.0, 2.0]])

    def test_accepts_exactly_three_non_collinear_valid_rays(self):
        """Three non-collinear rays are sufficient to determine the plane."""
        from rayoptics_web_utils.raygrid.raygrid import _linear_opd_coefficients

        ray_pkg = object()
        raw_grid = [
            [[0.0, 0.0, ray_pkg], [1.0, 0.0, ray_pkg]],
            [[0.0, 1.0, ray_pkg]],
        ]

        coefficients = _linear_opd_coefficients(raw_grid, [[2.0, 5.0], [7.0]])

        np.testing.assert_allclose(coefficients, [2.0, 3.0, 5.0])

    def test_rejects_collinear_valid_rays_with_an_exact_error(self):
        """A rank-deficient pupil fit is rejected explicitly."""
        from rayoptics_web_utils.raygrid.raygrid import _linear_opd_coefficients

        ray_pkg = object()
        raw_grid = [
            [[0.0, 0.0, ray_pkg], [1.0, 0.0, ray_pkg], [2.0, 0.0, ray_pkg]]
        ]

        with pytest.raises(
            ValueError,
            match=r"^Centroid wavefront reference requires non-collinear valid rays\.$",
        ):
            _linear_opd_coefficients(raw_grid, [[2.0, 5.0, 8.0]])

    @pytest.mark.parametrize(
        ("raw_grid", "opd_values"),
        [
            (
                [
                    [[0.0, 0.0, object()], [1.0, 0.0, object()], [0.0, 1.0, object()]],
                    [[0.0, 0.0, object()]],
                ],
                [[1.0, 2.0, 3.0]],
            ),
            (
                [[[0.0, 0.0, object()], [1.0, 0.0, object()], [0.0, 1.0, object()]]],
                [[1.0, 2.0]],
            ),
        ],
        ids=["row-count", "column-count"],
    )
    def test_rejects_non_rectangular_inputs(self, raw_grid, opd_values):
        """The fit does not silently truncate mismatched grid dimensions."""
        from rayoptics_web_utils.raygrid.raygrid import _linear_opd_coefficients

        with pytest.raises(
            ValueError,
            match=r"^zip\(\) argument 2 is shorter than argument 1$",
        ):
            _linear_opd_coefficients(raw_grid, opd_values)

    def test_passes_rcond_none_to_the_least_squares_solver(self, monkeypatch):
        """The fit leaves NumPy's explicit least-squares cutoff unmodified."""
        from rayoptics_web_utils.raygrid import raygrid as module

        ray_pkg = object()
        raw_grid = [
            [[0.0, 0.0, ray_pkg], [1.0, 0.0, ray_pkg]],
            [[0.0, 1.0, ray_pkg]],
        ]
        captured = {}

        def fake_lstsq(design, values, rcond):
            captured["design"] = design
            captured["values"] = values
            captured["rcond"] = rcond
            return np.array([2.0, 3.0, 5.0]), None, 3, None

        monkeypatch.setattr(module.np.linalg, "lstsq", fake_lstsq)

        result = module._linear_opd_coefficients(raw_grid, [[2.0, 5.0], [7.0]])

        np.testing.assert_allclose(result, [2.0, 3.0, 5.0])
        assert captured["rcond"] is None
        assert captured["design"].dtype == float
        assert captured["values"].dtype == float


class TestChiefImagePoint:
    """Tests for focused chief-ray image-point construction."""

    @staticmethod
    def _chief_ray(point, direction, previous_direction=(0.0, 0.0, 1.0)):
        from types import SimpleNamespace

        return SimpleNamespace(
            ray=[
                [None, None, None],
                [[100.0, 200.0, 300.0], previous_direction, None],
                [point, direction, None],
            ]
        )

    def test_uses_the_final_segment_and_projects_by_focus(self):
        """The image point uses the final ray direction, including its sign."""
        from rayoptics_web_utils.raygrid.raygrid import _chief_image_point

        chief_ray = self._chief_ray(
            ["1.0", "2.0", "3.0"], ["2.0", "-1.0", "4.0"]
        )

        result = _chief_image_point((chief_ray, object()), "0.5")

        np.testing.assert_allclose(result, [1.25, 1.875, 3.5])

    @pytest.mark.parametrize(
        ("point", "direction"),
        [
            ([1.0, 2.0], [0.0, 0.0, 1.0]),
            ([1.0, 2.0, 3.0], [0.0, 0.0]),
        ],
        ids=["point-shape", "direction-shape"],
    )
    def test_rejects_malformed_ray_vectors_with_an_exact_error(
        self, point, direction
    ):
        """Both image point and direction must be three-vectors."""
        from rayoptics_web_utils.raygrid.raygrid import _chief_image_point

        with pytest.raises(
            ValueError,
            match=r"^Chief ray does not define a finite image reference\.$",
        ):
            _chief_image_point((self._chief_ray(point, direction), None), 0.0)

    @pytest.mark.parametrize(
        "bad_vector",
        [
            [np.nan, 2.0, 3.0],
            [1.0, np.inf, 3.0],
        ],
        ids=["point", "direction"],
    )
    def test_rejects_nonfinite_ray_vectors_with_an_exact_error(self, bad_vector):
        """Non-finite chief-ray data cannot define an image reference."""
        from rayoptics_web_utils.raygrid.raygrid import _chief_image_point

        point, direction = (
            (bad_vector, [0.0, 0.0, 1.0])
            if not np.isfinite(bad_vector[0])
            else ([1.0, 2.0, 3.0], bad_vector)
        )

        with pytest.raises(
            ValueError,
            match=r"^Chief ray does not define a finite image reference\.$",
        ):
            _chief_image_point((self._chief_ray(point, direction), None), 0.0)

    def test_treats_an_epsilon_axial_direction_as_parallel(self):
        """The machine-epsilon boundary is not projectable onto the image plane."""
        from rayoptics_web_utils.raygrid.raygrid import _chief_image_point

        chief_ray = self._chief_ray([1.0, 2.0, 3.0], [1.0, 0.0, np.finfo(float).eps])

        with pytest.raises(
            ValueError,
            match=r"^Chief ray is parallel to the focused image surface\.$",
        ):
            _chief_image_point((chief_ray, None), 0.5)

    def test_raises_an_exact_error_for_a_parallel_chief_ray(self):
        """A zero axial direction has no finite focused intersection."""
        from rayoptics_web_utils.raygrid.raygrid import _chief_image_point

        chief_ray = self._chief_ray([1.0, 2.0, 3.0], [1.0, 0.0, 0.0])

        with pytest.raises(
            ValueError,
            match=r"^Chief ray is parallel to the focused image surface\.$",
        ):
            _chief_image_point((chief_ray, None), 0.5)


class TestReferenceSphere:
    """Tests for the global-to-local finite reference-sphere construction."""

    @staticmethod
    def _case(
        image_point,
        *,
        last_rotation=None,
        last_translation=None,
        image_rotation=None,
        image_translation=None,
        chief_last_point=None,
        chief_last_direction=None,
        exit_distance=1.0,
    ):
        from types import SimpleNamespace

        last_rotation = np.eye(3) if last_rotation is None else last_rotation
        last_translation = (
            np.zeros(3) if last_translation is None else last_translation
        )
        image_rotation = np.eye(3) if image_rotation is None else image_rotation
        image_translation = (
            np.zeros(3) if image_translation is None else image_translation
        )
        chief_last_point = (
            np.zeros(3) if chief_last_point is None else chief_last_point
        )
        chief_last_direction = (
            np.array([0.0, 0.0, 1.0])
            if chief_last_direction is None
            else chief_last_direction
        )
        chief_last_point_float = np.asarray(chief_last_point, dtype=float)
        chief_last_direction_float = np.asarray(chief_last_direction, dtype=float)
        exit_point = chief_last_point_float + exit_distance * chief_last_direction_float
        chief_ray = SimpleNamespace(
            ray=[
                [chief_last_point, chief_last_direction, None],
                [np.zeros(3), chief_last_direction, None],
            ]
        )
        chief_exit_segment = [exit_point, None, exit_distance, "final-interface"]
        local_transform = object()
        opm = SimpleNamespace(
            seq_model=SimpleNamespace(
                gbl_tfrms=[
                    (np.eye(3), np.zeros(3)),
                    (last_rotation, last_translation),
                    (image_rotation, image_translation),
                ],
                lcl_tfrms=[None, local_transform, None],
            )
        )
        return opm, (chief_ray, chief_exit_segment), local_transform

    def test_resolves_transforms_and_returns_a_local_unit_reference_direction(
        self, monkeypatch
    ):
        """Sphere centre and pupil reference are compared in one coordinate frame."""
        from rayoptics_web_utils.raygrid import raygrid as module

        angle = np.deg2rad(90.0)
        last_rotation = np.array(
            [
                [np.cos(angle), -np.sin(angle), 0.0],
                [np.sin(angle), np.cos(angle), 0.0],
                [0.0, 0.0, 1.0],
            ]
        )
        image_angle = np.deg2rad(-30.0)
        image_rotation = np.array(
            [
                [np.cos(image_angle), 0.0, np.sin(image_angle)],
                [0.0, 1.0, 0.0],
                [-np.sin(image_angle), 0.0, np.cos(image_angle)],
            ]
        )
        last_translation = np.array([10.0, -5.0, 2.0])
        image_translation = np.array([100.0, 20.0, -40.0])
        chief_last_point = ["4.0", "-1.0", "2.0"]
        chief_last_direction = ["0.1", "0.2", "0.97"]
        image_point = ["1.0", "2.0", "3.0"]
        opm, chief_pkg, local_transform = self._case(
            image_point,
            last_rotation=last_rotation,
            last_translation=last_translation,
            image_rotation=image_rotation,
            image_translation=image_translation,
            chief_last_point=chief_last_point,
            chief_last_direction=chief_last_direction,
            exit_distance=2.5,
        )
        image_point_float = np.asarray(image_point, dtype=float)
        chief_last_point_float = np.asarray(chief_last_point, dtype=float)
        chief_last_direction_float = np.asarray(chief_last_direction, dtype=float)
        exit_point = chief_last_point_float + 2.5 * chief_last_direction_float
        chief_pkg[1][0] = [str(value) for value in exit_point]
        sphere_center_global = image_rotation @ image_point_float + image_translation
        pupil_reference_global = (
            last_rotation @ exit_point + last_translation
        )
        expected_radius = np.linalg.norm(sphere_center_global - pupil_reference_global)
        expected_center_last = last_rotation.T @ (
            sphere_center_global - last_translation
        )
        expected_direction = (expected_center_last - exit_point) / expected_radius
        calls = []

        def fake_transform(interface, ray):
            calls.append((interface, ray))
            return ray

        monkeypatch.setattr(module.waveabr, "transform_after_surface", fake_transform)

        result = module._reference_sphere(opm, chief_pkg, image_point)

        np.testing.assert_allclose(result[0], image_point_float)
        np.testing.assert_allclose(result[1], expected_direction)
        assert result[2] == pytest.approx(expected_radius)
        assert result[3] is local_transform
        assert calls[0][0] == "final-interface"
        np.testing.assert_allclose(calls[0][1][0], expected_center_last)
        np.testing.assert_allclose(calls[0][1][1], chief_last_direction_float)

    @pytest.mark.parametrize(
        "image_point",
        [[1.0, 2.0], [1.0, np.nan, 3.0]],
        ids=["shape", "nonfinite"],
    )
    def test_rejects_an_invalid_image_point_with_an_exact_error(self, image_point):
        """The reference-sphere centre requires a finite three-vector."""
        from rayoptics_web_utils.raygrid.raygrid import _reference_sphere

        opm, chief_pkg, _ = self._case([0.0, 0.0, 10.0])

        with pytest.raises(
            ValueError,
            match=r"^Reference-sphere image point must be a finite 3-vector\.$",
        ):
            _reference_sphere(opm, chief_pkg, image_point)

    def test_rejects_a_zero_radius_with_an_exact_error(self, monkeypatch):
        """The sphere centre cannot coincide with the pupil reference."""
        from rayoptics_web_utils.raygrid import raygrid as module

        opm, chief_pkg, _ = self._case([0.0, 0.0, 1.0])
        monkeypatch.setattr(
            module.waveabr,
            "transform_after_surface",
            lambda *_args: pytest.fail("zero-radius sphere should fail first"),
        )

        with pytest.raises(
            ValueError,
            match=r"^Finite reference sphere has an invalid radius\.$",
        ):
            module._reference_sphere(opm, chief_pkg, [0.0, 0.0, 1.0])

    def test_rejects_a_radius_at_machine_epsilon(self, monkeypatch):
        """A sphere at the machine-epsilon radius is numerically unresolved."""
        from rayoptics_web_utils.raygrid import raygrid as module

        epsilon = np.finfo(float).eps
        opm, chief_pkg, _ = self._case([epsilon, 0.0, 1.0])
        monkeypatch.setattr(module.waveabr, "transform_after_surface", lambda *_args: _args[1])

        with pytest.raises(
            ValueError,
            match=r"^Finite reference sphere has an invalid radius\.$",
        ):
            module._reference_sphere(opm, chief_pkg, [epsilon, 0.0, 1.0])

    def test_rejects_inconsistent_after_surface_transforms_with_an_exact_error(
        self, monkeypatch
    ):
        """The local transformed vector must preserve the global radius."""
        from rayoptics_web_utils.raygrid import raygrid as module

        opm, chief_pkg, _ = self._case([0.0, 0.0, 10.0])
        monkeypatch.setattr(
            module.waveabr,
            "transform_after_surface",
            lambda interface, ray: (ray[0] + np.array([0.25, 0.0, 0.0]), ray[1]),
        )
        with pytest.raises(
            ValueError,
            match=r"^Reference-sphere coordinate transforms are inconsistent\.$",
        ):
            module._reference_sphere(opm, chief_pkg, [0.0, 0.0, 10.0])

    def test_requires_the_explicit_relative_transform_tolerance(self, monkeypatch):
        """A large-radius relative mismatch is still rejected."""
        from rayoptics_web_utils.raygrid import raygrid as module

        opm, chief_pkg, _ = self._case([0.0, 0.0, 1_000_001.0])
        monkeypatch.setattr(
            module.waveabr,
            "transform_after_surface",
            lambda interface, ray: (ray[0] + np.array([0.0, 0.0, 1.0e-3]), ray[1]),
        )

        with pytest.raises(
            ValueError,
            match=r"^Reference-sphere coordinate transforms are inconsistent\.$",
        ):
            module._reference_sphere(opm, chief_pkg, [0.0, 0.0, 1_000_001.0])

    def test_requires_the_explicit_absolute_transform_tolerance(self, monkeypatch):
        """A small-radius absolute mismatch is still rejected."""
        from rayoptics_web_utils.raygrid import raygrid as module

        opm, chief_pkg, _ = self._case([0.0, 0.0, 1.000001])
        monkeypatch.setattr(
            module.waveabr,
            "transform_after_surface",
            lambda interface, ray: (ray[0] + np.array([0.0, 0.0, 5.0e-9]), ray[1]),
        )

        with pytest.raises(
            ValueError,
            match=r"^Reference-sphere coordinate transforms are inconsistent\.$",
        ):
            module._reference_sphere(opm, chief_pkg, [0.0, 0.0, 1.000001])
