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


def test_decenter_variable_and_pickup_normalization_preserves_strategy(monkeypatch):
    import rayoptics_web_utils.optimization.config as config

    monkeypatch.setattr(config, "validate_target_for_kind", lambda *args, **kwargs: None)
    variable = config.normalize_variables(
        _FakeOpticalModel(),
        [{"kind": "decenter_alpha", "surface_index": 2, "decenter_type": "bend"}],
        _optimizer(method="lm"),
    )
    pickup = config.normalize_pickups(
        _FakeOpticalModel(),
        [{"kind": "decenter_x", "surface_index": 2, "source_surface_index": 1, "decenter_type": "reverse"}],
        set(),
    )

    assert variable[0]["decenter_type"] == "bend"
    assert pickup[0]["decenter_type"] == "reverse"


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


def test_operand_defaults_include_weight_and_missing_sample_weights():
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    model = _FakeOpticalModel()
    scalar = normalize_operand_samples(model, {"kind": "focal_length", "target": 50})
    explicit_samples = normalize_operand_samples(
        model,
        {
            "kind": "opd_difference",
            "target": 0,
            "fields": [{"index": 0}],
            "wavelengths": [{"index": 1}],
        },
    )

    assert scalar == [
        {
            "kind": "focal_length",
            "weight": 1.0,
            "options": {},
            "target": 50.0,
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


@pytest.mark.parametrize(
    "operand, message",
    [
        ({"kind": "focal_length"}, "Operand focal_length requires a finite target"),
        ({"kind": "rms_spot_size", "target": None}, "Operand rms_spot_size requires a finite target"),
        ({"kind": "f_number", "target": float("nan")}, "Operand f_number requires a finite target"),
        ({"kind": "f_number", "target": float("inf")}, "Operand f_number requires a finite target"),
        ({"kind": "focal_length", "target": 1.0, "min": 0.0}, "Operand focal_length does not accept range bounds"),
        ({"kind": "focal_length", "target": 1.0, "max": 2.0}, "Operand focal_length does not accept range bounds"),
        ({"kind": "ray_fan", "target": 0.0}, "Operand ray_fan does not accept a target"),
        ({"kind": "ray_fan_sagittal", "min": 0.0}, "Operand ray_fan_sagittal does not accept range bounds"),
        ({"kind": "ray_fan_tangential", "max": 0.0}, "Operand ray_fan_tangential does not accept range bounds"),
    ],
)
def test_operand_target_mode_is_strictly_matched_to_kind(operand, message):
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    with pytest.raises(ValueError) as exc_info:
        normalize_operand_samples(_FakeOpticalModel(), operand)
    assert exc_info.value.args == (message,)


@pytest.fixture
def fake_range_operand(monkeypatch):
    import rayoptics_web_utils.optimization.operands as operands_module

    monkeypatch.setattr(operands_module, "RANGE_OPERAND_KINDS", frozenset({"fake_range"}))
    monkeypatch.setitem(operands_module.OPERAND_REGISTRY, "fake_range", lambda *args: 0.0)
    return "fake_range"


@pytest.mark.parametrize(
    "bounds",
    [{"min": 1.0}, {"max": 2.0}, {"min": 1.0, "max": 2.0}, {"min": 1.5, "max": 1.5}],
)
def test_range_operand_copies_only_supplied_bounds(fake_range_operand, bounds):
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    samples = normalize_operand_samples(
        _FakeOpticalModel(),
        {"kind": fake_range_operand, "fields": [{"index": 0}], "wavelengths": [{"index": 1}], **bounds},
    )

    assert samples == [
        {
            "kind": fake_range_operand,
            "weight": 1.0,
            "options": {},
            **bounds,
            "field_index": 0,
            "field_weight": 1.0,
            "wavelength_index": 1,
            "wavelength_weight": 1.0,
        }
    ]


@pytest.mark.parametrize(
    "bounds, message",
    [
        ({}, "Operand fake_range range requires at least one bound"),
        ({"min": float("nan")}, "Operand fake_range range bounds must be finite"),
        ({"max": float("-inf")}, "Operand fake_range range bounds must be finite"),
        ({"min": None}, "Operand fake_range range bounds must be finite"),
        ({"min": 2.0, "max": 1.0}, "Operand fake_range range min must not exceed max"),
        ({"target": 0.0, "min": 1.0}, "Operand fake_range does not accept a target"),
    ],
)
def test_range_operand_rejects_invalid_bounds(fake_range_operand, bounds, message):
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    with pytest.raises(ValueError) as exc_info:
        normalize_operand_samples(_FakeOpticalModel(), {"kind": fake_range_operand, **bounds})
    assert exc_info.value.args == (message,)


@pytest.fixture
def fake_surface_operands(monkeypatch):
    import rayoptics_web_utils.optimization.operands as operands_module

    monkeypatch.setattr(operands_module, "SURFACE_ADJUSTABLE_TARGET_OPERAND_KINDS", frozenset({"fake_surface_target"}))
    monkeypatch.setattr(operands_module, "SURFACE_FIXED_TARGET_OPERAND_KINDS", frozenset({"fake_surface_fixed"}))
    monkeypatch.setattr(operands_module, "SURFACE_RANGE_OPERAND_KINDS", frozenset({"fake_surface_range"}))
    for kind in ("fake_surface_target", "fake_surface_fixed", "fake_surface_range"):
        monkeypatch.setitem(operands_module.SURFACE_OPERAND_REGISTRY, kind, lambda *args: 0.0)


@pytest.mark.parametrize(
    "operand, goal_fields",
    [
        ({"kind": "fake_surface_target", "target": 3}, {"target": 3.0}),
        ({"kind": "fake_surface_fixed"}, {}),
        ({"kind": "fake_surface_range", "min": 1.0}, {"min": 1.0}),
        ({"kind": "fake_surface_range", "min": 1.0, "max": 2.0}, {"min": 1.0, "max": 2.0}),
    ],
)
@pytest.mark.parametrize("surface_index", [1, 2])
def test_surface_operand_preserves_surface_index_on_every_sample(
    fake_surface_operands, operand, goal_fields, surface_index
):
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    samples = normalize_operand_samples(
        _FakeOpticalModel(),
        {**operand, "surface_index": surface_index, "fields": [{"index": 0}, {"index": 1}], "wavelengths": [{"index": 1}]},
    )

    assert samples == [
        {
            "kind": operand["kind"],
            "weight": 1.0,
            "options": {},
            **goal_fields,
            "surface_index": surface_index,
            "field_index": field_index,
            "field_weight": 1.0,
            "wavelength_index": 1,
            "wavelength_weight": 1.0,
        }
        for field_index in (0, 1)
    ]


@pytest.mark.parametrize("surface_index_fields", [{}, {"surface_index": None}, {"surface_index": True}, {"surface_index": 1.0}, {"surface_index": "1"}])
def test_surface_operand_requires_an_integer_surface_index(fake_surface_operands, surface_index_fields):
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    with pytest.raises(ValueError) as exc_info:
        normalize_operand_samples(
            _FakeOpticalModel(),
            {"kind": "fake_surface_target", "target": 0.0, **surface_index_fields},
        )
    assert exc_info.value.args == ("Operand fake_surface_target requires an integer surface_index",)


@pytest.mark.parametrize("surface_index", [-1, 0, 3, 4])
@pytest.mark.parametrize("weight", [1.0, 0.0])
def test_surface_operand_rejects_object_image_and_out_of_range_surfaces(fake_surface_operands, surface_index, weight):
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    with pytest.raises(IndexError) as exc_info:
        normalize_operand_samples(
            _FakeOpticalModel(),
            {"kind": "fake_surface_fixed", "surface_index": surface_index, "weight": weight},
        )
    assert exc_info.value.args == (f"Operand fake_surface_fixed surface_index {surface_index} is out of range",)


@pytest.mark.parametrize(
    "operand",
    [
        {"kind": "focal_length", "target": 1.0, "surface_index": 1},
        {"kind": "ray_fan", "surface_index": 1},
    ],
)
def test_system_operand_rejects_surface_index(operand):
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    with pytest.raises(ValueError) as exc_info:
        normalize_operand_samples(_FakeOpticalModel(), operand)
    assert exc_info.value.args == (f"Operand {operand['kind']} does not accept a surface_index",)


@pytest.mark.parametrize(
    "operand, message",
    [
        ({"kind": "fake_surface_target"}, "Operand fake_surface_target requires a finite target"),
        ({"kind": "fake_surface_fixed", "target": 0.0}, "Operand fake_surface_fixed does not accept a target"),
        ({"kind": "fake_surface_fixed", "max": 0.0}, "Operand fake_surface_fixed does not accept range bounds"),
        ({"kind": "fake_surface_range"}, "Operand fake_surface_range range requires at least one bound"),
        ({"kind": "fake_surface_range", "min": 2.0, "max": 1.0}, "Operand fake_surface_range range min must not exceed max"),
    ],
)
def test_surface_operand_still_enforces_its_target_mode(fake_surface_operands, operand, message):
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    with pytest.raises(ValueError) as exc_info:
        normalize_operand_samples(_FakeOpticalModel(), {**operand, "surface_index": 1})
    assert exc_info.value.args == (message,)


def test_operand_default_field_and_wavelength_weights_are_one():
    from rayoptics_web_utils.optimization.config import normalize_operand_samples

    samples = normalize_operand_samples(
        _FakeOpticalModel(),
        {
            "kind": "opd_difference",
            "target": 0.0,
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
            {"operands": [{"kind": "focal_length", "target": 0.0, "weight": 0.0}]},
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


@pytest.mark.parametrize(
    ("optimizer", "variables", "expected"),
    [
        ({}, [{"min": 0.0, "max": 1.0}, {"min": 0.0, "max": 1.0}], 30),
        ({"popsize": 1}, [{"min": 0.0, "max": 1.0}, {"min": 0.0, "max": 1.0}], 5),
        ({"popsize": 4}, [{"min": 0.0, "max": 1.0}, {"min": 2.0, "max": 2.0}], 5),
        ({"popsize": 4}, [{"min": 0.0, "max": 1.0}, {"min": 0.0, "max": 1.0}, {"min": 2.0, "max": 2.0}], 8),
        ({"popsize": 4}, [{"min": 2.0, "max": 2.0}], 5),
        ({"popsize": 15, "init": [[0.0]] * 7}, [{"min": 0.0, "max": 1.0}], 7),
        ({"init": "sobol"}, [{"min": 0.0, "max": 1.0}, {"min": 0.0, "max": 1.0}], 32),
        ({"popsize": 1, "init": "sobol"}, [{"min": 0.0, "max": 1.0}, {"min": 0.0, "max": 1.0}], 8),
        ({"popsize": 4, "init": "sobol"}, [{"min": 0.0, "max": 1.0}, {"min": 0.0, "max": 1.0}], 8),
    ],
)
def test_differential_evolution_population_size_mirrors_scipy(optimizer, variables, expected):
    from rayoptics_web_utils.optimization.config import differential_evolution_population_size

    assert differential_evolution_population_size(
        {"kind": "differential_evolution", **optimizer},
        [{"kind": "thickness", "surface_index": 1, **variable} for variable in variables],
    ) == expected


def test_differential_evolution_budget_below_one_population_error_is_exact():
    from rayoptics_web_utils.optimization.config import validate_optimizer_dimensions

    variables = [
        {"kind": "thickness", "surface_index": 1, "min": 0.0, "max": 1.0},
        {"kind": "thickness", "surface_index": 2, "min": 0.0, "max": 1.0},
    ]
    operands = {"operands": [{"kind": "focal_length", "target": 0.0, "weight": 1.0}]}

    with pytest.raises(ValueError) as exc_info:
        validate_optimizer_dimensions(
            {"kind": "differential_evolution", "max_nfev": 29},
            variables,
            operands,
        )

    assert exc_info.value.args == (
        "Differential evolution max_nfev must cover at least one full population",
    )
    validate_optimizer_dimensions({"kind": "differential_evolution", "max_nfev": 30}, variables, operands)
    validate_optimizer_dimensions({"kind": "differential_evolution"}, variables, operands)
    validate_optimizer_dimensions({"kind": "differential_evolution", "max_nfev": 1}, [], operands)


def test_differential_evolution_sobol_budget_requires_power_of_two_population():
    from rayoptics_web_utils.optimization.config import validate_optimizer_dimensions

    variables = [
        {"kind": "thickness", "surface_index": 1, "min": 0.0, "max": 1.0},
        {"kind": "thickness", "surface_index": 2, "min": 0.0, "max": 1.0},
    ]
    operands = {"operands": [{"kind": "focal_length", "target": 0.0, "weight": 1.0}]}

    with pytest.raises(ValueError, match="must cover at least one full population"):
        validate_optimizer_dimensions(
            {"kind": "differential_evolution", "init": "sobol", "max_nfev": 30},
            variables,
            operands,
        )
    validate_optimizer_dimensions(
        {"kind": "differential_evolution", "init": "sobol", "max_nfev": 32},
        variables,
        operands,
    )


def test_lm_budget_below_two_error_is_exact():
    from rayoptics_web_utils.optimization.config import validate_optimizer_dimensions

    variables = [{"kind": "thickness", "surface_index": 1}]
    operands = {"operands": [{"kind": "focal_length", "target": 0.0, "weight": 1.0}]}

    with pytest.raises(ValueError) as exc_info:
        validate_optimizer_dimensions(
            {"kind": "least_squares", "method": "lm", "max_nfev": 1},
            variables,
            operands,
        )

    assert exc_info.value.args == ("Levenberg-Marquardt max_nfev must be at least 2",)
    validate_optimizer_dimensions({"kind": "least_squares", "method": "lm", "max_nfev": 2}, variables, operands)
    validate_optimizer_dimensions({"kind": "least_squares", "method": "lm"}, variables, operands)
    validate_optimizer_dimensions({"kind": "least_squares", "method": "lm", "max_nfev": 1}, [], operands)
    validate_optimizer_dimensions(
        {"kind": "least_squares", "method": "trf", "max_nfev": 1},
        [{"kind": "thickness", "surface_index": 1, "min": 0.0, "max": 1.0}],
        operands,
    )
