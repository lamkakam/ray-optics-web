"""Contract tests for deterministic glass configuration normalization.

The tests use injected media and direct normalizer calls so option boundaries,
coordinate formulas, and catalog eligibility remain observable without a
catalog lookup or an optical-model optimization run.  The module under test is
resolved lazily so collecting the complete test suite remains safe when GUI
imports such as PySide6 are explicitly rejected.
"""

from __future__ import annotations

from types import SimpleNamespace

import numpy as np
import pytest
from opticalglass.modelglass import ModelGlass


class _LazyGlassConfig:
    """Resolve the GUI-transitive optimization package only during a test."""

    def __getattr__(self, name):
        import importlib

        module = importlib.import_module("rayoptics_web_utils.optimization.glass_config")
        return getattr(module, name)

    def __setattr__(self, name, value):
        import importlib

        module = importlib.import_module("rayoptics_web_utils.optimization.glass_config")
        setattr(module, name, value)


glass_config = _LazyGlassConfig()


class _SubscriptableNamespace(SimpleNamespace):
    """Provide mapping-style access for small optical-model fakes."""

    def __getitem__(self, key):
        return getattr(self, key)


def test_glass_optimizer_accepts_explicit_values_and_applies_defaults():
    """Optimizer options retain their configured values and documented defaults."""
    assert glass_config._normalize_glass_optimizer({}) == {
        "num_neighbours": 7,
        "maxiter": 1000,
        "tol": pytest.approx(1.0e-3),
    }
    assert glass_config._normalize_glass_optimizer(
        {
            "glass_optimizer": {
                "num_neighbours": 3,
                "maxiter": 12,
                "tol": "0.025",
            }
        }
    ) == {
        "num_neighbours": 3,
        "maxiter": 12,
        "tol": pytest.approx(0.025),
    }


def test_glass_optimizer_reports_the_first_unknown_option():
    """Unsupported glass options are rejected with deterministic sorted labeling."""
    with pytest.raises(
        ValueError,
        match="^Unsupported glass optimizer option: extra_a$",
    ):
        glass_config._normalize_glass_optimizer(
            {"glass_optimizer": {"extra_b": 1, "extra_a": 2}}
        )


@pytest.mark.parametrize(
    ("option", "value", "message"),
    [
        ("num_neighbours", True, "num_neighbours must be a positive integer"),
        ("num_neighbours", 0, "num_neighbours must be a positive integer"),
        ("num_neighbours", -1, "num_neighbours must be a positive integer"),
        ("num_neighbours", 2.0, "num_neighbours must be a positive integer"),
        ("maxiter", False, "maxiter must be a positive integer"),
        ("maxiter", 0, "maxiter must be a positive integer"),
        ("maxiter", 2.0, "maxiter must be a positive integer"),
        ("tol", True, "tol must be a positive finite number"),
        ("tol", "not-a-number", "tol must be a positive finite number"),
        ("tol", 0.0, "tol must be a positive finite number"),
        ("tol", -1.0, "tol must be a positive finite number"),
        ("tol", np.inf, "tol must be a positive finite number"),
        ("tol", np.nan, "tol must be a positive finite number"),
    ],
)
def test_glass_optimizer_rejects_invalid_option_values(option, value, message):
    """Each glass optimizer option enforces its own type and range contract."""
    with pytest.raises(ValueError, match=f"^{message}$"):
        glass_config._normalize_glass_optimizer(
            {"glass_optimizer": {option: value}}
        )


def test_positive_integer_rejects_booleans_even_when_true():
    """Boolean values are not accepted as integer iteration counts."""
    with pytest.raises(
        ValueError,
        match="^count must be a positive integer$",
    ):
        glass_config._positive_integer(True, "count")


def test_numeric_bounds_accept_unbounded_and_strict_finite_intervals():
    """Unbounded entries may precede a finite interval without ending validation."""
    glass_config._validate_numeric_bounds(
        [
            {"kind": "thickness"},
            {"kind": "radius", "min": "1.5", "max": 3},
        ]
    )


def test_numeric_bounds_does_not_stop_after_an_unbounded_entry():
    """Every numeric variable is checked even when an earlier one is unbounded."""
    with pytest.raises(
        ValueError,
        match="^Glass optimization variables must omit both min and max or provide both$",
    ):
        glass_config._validate_numeric_bounds([{}, {"min": 1.0}])


@pytest.mark.parametrize(
    "entry",
    [
        {"min": 1.0},
        {"max": 2.0},
        {"min": "bad", "max": 2.0},
        {"min": 0.0, "max": np.inf},
        {"min": 0.0, "max": np.nan},
        {"min": 2.0, "max": 2.0},
        {"min": 3.0, "max": 2.0},
    ],
)
def test_numeric_bounds_reject_incomplete_nonfinite_and_non_strict_intervals(entry):
    """Numeric variables require two finite endpoints in strict ascending order."""
    expected = (
        "Glass optimization variables must omit both min and max or provide both"
        if ("min" in entry) != ("max" in entry)
        else "Glass optimization variable bounds must satisfy finite min < max"
    )
    with pytest.raises(ValueError, match=f"^{expected}$"):
        glass_config._validate_numeric_bounds([entry])


def test_native_material_identity_reports_unsupported_media_with_cause():
    """Materials without native name/catalog methods receive a stable error."""
    with pytest.raises(
        ValueError,
        match="^Unsupported current material for glass optimization$",
    ) as raised:
        glass_config._native_material_identity(SimpleNamespace())
    assert raised.value.__cause__ is not None


def test_model_glass_coordinates_use_exact_labels_and_values():
    """ModelGlass coordinates expose n_d and Vd directly."""
    medium = ModelGlass(1.5, 50.0, "model")
    medium.n = 1.6123
    medium.v = 42.7

    assert glass_config._raw_nd_vd(medium) == pytest.approx((1.6123, 42.7))

    medium.n = np.nan
    with pytest.raises(
        ValueError,
        match="^Unable to calculate glass nd/Vd coordinates: n_d is not finite$",
    ) as raised:
        glass_config._raw_nd_vd(medium)
    assert str(raised.value.__cause__) == "n_d is not finite"


def test_catalog_glass_coordinates_use_fraunhofer_formula():
    """Catalog-style media calculate Vd as (n_d - 1)/(n_F - n_C)."""
    medium = SimpleNamespace(
        rindex=lambda wavelength: {
            "d": 1.6,
            "F": 1.62,
            "C": 1.60,
        }[wavelength]
    )

    assert glass_config._raw_nd_vd(medium) == pytest.approx((1.6, 30.0))


def test_catalog_glass_coordinate_errors_preserve_specific_causes():
    """Derived coordinate errors identify zero dispersion and nonfinite Vd."""
    equal_f_lines = SimpleNamespace(
        rindex=lambda wavelength: {
            "d": 1.5,
            "F": 1.6,
            "C": 1.6,
        }[wavelength]
    )
    with pytest.raises(ValueError) as equal_error:
        glass_config._raw_nd_vd(equal_f_lines)
    assert str(equal_error.value) == (
        "Unable to calculate glass nd/Vd coordinates: n_f equals n_c"
    )
    assert str(equal_error.value.__cause__) == "n_f equals n_c"

    overflow = SimpleNamespace(
        rindex=lambda wavelength: {
            "d": 1.0e308,
            "F": 1.0e-308,
            "C": -1.0e-308,
        }[wavelength]
    )
    with pytest.raises(ValueError) as overflow_error:
        glass_config._raw_nd_vd(overflow)
    assert str(overflow_error.value) == (
        "Unable to calculate glass nd/Vd coordinates: calculated Vd is not finite"
    )
    assert str(overflow_error.value.__cause__) == "calculated Vd is not finite"


def test_injected_glass_rejects_casefolded_name_and_native_air_aliases():
    """Injected catalogs cannot smuggle air or reflection media under new names."""
    valid_coordinates = {"d": 1.5, "F": 1.6, "C": 1.5}
    custom_materials = {
        "AIR": SimpleNamespace(
            name=lambda: "boring name",
            catalog_name=lambda: "Custom",
            rindex=lambda wavelength: valid_coordinates[wavelength],
        ),
        "REFLECTION": SimpleNamespace(
            name=lambda: "REFL",
            catalog_name=lambda: "Custom",
            rindex=lambda wavelength: valid_coordinates[wavelength],
        ),
        "GOOD": SimpleNamespace(
            name=lambda: "Good native name",
            catalog_name=lambda: "Custom",
            rindex=lambda wavelength: valid_coordinates[wavelength],
        ),
    }

    for name in ("AIR", "ReFl"):
        custom_materials[name] = custom_materials["AIR"]
        with pytest.raises(
            ValueError,
            match=rf"^Glass candidate {name!r} is not eligible$",
        ):
            glass_config._resolve_injected_glass_candidate(
                name,
                "Custom",
                {"Custom": custom_materials},
            )

    with pytest.raises(
        ValueError,
        match="^Glass candidate 'REFLECTION' is not eligible$",
    ) as native_error:
        glass_config._resolve_injected_glass_candidate(
            "REFLECTION",
            "Custom",
            {"Custom": custom_materials},
        )
    assert native_error.value.__cause__ is None


def test_injected_glass_returns_requested_identity_and_raw_coordinates():
    """Custom candidates preserve configured identity while returning raw coordinates."""
    medium = SimpleNamespace(
        name=lambda: "native name",
        catalog_name=lambda: "Custom",
        rindex=lambda wavelength: {
            "d": 1.52,
            "F": 1.55,
            "C": 1.50,
        }[wavelength],
    )

    candidate = glass_config._resolve_injected_glass_candidate(
        "USER_GLASS",
        "Custom",
        {"Custom": {"USER_GLASS": medium}},
    )

    assert candidate.identity == ("USER_GLASS", "Custom")
    assert candidate.medium is medium
    assert candidate.nd == pytest.approx(1.52)
    assert candidate.vd == pytest.approx(10.4)


def test_injected_glass_rejects_a_native_air_name_independently_of_requested_name():
    """A medium named air remains ineligible even when the configured alias differs."""
    medium = SimpleNamespace(
        name=lambda: "AIR",
        catalog_name=lambda: "Custom",
        rindex=lambda wavelength: {"d": 1.5, "F": 1.6, "C": 1.5}[wavelength],
    )

    with pytest.raises(
        ValueError,
        match="^Glass candidate 'NATIVE_AIR' is not eligible$",
    ):
        glass_config._resolve_injected_glass_candidate(
            "NATIVE_AIR",
            "Custom",
            {"Custom": {"NATIVE_AIR": medium}},
        )


@pytest.mark.parametrize("native_name", ["AIR", "REFL"])
def test_glass_variables_reject_native_air_and_reflection_current_media(
    monkeypatch: pytest.MonkeyPatch,
    native_name,
):
    """Current air and reflection media are rejected by native identity."""
    current = SimpleNamespace(
        name=lambda: native_name,
        catalog_name=lambda: "Custom",
    )
    opm = _glass_variable_model(current)
    monkeypatch.setattr(
        glass_config,
        "_resolve_configured_glass_candidate",
        lambda *_args, **_kwargs: _resolved_candidate("A", 1.5, 50.0),
    )

    with pytest.raises(
        ValueError,
        match=rf"^Unsupported current material at surface 0: {native_name}, Custom$",
    ):
        glass_config._resolve_glass_variables(
            opm,
            [{"surface_index": 0, "candidates": [{"name": "A", "catalog": "Custom"}]}],
            None,
        )


def test_glass_variables_reject_current_media_from_unsupported_catalog(
    monkeypatch: pytest.MonkeyPatch,
):
    """A non-injected current medium must use a supported catalog."""
    current = SimpleNamespace(
        name=lambda: "Current",
        catalog_name=lambda: "Unknown",
    )
    opm = _glass_variable_model(current)
    monkeypatch.setattr(
        glass_config,
        "_resolve_configured_glass_candidate",
        lambda *_args, **_kwargs: _resolved_candidate("A", 1.5, 50.0),
    )

    with pytest.raises(
        ValueError,
        match="^Unsupported current material at surface 0: Current, Unknown$",
    ):
        glass_config._resolve_glass_variables(
            opm,
            [{"surface_index": 0, "candidates": [{"name": "A", "catalog": "Custom"}]}],
            None,
        )


def test_configured_glass_rejects_unknown_catalog_with_exact_message():
    """Catalog routing rejects values outside manufacturer and injected sets."""
    with pytest.raises(ValueError, match="^Unsupported glass catalog: Unknown$"):
        glass_config._resolve_configured_glass_candidate("X", "Unknown", None)


def _glass_variable_model(current_medium):
    """Build one valid surface for direct glass-variable validation tests."""
    class OpticalModel(_SubscriptableNamespace):
        """Provide the sequence-model mapping expected by the normalizer."""

    return OpticalModel(
        seq_model=SimpleNamespace(
            gaps=[SimpleNamespace(medium=current_medium)],
        )
    )


def _resolved_candidate(name, nd, vd):
    """Create a deterministic resolved candidate for distance-contract tests."""
    return glass_config.ResolvedGlassCandidate(
        name=name,
        catalog="Custom",
        medium=object(),
        nd=nd,
        vd=vd,
    )


def test_glass_variables_report_entry_and_candidate_key_errors_deterministically(
    monkeypatch: pytest.MonkeyPatch,
):
    """Variable and candidate mappings reject unknown keys before resolution."""
    current = ModelGlass(1.5, 50.0, "current")
    opm = _glass_variable_model(current)
    monkeypatch.setattr(
        glass_config,
        "_native_material_identity",
        lambda *_args, **_kwargs: ("current", "Custom"),
    )
    monkeypatch.setattr(
        glass_config,
        "_material_identity",
        lambda *_args, **_kwargs: ("current", "Custom"),
    )

    with pytest.raises(ValueError, match="^Unsupported glass variable key: extra_a$"):
        glass_config._resolve_glass_variables(
            opm,
            [{"surface_index": 0, "candidates": [], "extra_b": 1, "extra_a": 2}],
            None,
        )

    with pytest.raises(IndexError, match="^surface_index True is out of range$"):
        glass_config._resolve_glass_variables(
            opm,
            [{"surface_index": True, "candidates": []}],
            None,
        )

    with pytest.raises(ValueError, match="^Unsupported glass candidate key: extra_a$"):
        glass_config._resolve_glass_variables(
            opm,
            [
                {
                    "surface_index": 0,
                    "candidates": [
                        {"name": "A", "catalog": "Custom", "extra_b": 1, "extra_a": 2}
                    ],
                }
            ],
            None,
        )


@pytest.mark.parametrize("candidate_inputs", [None, (), []])
def test_glass_variables_require_a_nonempty_candidate_list(
    monkeypatch: pytest.MonkeyPatch,
    candidate_inputs,
):
    """A glass surface cannot be normalized without at least one candidate."""
    current = ModelGlass(1.5, 50.0, "current")
    opm = _glass_variable_model(current)
    monkeypatch.setattr(
        glass_config,
        "_native_material_identity",
        lambda *_args, **_kwargs: ("current", "Custom"),
    )

    with pytest.raises(
        ValueError,
        match="^Glass variable surface 0 must provide candidates$",
    ):
        glass_config._resolve_glass_variables(
            opm,
            [{"surface_index": 0, "candidates": candidate_inputs}],
            None,
        )


@pytest.mark.parametrize(
    "candidate_input",
    [
        "not-a-mapping",
        {"name": "A", "catalog": "Custom", "extra": 1},
        {"name": 4, "catalog": "Custom"},
        {"name": "A", "catalog": 4},
    ],
)
def test_glass_variables_require_mapping_string_candidate_identity(
    monkeypatch: pytest.MonkeyPatch,
    candidate_input,
):
    """Candidate entries must be mappings with string name and catalog fields."""
    current = ModelGlass(1.5, 50.0, "current")
    opm = _glass_variable_model(current)
    monkeypatch.setattr(
        glass_config,
        "_native_material_identity",
        lambda *_args, **_kwargs: ("current", "Custom"),
    )
    monkeypatch.setattr(
        glass_config,
        "_resolve_configured_glass_candidate",
        lambda *_args, **_kwargs: _resolved_candidate("A", 1.5, 50.0),
    )

    expected = (
        "Glass candidates must provide name and catalog"
        if not isinstance(candidate_input, dict)
        or not isinstance(candidate_input.get("name"), str)
        or not isinstance(candidate_input.get("catalog"), str)
        else "Unsupported glass candidate key: extra"
    )
    with pytest.raises(ValueError, match=f"^{expected}$"):
        glass_config._resolve_glass_variables(
            opm,
            [{"surface_index": 0, "candidates": [candidate_input]}],
            None,
        )


@pytest.mark.parametrize(
    ("candidates", "expected"),
    [
        (
            [
                {"name": "A", "catalog": "Custom"},
                {"name": "B", "catalog": "Custom"},
            ],
            "B",
        ),
    ],
)
def test_model_glass_replacement_uses_squared_raw_coordinate_distance(
    monkeypatch: pytest.MonkeyPatch,
    candidates,
    expected,
):
    """ModelGlass incumbents map to the closest configured nd/Vd candidate."""
    current = ModelGlass(1.5, 50.0, "current")
    opm = _glass_variable_model(current)
    resolved = {
        "A": _resolved_candidate("A", 1.5, 52.0),
        "B": _resolved_candidate("B", 1.6, 50.0),
    }
    monkeypatch.setattr(
        glass_config,
        "_resolve_configured_glass_candidate",
        lambda name, *_args, **_kwargs: resolved[name],
    )
    monkeypatch.setattr(
        glass_config,
        "_native_material_identity",
        lambda *_args, **_kwargs: ("current", "Custom"),
    )
    monkeypatch.setattr(
        glass_config,
        "_material_identity",
        lambda *_args, **_kwargs: ("current", "Custom"),
    )

    normalized = glass_config._resolve_glass_variables(opm, [{"surface_index": 0, "candidates": candidates}], None)

    assert normalized[0]["model_replacement"].name == expected


@pytest.mark.parametrize(
    ("resolved", "expected"),
    [
        ({"A": (1.9, 50.0), "B": (1.5, 50.5)}, "A"),
        ({"A": (1.5, 50.4), "B": (2.0, 50.0)}, "A"),
        ({"A": (1.6, 50.0), "B": (0.1, 50.2)}, "A"),
        ({"A": (0.6, 50.5), "B": (2.3, 50.0)}, "B"),
        ({"A": (1.5, 49.1), "B": (2.3, 50.0)}, "B"),
    ],
)
def test_model_glass_distance_uses_both_coordinate_differences(
    monkeypatch: pytest.MonkeyPatch,
    resolved,
    expected,
):
    """Candidate selection remains sensitive to signed nd and Vd differences."""
    current = ModelGlass(1.5, 50.0, "current")
    opm = _glass_variable_model(current)
    candidate_map = {
        name: _resolved_candidate(name, nd, vd)
        for name, (nd, vd) in resolved.items()
    }
    monkeypatch.setattr(
        glass_config,
        "_resolve_configured_glass_candidate",
        lambda name, *_args, **_kwargs: candidate_map[name],
    )
    monkeypatch.setattr(
        glass_config,
        "_native_material_identity",
        lambda *_args, **_kwargs: ("current", "Custom"),
    )
    monkeypatch.setattr(
        glass_config,
        "_material_identity",
        lambda *_args, **_kwargs: ("current", "Custom"),
    )

    normalized = glass_config._resolve_glass_variables(
        opm,
        [
            {
                "surface_index": 0,
                "candidates": [
                    {"name": "A", "catalog": "Custom"},
                    {"name": "B", "catalog": "Custom"},
                ],
            }
        ],
        None,
    )

    assert normalized[0]["model_replacement"].name == expected
