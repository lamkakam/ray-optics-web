"""Tests for rayoptics_web_utils.raygrid module."""

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

    def test_chief_ray_mode_does_not_pass_image_point_override(self, monkeypatch):
        """chief_ray mode should not provide image_pt_2d to RayGrid."""
        import rayoptics_web_utils.raygrid.raygrid as module

        captured_kwargs = {}

        class FakeRayGrid:
            def __init__(self, *args, **kwargs):
                captured_kwargs.update(kwargs)

        monkeypatch.setattr(module, "_resolve_image_point", lambda *args, **kwargs: pytest.fail("unexpected centroid helper"))
        monkeypatch.setattr("rayoptics.raytr.analyses.RayGrid", FakeRayGrid)

        make_ray_grid = module.make_ray_grid
        make_ray_grid(object(), fi=1, wavelength_nm=587.0)

        assert "image_pt_2d" not in captured_kwargs

    def test_centroid_mode_passes_image_point_override(self, monkeypatch):
        """centroid mode should compute and forward image_pt_2d."""
        import rayoptics_web_utils.raygrid.raygrid as module

        captured_kwargs = {}
        opm = object()

        class FakeRayGrid:
            def __init__(self, *args, **kwargs):
                captured_kwargs.update(kwargs)

        monkeypatch.setattr(module, "_resolve_image_point", lambda *args, **kwargs: np.array([1.25, -2.5]))
        monkeypatch.setattr("rayoptics.raytr.analyses.RayGrid", FakeRayGrid)

        module.make_ray_grid(opm, fi=2, wavelength_nm=656.0, num_rays=9, image_point="centroid")

        assert captured_kwargs["image_pt_2d"] == pytest.approx([1.25, -2.5])


class TestResolveImagePoint:
    """Tests for image-point selection."""

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

        monkeypatch.setattr(module, "trace_ray_grid", lambda *args, **kwargs: grid)

        result = module._resolve_image_point(
            FakeOpticalModel(),
            fi=0,
            wavelength_nm=587.0,
            foc=0.0,
            num_rays=3,
            image_point="centroid",
        )

        assert result == pytest.approx([2.0, 4.0])

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

        with pytest.raises(ValueError, match="No valid rays"):
            module._resolve_image_point(
                FakeOpticalModel(),
                fi=0,
                wavelength_nm=587.0,
                foc=0.0,
                num_rays=3,
                image_point="centroid",
            )
