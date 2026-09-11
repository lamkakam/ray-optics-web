"""Exact tests for diffraction-analysis math, scaling, and JSON payloads.

The tests use small deterministic fakes for pupil grids and boundary rays so
the wavelength forwarding, OPD scaling, directional cutoffs, crop geometry,
and finite/afocal metadata contracts are asserted independently of a full
optical model.
"""

import inspect
from types import SimpleNamespace

import numpy as np
import pytest


class _MappingNamespace(SimpleNamespace):
    """Expose ``SimpleNamespace`` attributes through RayOptics-style keys."""

    def __getitem__(self, key):
        return getattr(self, key)


def _ray_with_distinct_segments(final_direction):
    """Return a ray with distinct final, penultimate, and indexed segments."""
    return SimpleNamespace(
        ray=[
            SimpleNamespace(d=np.array([-50.0, -60.0, 1.0])),
            SimpleNamespace(d=np.array([70.0, 80.0, 1.0])),
            SimpleNamespace(d=np.array([-90.0, 100.0, 1.0])),
            SimpleNamespace(d=np.asarray(final_direction, dtype=float)),
        ]
    )


def _diffraction_model():
    """Build the attributes consumed by the diffraction payload builders."""
    field = object()
    spectral_region = SimpleNamespace(
        wavelengths=[600.0],
        central_wvl=500.0,
    )
    optical_spec = SimpleNamespace(
        field_of_view=SimpleNamespace(fields=[field]),
        spectral_region=spectral_region,
    )
    return (
        SimpleNamespace(
            optical_spec=optical_spec,
            system_spec=SimpleNamespace(dimensions="mm"),
            nm_to_sys_units=lambda wavelength: wavelength / 1000.0,
        ),
        field,
    )


def _install_diffraction_fakes(monkeypatch, module, *, afocal=False):
    """Install strict diffraction dependencies and return captured calls."""
    opm, field = _diffraction_model()
    observed = {"grid": [], "psf": [], "boundary": [], "pupil": []}
    grid = np.zeros((3, 16, 16), dtype=float)
    grid[2] = np.arange(256, dtype=float).reshape(16, 16)

    def fake_make_ray_grid(model, *, fi, wavelength_nm, num_rays, image_point):
        assert model is opm
        observed["grid"].append((fi, wavelength_nm, num_rays, image_point))
        return SimpleNamespace(grid=grid)

    def fake_calc_psf(opd_waves, num_rays, max_dims):
        observed["psf"].append((np.array(opd_waves, copy=True), num_rays, max_dims))
        assert num_rays == 16
        return np.ones((max_dims, max_dims), dtype=float)

    monkeypatch.setattr(module, "make_ray_grid", fake_make_ray_grid)
    monkeypatch.setattr(module, "calc_psf", fake_calc_psf)
    monkeypatch.setattr(module, "is_afocal_image_space", lambda model: afocal)

    if afocal:
        def fake_projected_pupils(model, fi, wavelength_nm, *, image_point):
            assert model is opm
            observed["pupil"].append((fi, wavelength_nm, image_point))
            return 2.0, 3.0

        monkeypatch.setattr(module, "projected_exit_pupil_diameters", fake_projected_pupils)
    else:
        boundary_rays = [
            _ray_with_distinct_segments([0.10, 0.20, 1.0]),
            _ray_with_distinct_segments([0.00, 0.20, 1.0]),
            _ray_with_distinct_segments([0.40, 0.20, 1.0]),
            _ray_with_distinct_segments([0.10, -0.10, 1.0]),
            _ray_with_distinct_segments([0.10, 0.70, 1.0]),
        ]

        def fake_boundary(model, received_field, wavelength_nm, *, use_named_tuples):
            assert model is opm
            assert received_field is field
            assert wavelength_nm == 600.0
            assert use_named_tuples is True
            observed["boundary"].append((received_field, wavelength_nm))
            return boundary_rays

        monkeypatch.setattr(module, "trace_boundary_rays_at_field", fake_boundary)

    return opm, observed, grid


class TestDiffractionMathHelpers:
    """Verify boundary behavior and centered sampling formulas exactly."""

    def test_padded_psf_axis_rejects_zero_cutoff_and_preserves_centering(self):
        from rayoptics_web_utils.analysis.diffraction_psf import _padded_psf_image_axis

        zero_axis = _padded_psf_image_axis(0.0, 3, 2)
        assert zero_axis.dtype == float
        np.testing.assert_array_equal(zero_axis, np.zeros(3))

        unpadded = _padded_psf_image_axis(2.0, 4, 2)
        padded = _padded_psf_image_axis(2.0, 8, 2)
        np.testing.assert_allclose(unpadded, [-0.375, -0.125, 0.125, 0.375])
        np.testing.assert_allclose(
            padded,
            [-0.4375, -0.3125, -0.1875, -0.0625, 0.0625, 0.1875, 0.3125, 0.4375],
        )

    def test_padded_psf_axis_returns_float_empty_axes(self):
        from rayoptics_web_utils.analysis.diffraction_psf import _padded_psf_image_axis

        axis = _padded_psf_image_axis(3.0, 0, 4)
        assert axis.shape == (0,)
        assert axis.dtype == float

    def test_centered_crop_handles_zero_cutoff_boundary_and_fallback(self):
        from rayoptics_web_utils.analysis.diffraction_psf import _centered_crop_indices

        np.testing.assert_array_equal(
            _centered_crop_indices(np.array([1.0, 2.0]), 0.0),
            [0, 1],
        )
        np.testing.assert_array_equal(
            _centered_crop_indices(np.array([-12.2, 0.0, 12.2]), 1.0),
            [0, 1, 2],
        )
        fallback = _centered_crop_indices(np.array([20.0, 30.0, 10.0]), 1.0)
        assert fallback.dtype == int
        np.testing.assert_array_equal(fallback, [2])

        no_samples = _centered_crop_indices(np.array([20.0, 30.0, 40.0]), 1.0)
        np.testing.assert_array_equal(no_samples, [0])

    def test_mtf_helper_coerces_text_and_checks_zero_cutoff(self):
        from rayoptics_web_utils.analysis._mtf import _diffraction_limited_mtf

        values = _diffraction_limited_mtf(["0.0", "1.0", "2.0", "3.0"], 2.0)
        assert values.dtype == float
        assert values[0] == pytest.approx(1.0)
        assert values[1] == pytest.approx(2.0 / np.pi * (np.pi / 3.0 - 0.5 * np.sqrt(0.75)))
        assert values[2] == pytest.approx(0.0)
        assert values[3] == pytest.approx(0.0)

        zero_cutoff = _diffraction_limited_mtf([1.0, 2.0], 0.0)
        assert zero_cutoff.dtype == float
        np.testing.assert_array_equal(zero_cutoff, [0.0, 0.0])

    def test_directional_na_coerces_text_and_uses_both_marginals(self):
        from rayoptics_web_utils.analysis._mtf import _directional_na_from_ray_dirs

        na = _directional_na_from_ray_dirs(
            ["1.0", "2.0", "3.0"],
            ["0.5", "2.0", "3.0"],
            ["1.8", "2.0", "3.0"],
            axis=0,
        )
        assert na == pytest.approx(0.8)

    def test_mtf_and_psf_axes_cover_two_samples_and_centering(self):
        from rayoptics_web_utils.analysis._mtf import _mtf_frequency_axis, _psf_image_axis

        np.testing.assert_array_equal(_mtf_frequency_axis(8.0, 0), [])
        np.testing.assert_array_equal(_mtf_frequency_axis(8.0, 1), [0.0])
        np.testing.assert_allclose(_mtf_frequency_axis(8.0, 2), [0.0, 8.0])
        assert _mtf_frequency_axis(8.0, 2).dtype == float

        np.testing.assert_array_equal(_psf_image_axis(8.0, 0), [])
        np.testing.assert_array_equal(_psf_image_axis(8.0, 2), [-1.0 / 32.0, 1.0 / 32.0])
        assert _psf_image_axis(8.0, 2).dtype == float


class TestDiffractionPsfPayload:
    """Verify finite and afocal PSF orchestration and physical scaling."""

    def test_signature_defaults_preserve_sampling_contract(self):
        from rayoptics_web_utils.analysis.diffraction_psf import get_diffraction_psf_data

        parameters = inspect.signature(get_diffraction_psf_data).parameters
        assert parameters["num_rays"].default == 64
        assert parameters["max_dims"].default == 256

    def test_finite_psf_forwards_wavelength_image_point_and_boundary_geometry(self, monkeypatch):
        import rayoptics_web_utils.analysis.diffraction_psf as module

        opm, observed, grid = _install_diffraction_fakes(monkeypatch, module)
        result = module.get_diffraction_psf_data(
            opm,
            fi=0,
            wvl_idx=0,
            image_point="reference",
            num_rays=16,
            max_dims=20,
        )

        assert observed["grid"] == [(0, 600.0, 16, "reference")]
        assert len(observed["boundary"]) == 1
        assert observed["psf"][0][1:] == (16, 32)
        np.testing.assert_allclose(
            observed["psf"][0][0],
            grid[2] * (500.0 / 600.0),
        )
        assert result["fieldIdx"] == 0
        assert result["wvlIdx"] == 0
        assert result["unitX"] == "mm"
        assert result["unitY"] == "mm"
        assert result["unitZ"] == ""
        assert result["x"][0] == pytest.approx(-7.75)
        assert result["x"][-1] == pytest.approx(7.75)
        assert result["y"][0] == pytest.approx(-4.65)
        assert result["y"][-1] == pytest.approx(4.65)
        assert len(result["z"]) == len(result["x"])
        assert len(result["z"][0]) == len(result["y"])

    def test_afocal_psf_uses_projected_pupil_cutoffs_and_metadata(self, monkeypatch):
        import rayoptics_web_utils.analysis.diffraction_psf as module

        opm, observed, _ = _install_diffraction_fakes(monkeypatch, module, afocal=True)
        result = module.get_diffraction_psf_data(
            opm,
            fi=0,
            wvl_idx=0,
            image_point="chief_ray",
            num_rays=16,
            max_dims=64,
        )

        assert observed["pupil"] == [(0, 600.0, "chief_ray")]
        assert result["unitX"] == "arcsec"
        assert result["unitY"] == "arcsec"
        assert result["x"][0] < 0.0 < result["x"][-1]
        assert result["y"][0] < 0.0 < result["y"][-1]
        assert result["x"][0] < 0.0 < result["x"][-1]
        assert result["y"][0] < 0.0 < result["y"][-1]


class TestDiffractionMtfPayload:
    """Verify finite and afocal MTF orchestration and directional cutoffs."""

    def test_signature_defaults_preserve_sampling_contract(self):
        from rayoptics_web_utils.analysis.diffraction_mtf import get_diffraction_mtf_data

        parameters = inspect.signature(get_diffraction_mtf_data).parameters
        assert parameters["num_rays"].default == 64
        assert parameters["max_dims"].default == 256

    def test_finite_mtf_forwards_wavelength_and_scales_opd_before_psf(self, monkeypatch):
        import rayoptics_web_utils.analysis.diffraction_mtf as module

        opm, observed, grid = _install_diffraction_fakes(monkeypatch, module)
        result = module.get_diffraction_mtf_data(
            opm,
            field_idx=0,
            wvl_idx=0,
            image_point="reference",
            num_rays=16,
            max_dims=32,
        )

        assert observed["grid"] == [(0, 600.0, 16, "reference")]
        assert observed["boundary"]
        assert observed["psf"][0][1:] == (16, 32)
        np.testing.assert_allclose(
            observed["psf"][0][0],
            grid[2].T * (500.0 / 600.0),
        )
        assert result["fieldIdx"] == 0
        assert result["wvlIdx"] == 0
        assert result["unitX"] == "cycles/mm"
        assert result["unitY"] == ""
        assert result["scaleKind"] == "image-na"
        assert result["cutoffSagittal"] == pytest.approx(1.0)
        assert result["cutoffTangential"] == pytest.approx(5.0 / 3.0)
        assert result["naSagittal"] == pytest.approx(0.3)
        assert result["naTangential"] == pytest.approx(0.5)
        assert result["Tangential"]["x"] == pytest.approx(result["IdealTangential"]["x"])
        assert result["Sagittal"]["x"] == pytest.approx(result["IdealSagittal"]["x"])

    def test_afocal_mtf_uses_projected_pupil_cutoffs_and_metadata(self, monkeypatch):
        import rayoptics_web_utils.analysis.diffraction_mtf as module

        opm, observed, _ = _install_diffraction_fakes(monkeypatch, module, afocal=True)
        result = module.get_diffraction_mtf_data(
            opm,
            field_idx=0,
            wvl_idx=0,
            image_point="chief_ray",
            num_rays=16,
            max_dims=32,
        )

        assert observed["pupil"] == [(0, 600.0, "chief_ray")]
        assert result["unitX"] == "cycles/arcsec"
        assert result["unitY"] == ""
        assert result["scaleKind"] == "exit-pupil"
        assert result["exitPupilDiameterSagittal"] == 2.0
        assert result["exitPupilDiameterTangential"] == 3.0
        assert "naSagittal" not in result
        assert "naTangential" not in result
