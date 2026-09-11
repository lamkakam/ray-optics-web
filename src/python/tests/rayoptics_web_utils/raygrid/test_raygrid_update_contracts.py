"""Exact update contracts for chief- and centroid-referenced ray grids.

Deterministic wavefront fakes expose wavelength, focus, reference-sphere,
solver, and metadata forwarding while keeping the tests independent of a
particular prescription.
"""

from types import SimpleNamespace

import numpy as np
import pytest


def _fake_grid_model():
    field = SimpleNamespace(chief_ray="old-chief", ref_sphere="old-sphere")
    image_profile = SimpleNamespace()
    seq_model = SimpleNamespace(
        ifcs=[SimpleNamespace(profile=SimpleNamespace()), SimpleNamespace(profile=image_profile)]
    )
    optical_spec = SimpleNamespace(
        field_of_view=SimpleNamespace(fields=[field]),
        spectral_region=SimpleNamespace(central_wvl=550.0),
    )
    model = SimpleNamespace(
        optical_spec=optical_spec,
        seq_model=seq_model,
        nm_to_sys_units=lambda wavelength: wavelength / 100.0,
    )
    return model, field, image_profile


def _raw_grid():
    return [
        [("-1.0", "-1.0", "ray-a"), ("1.0", "-1.0", None)],
        [("-1.0", "1.0", "ray-b"), ("1.0", "1.0", "ray-c")],
    ]


def _grid_instance(cls, model, field, foc=0.25, num_rays=2):
    grid = object.__new__(cls)
    grid.opt_model = model
    grid.fld = field
    grid.wvl = 532.0
    grid.foc = foc
    grid.num_rays = num_rays
    return grid


@pytest.mark.parametrize("class_name", ["ChiefRayGrid", "CentroidRayGrid"])
def test_grid_initializers_preserve_public_sampling_and_trace_defaults(monkeypatch, class_name):
    import rayoptics_web_utils.raygrid.raygrid as module

    cls = getattr(module, class_name)
    model, _field, _image_profile = _fake_grid_model()
    monkeypatch.setattr(cls, "update_data", lambda self, **_kwargs: self)

    grid = cls(model, 0, 532.0, 0.25, 7)

    assert grid.opt_model is model
    assert grid.fld is model.optical_spec.field_of_view.fields[0]
    assert grid.wvl == 532.0
    assert grid.foc == 0.25
    assert grid.image_pt_2d is None
    assert grid.image_delta is None
    assert grid.num_rays == 7
    assert np.isnan(grid.value_if_none)
    assert grid.rt_kwargs == {
        "check_apertures": True,
        "apply_vignetting": False,
        "output_filter": None,
        "rayerr_filter": None,
    }


def test_chief_grid_update_forwards_every_wavelength_and_focus_argument(monkeypatch):
    import rayoptics_web_utils.raygrid.raygrid as module

    model, field, _image_profile = _fake_grid_model()
    grid = _grid_instance(module.ChiefRayGrid, model, field)
    raw_grid = _raw_grid()
    wavelength_model = {"analysis_results": {"parax_data": SimpleNamespace(fod="fod")}}
    chief_package = ("chief-ray", "exit-pupil")
    calls = {"view": [], "setup": [], "sample": [], "image": [], "sphere": [], "pre": [], "calc": []}

    monkeypatch.setattr(
        module,
        "model_view_for_wavelength_opd",
        lambda *args: calls["view"].append(args) or wavelength_model,
    )
    monkeypatch.setattr(
        module.trace,
        "setup_pupil_coords",
        lambda *args: calls["setup"].append(args) or (None, chief_package),
    )
    monkeypatch.setattr(
        module,
        "sample_valid_rays",
        lambda *args: calls["sample"].append(args) or raw_grid,
    )
    monkeypatch.setattr(
        module,
        "_chief_image_point",
        lambda *args: calls["image"].append(args) or np.array([1.0, 2.0, 3.0]),
    )
    monkeypatch.setattr(
        module,
        "_reference_sphere",
        lambda *args: calls["sphere"].append(args) or "sphere",
    )
    monkeypatch.setattr(
        module.waveabr,
        "wave_abr_pre_calc",
        lambda *args: calls["pre"].append(args) or ("pre", args[-1]),
    )
    monkeypatch.setattr(
        module.waveabr,
        "wave_abr_calc",
        lambda *args: calls["calc"].append(args) or {"ray-a": 1.0, "ray-b": 2.0, "ray-c": 3.0}[args[4]],
    )

    result = grid.update_data(rebuild=True)

    assert result is grid
    assert calls["view"] == [(model, 532.0)]
    assert calls["setup"] == [(wavelength_model, field, 532.0, 0.25)]
    assert calls["sample"] == [(model, field, 532.0, 0.25, 2)]
    assert calls["image"] == [(chief_package, 0.25)]
    assert len(calls["sphere"]) == 1
    assert calls["sphere"][0][0] is wavelength_model
    assert calls["sphere"][0][1] is chief_package
    np.testing.assert_allclose(calls["sphere"][0][2], [1.0, 2.0, 3.0])
    assert len(calls["pre"]) == 3
    assert len(calls["calc"]) == 3
    assert all(args[:4] == ("fod", field, 532.0, 0.25) for args in calls["calc"])
    assert all(args[4] in {"ray-a", "ray-b", "ray-c"} for args in calls["calc"])
    assert all(args[5] is chief_package and args[7] == "sphere" for args in calls["calc"])
    np.testing.assert_allclose(result.grid[0], [[-1.0, 1.0], [-1.0, 1.0]])
    np.testing.assert_allclose(result.grid[1], [[-1.0, -1.0], [1.0, 1.0]])
    np.testing.assert_allclose(
        result.grid[2],
        [[1.0 / 5.5, np.nan], [2.0 / 5.5, 3.0 / 5.5]],
        equal_nan=True,
    )
    assert result.raw_grid is raw_grid
    assert result.grid_pkg[0] is raw_grid
    assert result.image_point.tolist() == [1.0, 2.0, 3.0]
    assert result.ref_sphere == "sphere"
    assert result.chief_ray_pkg is chief_package
    assert field.chief_ray is chief_package
    assert field.ref_sphere == "sphere"


def test_centroid_grid_update_fits_and_publishes_a_piston_free_grid(monkeypatch):
    import rayoptics_web_utils.raygrid.raygrid as module

    model, field, image_profile = _fake_grid_model()
    grid = _grid_instance(module.CentroidRayGrid, model, field)
    raw_grid = _raw_grid()
    wavelength_model = {"analysis_results": {"parax_data": SimpleNamespace(fod="fod")}}
    chief_package = ("chief-ray", "exit-pupil")
    calls = {"view": [], "point": [], "sample": [], "setup": [], "sag": [], "sphere": [], "full": [], "pre": [], "solve": []}

    image_profile.sag = lambda x, y: calls["sag"].append((x, y)) or x + 2.0 * y
    monkeypatch.setattr(
        module,
        "model_view_for_wavelength_opd",
        lambda *args: calls["view"].append(args) or wavelength_model,
    )
    monkeypatch.setattr(
        module,
        "_resolve_image_point",
        lambda *args, **kwargs: calls["point"].append((args, kwargs)) or np.array([0.25, 0.75, 0.0]),
    )
    monkeypatch.setattr(
        module,
        "sample_valid_rays",
        lambda *args: calls["sample"].append(args) or raw_grid,
    )
    monkeypatch.setattr(
        module.trace,
        "setup_pupil_coords",
        lambda *args: calls["setup"].append(args) or (None, chief_package),
    )
    monkeypatch.setattr(
        module,
        "_reference_sphere",
        lambda *args: calls["sphere"].append(args) or "sphere",
    )
    monkeypatch.setattr(
        module.waveabr,
        "wave_abr_full_calc",
        lambda *args: calls["full"].append(args) or 6.0,
    )
    monkeypatch.setattr(
        module.waveabr,
        "wave_abr_pre_calc",
        lambda *args: calls["pre"].append(args) or ("pre", args[-1]),
    )

    def fake_least_squares(residual, initial, **kwargs):
        calls["solve"].append((residual, np.array(initial, copy=True), kwargs))
        np.testing.assert_allclose(residual(initial), [0.0, 0.0], atol=1.0e-12)
        return SimpleNamespace(success=True, x=np.array([0.25, 0.75]), message="ok")

    monkeypatch.setattr(module, "least_squares", fake_least_squares)

    result = grid.update_data()

    assert result is grid
    assert calls["view"] == [(model, 532.0)]
    assert calls["point"] == [
        (
            (model,),
            {
                "fi": 0,
                "wavelength_nm": 532.0,
                "foc": 0.25,
                "num_rays": 2,
                "image_point": "centroid",
            },
        )
    ]
    assert calls["sample"] == [(model, field, 532.0, 0.25, 2)]
    assert calls["setup"] == [(wavelength_model, field, 532.0, 0.25)]
    assert calls["sag"]
    assert all(pair == (0.25, 0.75) for pair in calls["sag"])
    assert len(calls["sphere"]) == 2
    assert len(calls["full"]) == 6
    assert all(args[0:4] == ("fod", field, 532.0, 0.25) for args in calls["full"])
    assert calls["solve"][0][1].tolist() == [0.25, 0.75]
    assert calls["solve"][0][2] == {
        "xtol": 1.0e-12,
        "ftol": 1.0e-12,
        "gtol": 1.0e-12,
        "max_nfev": 100,
    }
    assert result.piston == pytest.approx(6.0)
    np.testing.assert_allclose(result.grid[2][np.isfinite(result.grid[2])], 0.0)
    assert np.isnan(result.grid[2][0, 1])
    assert result.grid_pkg[0] is raw_grid
    assert result.grid_pkg[1][0][1] is None
    assert result.image_point.tolist() == [0.25, 0.75, 2.0]
    assert result.ref_sphere == "sphere"
    assert result.chief_ray_pkg is chief_package
    assert field.chief_ray is chief_package
    assert field.ref_sphere == "sphere"
