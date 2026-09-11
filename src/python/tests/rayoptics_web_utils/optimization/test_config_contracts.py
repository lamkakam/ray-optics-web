"""Exact contracts for optimization configuration normalization and validation.

Small model fakes make defaults, error text, pickup source descriptors, and
field/wavelength expansion observable without invoking a numerical optimizer.
"""

from types import SimpleNamespace

import pytest


class _FakeOpticalModel:
    def __init__(self, field_count=2, wavelength_count=2):
        self.seq_model = SimpleNamespace(
            ifcs=[object() for _ in range(4)],
            gaps=[object() for _ in range(4)],
        )
        self.optical_spec = {
            "fov": SimpleNamespace(fields=[object() for _ in range(field_count)]),
            "wvls": SimpleNamespace(wavelengths=[500.0 + index for index in range(wavelength_count)]),
        }

    def __getitem__(self, key):
        if key == "seq_model":
            return self.seq_model
        if key == "optical_spec":
            return self.optical_spec
        raise KeyError(key)


def _optimizer(kind="least_squares", method=None):
    from rayoptics_web_utils.optimization.config import normalize_optimizer_config

    options = {"kind": kind}
    if method is not None:
        options["method"] = method
    return normalize_optimizer_config({"optimizer": options})


def test_optimizer_normalization_preserves_every_supported_option_and_exact_error_context():
    from rayoptics_web_utils.optimization.config import normalize_optimizer_config

    differential_evolution = normalize_optimizer_config(
        {
            "optimizer": {
                "kind": "differential_evolution",
                "strategy": "best1bin",
                "max_nfev": 12,
                "popsize": 3,
                "tol": 1e-5,
                "mutation": (0.3, 0.8),
                "recombination": 0.4,
                "seed": 4,
                "polish": False,
                "init": "latinhypercube",
                "atol": 1e-8,
            }
        }
    )

    assert differential_evolution == {
        "kind": "differential_evolution",
        "strategy": "best1bin",
        "max_nfev": 12,
        "popsize": 3,
        "tol": 1e-5,
        "mutation": (0.3, 0.8),
        "recombination": 0.4,
        "seed": 4,
        "polish": False,
        "init": "latinhypercube",
        "atol": 1e-8,
    }

    with pytest.raises(ValueError) as exc_info:
        normalize_optimizer_config({"optimizer": {"kind": "least_squares", "unexpected": 1}})
    assert exc_info.value.args == ("Unsupported optimizer option for least_squares: unexpected",)


@pytest.mark.parametrize(
    ("optimizer", "entry", "message"),
    [
        (
            {"kind": "least_squares", "method": "trf"},
            {"kind": "radius", "surface_index": 1, "min": 0.0},
            "Variables must provide both min and max bounds",
        ),
        (
            {"kind": "least_squares", "method": "lm"},
            {"kind": "radius", "surface_index": 1, "min": 0.0},
            "lm variables must omit both min and max bounds together",
        ),
        (
            {"kind": "differential_evolution"},
            {"kind": "radius", "surface_index": 1, "min": 0.0, "max": float("inf")},
            "Differential evolution variables must provide finite min and max bounds",
        ),
    ],
)
def test_variable_bound_errors_are_exact(optimizer, entry, message, monkeypatch):
    import rayoptics_web_utils.optimization.config as config

    monkeypatch.setattr(config, "validate_target_for_kind", lambda *args, **kwargs: None)

    with pytest.raises(ValueError) as exc_info:
        config.normalize_variables(_FakeOpticalModel(), [entry], _optimizer(**optimizer))
    assert exc_info.value.args == (message,)


def test_pickup_normalization_preserves_asphere_descriptors_and_exact_source_descriptor(monkeypatch):
    import rayoptics_web_utils.optimization.config as config

    validation_calls = []

    def fake_validate(_opm, entry, label="surface_index"):
        validation_calls.append((dict(entry), label))

    monkeypatch.setattr(config, "validate_target_for_kind", fake_validate)
    entry = {
        "kind": "asphere_polynomial_coefficient",
        "surface_index": 3,
        "source_surface_index": 1,
        "asphere_kind": "RadialPolynomial",
        "coefficient_index": 4,
        "source_coefficient_index": 2,
        "scale": 2,
        "offset": -3,
    }

    normalized = config.normalize_pickups(_FakeOpticalModel(), [entry], set())

    assert normalized == [
        {
            "kind": "asphere_polynomial_coefficient",
            "surface_index": 3,
            "source_surface_index": 1,
            "asphere_kind": "RadialPolynomial",
            "coefficient_index": 4,
            "source_coefficient_index": 2,
            "scale": 2.0,
            "offset": -3.0,
        }
    ]
    assert validation_calls == [
        (
            {
                "kind": "asphere_polynomial_coefficient",
                "surface_index": 3,
                "source_surface_index": 1,
                "asphere_kind": "RadialPolynomial",
                "coefficient_index": 4,
                "source_coefficient_index": 2,
            },
            "surface_index",
        ),
        (
            {
                "kind": "asphere_polynomial_coefficient",
                "surface_index": 1,
                "source_surface_index": 1,
                "asphere_kind": "RadialPolynomial",
                "coefficient_index": 2,
                "source_coefficient_index": 2,
            },
            "source_surface_index",
        ),
    ]


@pytest.mark.parametrize("kind", ["asphere_conic_constant", "asphere_toric_sweep_radius"])
def test_pickup_normalization_retains_asphere_kind_for_each_non_polynomial_asphere(kind, monkeypatch):
    import rayoptics_web_utils.optimization.config as config

    monkeypatch.setattr(config, "validate_target_for_kind", lambda *args, **kwargs: None)
    normalized = config.normalize_pickups(
        _FakeOpticalModel(),
        [
            {
                "kind": kind,
                "surface_index": 3,
                "source_surface_index": 1,
                "asphere_kind": "XToroid" if kind.endswith("sweep_radius") else "Conic",
            }
        ],
        set(),
    )

    assert normalized[0]["asphere_kind"] == ("XToroid" if kind.endswith("sweep_radius") else "Conic")


def test_target_validation_uses_default_and_explicit_labels(monkeypatch):
    import rayoptics_web_utils.optimization.config as config

    labels = []
    monkeypatch.setattr(
        config,
        "validate_surface_index",
        lambda _sequence, _index, label: labels.append(label),
    )
    opm = _FakeOpticalModel()

    config.validate_target_for_kind(opm, {"kind": "radius", "surface_index": 1})
    config.validate_target_for_kind(
        opm,
        {"kind": "thickness", "surface_index": 1},
        "gap_index",
    )

    assert labels == ["surface_index", "gap_index"]


def test_asphere_target_validation_forwards_custom_label_and_rejects_unknown_kind(monkeypatch):
    import rayoptics_web_utils.optimization.config as config

    labels = []
    profile = SimpleNamespace(coefs=[])
    monkeypatch.setattr(
        config,
        "validate_surface_index",
        lambda _sequence, _index, label: labels.append(label),
    )
    monkeypatch.setattr(config, "ensure_asphere_profile", lambda *args, **kwargs: None)
    monkeypatch.setattr(config, "surface_profile", lambda *args, **kwargs: profile)
    monkeypatch.setattr(config, "supports_polynomials", lambda _profile: True)
    monkeypatch.setattr(config, "is_toroid", lambda _profile: True)
    opm = _FakeOpticalModel()

    config.validate_target_for_kind(
        opm,
        {
            "kind": "asphere_polynomial_coefficient",
            "surface_index": 1,
            "coefficient_index": 0,
        },
        "asphere_index",
    )
    with pytest.raises(ValueError) as exc_info:
        config.validate_target_for_kind(opm, {"kind": "unknown", "surface_index": 1})

    assert labels == ["asphere_index"]
    assert exc_info.value.args == ("Unknown variable kind: unknown",)


@pytest.mark.parametrize("coefficient_index", [-1, 10, "zero"])
def test_polynomial_target_rejects_every_invalid_coefficient_index(coefficient_index, monkeypatch):
    import rayoptics_web_utils.optimization.config as config

    monkeypatch.setattr(config, "ensure_asphere_profile", lambda *args, **kwargs: None)
    monkeypatch.setattr(config, "surface_profile", lambda *args, **kwargs: SimpleNamespace(coefs=[]))
    monkeypatch.setattr(config, "supports_polynomials", lambda _profile: True)

    with pytest.raises(IndexError) as exc_info:
        config.validate_target_for_kind(
            _FakeOpticalModel(),
            {
                "kind": "asphere_polynomial_coefficient",
                "surface_index": 1,
                "coefficient_index": coefficient_index,
            },
        )
    assert exc_info.value.args == (f"coefficient_index {coefficient_index} is out of range",)


@pytest.mark.parametrize("coefficient_index", [0, 9])
def test_polynomial_target_accepts_inclusive_coefficient_bounds(coefficient_index, monkeypatch):
    import rayoptics_web_utils.optimization.config as config

    monkeypatch.setattr(config, "ensure_asphere_profile", lambda *args, **kwargs: None)
    monkeypatch.setattr(config, "surface_profile", lambda *args, **kwargs: SimpleNamespace(coefs=[]))
    monkeypatch.setattr(config, "supports_polynomials", lambda _profile: True)

    config.validate_target_for_kind(
        _FakeOpticalModel(),
        {
            "kind": "asphere_polynomial_coefficient",
            "surface_index": 1,
            "coefficient_index": coefficient_index,
        },
    )


def test_asphere_target_error_messages_are_exact(monkeypatch):
    import rayoptics_web_utils.optimization.config as config

    monkeypatch.setattr(config, "ensure_asphere_profile", lambda *args, **kwargs: None)
    monkeypatch.setattr(config, "surface_profile", lambda *args, **kwargs: SimpleNamespace())
    monkeypatch.setattr(config, "supports_polynomials", lambda _profile: False)
    monkeypatch.setattr(config, "is_toroid", lambda _profile: False)
    opm = _FakeOpticalModel()

    with pytest.raises(ValueError) as polynomial_error:
        config.validate_target_for_kind(
            opm,
            {
                "kind": "asphere_polynomial_coefficient",
                "surface_index": 1,
                "coefficient_index": 0,
            },
        )
    with pytest.raises(ValueError) as toroid_error:
        config.validate_target_for_kind(
            opm,
            {
                "kind": "asphere_toric_sweep_radius",
                "surface_index": 1,
            },
        )

    assert polynomial_error.value.args == (
        "Polynomial coefficient target requires a coefficient-bearing asphere",
    )
    assert toroid_error.value.args == (
        "Toroid sweep radius target requires an XToroid or YToroid surface",
    )


def test_pickup_graph_and_order_handle_a_single_acyclic_edge_exactly():
    from rayoptics_web_utils.optimization.config import pickup_order, validate_pickup_graph

    pickup = {
        "kind": "radius",
        "surface_index": 2,
        "source_surface_index": 1,
        "scale": 1.0,
        "offset": 0.0,
    }

    assert validate_pickup_graph([pickup]) is None
    assert pickup_order([pickup]) == [pickup]


def test_pickup_cycle_error_text_is_exact():
    from rayoptics_web_utils.optimization.config import validate_pickup_graph

    pickups = [
        {
            "kind": "radius",
            "surface_index": 1,
            "source_surface_index": 2,
            "scale": 1.0,
            "offset": 0.0,
        },
        {
            "kind": "radius",
            "surface_index": 2,
            "source_surface_index": 1,
            "scale": 1.0,
            "offset": 0.0,
        },
    ]

    with pytest.raises(ValueError) as exc_info:
        validate_pickup_graph(pickups)
    assert exc_info.value.args == ("Pickup cycle detected",)


@pytest.mark.parametrize("kind", ["ray_fan", "ray_fan_tangential", "ray_fan_sagittal"])
def test_each_ray_fan_kind_omits_scalar_target(kind):
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    samples = normalize_operand_samples(
        _FakeOpticalModel(),
        {
            "kind": kind,
            "fields": [{"index": 1}],
            "wavelengths": [{"index": 0}],
        },
    )

    assert samples == [
        {
            "kind": kind,
            "weight": 1.0,
            "options": {},
            "field_index": 1,
            "field_weight": 1.0,
            "wavelength_index": 0,
            "wavelength_weight": 1.0,
        }
    ]


def test_operand_defaults_include_target_weight_and_missing_sample_weights():
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    model = _FakeOpticalModel()
    scalar = normalize_operand_samples(model, {"kind": "focal_length"})
    explicit_samples = normalize_operand_samples(
        model,
        {
            "kind": "opd_difference",
            "fields": [{"index": 0}],
            "wavelengths": [{"index": 1}],
        },
    )

    assert scalar == [
        {
            "kind": "focal_length",
            "weight": 1.0,
            "options": {},
            "target": 0.0,
            "field_index": None,
            "field_weight": 1.0,
            "wavelength_index": None,
            "wavelength_weight": 1.0,
        }
    ]
    assert explicit_samples[0]["weight"] == 1.0
    assert explicit_samples[0]["target"] == 0.0
    assert explicit_samples[0]["field_weight"] == 1.0
    assert explicit_samples[0]["wavelength_weight"] == 1.0


def test_operand_default_field_and_wavelength_weights_are_one():
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    samples = normalize_operand_samples(
        _FakeOpticalModel(),
        {
            "kind": "opd_difference",
            "fields": [],
            "wavelengths": [],
        },
    )

    assert len(samples) == 4
    assert {(sample["field_weight"], sample["wavelength_weight"]) for sample in samples} == {(1.0, 1.0)}


def test_merit_function_empty_and_zero_sample_errors_are_exact(monkeypatch):
    import rayoptics_web_utils.optimization.config as config

    with pytest.raises(ValueError) as empty_error:
        config.normalize_merit_function(_FakeOpticalModel(), {})
    with pytest.raises(ValueError) as zero_error:
        config.normalize_merit_function(
            _FakeOpticalModel(),
            {"operands": [{"kind": "focal_length", "weight": 0.0}]},
        )

    assert empty_error.value.args == ("merit_function.operands must not be empty",)
    assert zero_error.value.args == (
        "merit_function.operands must include at least one non-zero weighted sample",
    )


def test_lm_dimension_error_is_exact():
    from rayoptics_web_utils.optimization.config import validate_optimizer_dimensions

    with pytest.raises(ValueError) as exc_info:
        validate_optimizer_dimensions(
            _optimizer(method="lm"),
            [{"kind": "radius", "surface_index": 1}, {"kind": "radius", "surface_index": 2}],
            {"operands": [{"kind": "focal_length", "target": 0.0, "weight": 1.0}]},
        )

    assert exc_info.value.args == (
        "Levenberg-Marquardt requires at least as many residuals as variables",
    )
