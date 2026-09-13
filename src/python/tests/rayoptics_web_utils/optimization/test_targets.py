"""Behavioral tests for optimization target state and asphere materialization.

These tests exercise the public target contract directly: radius/curvature
conversion, target-key round trips, profile creation, scalar and aspheric
read/write branches, snapshots, and restoration. Small deterministic fakes
keep target semantics independent of solver or ray-trace results.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest


class _FakeModel:
    def __init__(self):
        self.seq_model = SimpleNamespace(
            ifcs=[
                SimpleNamespace(profile=SimpleNamespace(r=10.0)),
                SimpleNamespace(profile=SimpleNamespace(r=20.0)),
            ],
            gaps=[
                SimpleNamespace(thi=100.0),
                SimpleNamespace(thi=5.0),
            ],
        )
        self.update_count = 0

    def __getitem__(self, key):
        if key == "seq_model":
            return self.seq_model
        raise KeyError(key)

    def update_model(self):
        self.update_count += 1


def test_radius_and_curvature_conversions_preserve_zero_and_sign():
    from rayoptics_web_utils.optimization.targets import (
        curvature_to_radius,
        radius_to_curvature,
    )

    assert radius_to_curvature(0.0) == 0.0
    assert radius_to_curvature(-4.0) == pytest.approx(-0.25)
    assert curvature_to_radius(0.0) == 0.0
    assert curvature_to_radius(-0.25) == pytest.approx(-4.0)


@pytest.mark.parametrize(
    ("key", "entry"),
    [
        (
            ("radius", 3),
            {"kind": "radius", "surface_index": 3},
        ),
        (
            ("thickness", 2),
            {"kind": "thickness", "surface_index": 2},
        ),
        (
            ("asphere_polynomial_coefficient", 4, 7),
            {
                "kind": "asphere_polynomial_coefficient",
                "surface_index": 4,
                "coefficient_index": 7,
            },
        ),
    ],
)
def test_target_keys_round_trip_to_their_target_entries(key, entry):
    from rayoptics_web_utils.optimization.targets import (
        entry_from_target_key,
        target_key,
    )

    assert target_key(entry) == key
    assert entry_from_target_key(key) == entry


def test_asphere_kind_registry_has_all_supported_profile_types():
    from rayoptics.elem.profiles import EvenPolynomial, RadialPolynomial, XToroid, YToroid
    from rayoptics_web_utils.optimization.targets import asphere_kinds

    assert asphere_kinds() == {
        "Conic": EvenPolynomial,
        "EvenAspherical": EvenPolynomial,
        "RadialPolynomial": RadialPolynomial,
        "XToroid": XToroid,
        "YToroid": YToroid,
    }


@pytest.mark.parametrize(
    ("asphere_kind", "profile_name"),
    [
        ("Conic", "EvenPolynomial"),
        ("EvenAspherical", "EvenPolynomial"),
        ("RadialPolynomial", "RadialPolynomial"),
        ("XToroid", "XToroid"),
        ("YToroid", "YToroid"),
    ],
)
def test_ensure_asphere_profile_materializes_each_supported_kind(
    asphere_kind,
    profile_name,
):
    from rayoptics_web_utils.optimization.targets import ensure_asphere_profile

    opm = _FakeModel()
    entry = {
        "kind": "asphere_conic_constant",
        "surface_index": 1,
        "asphere_kind": asphere_kind,
    }

    ensure_asphere_profile(opm, entry)

    profile = opm.seq_model.ifcs[1].profile
    assert type(profile).__name__ == profile_name
    assert profile.r == pytest.approx(20.0)
    assert profile.cc == pytest.approx(0.0)
    if asphere_kind in {"XToroid", "YToroid"}:
        assert profile.cR == pytest.approx(20.0)


def test_ensure_asphere_profile_is_idempotent_and_rejects_type_conflicts():
    from rayoptics_web_utils.optimization.targets import ensure_asphere_profile

    opm = _FakeModel()
    matching = {
        "kind": "asphere_conic_constant",
        "surface_index": 1,
        "asphere_kind": "EvenAspherical",
    }
    ensure_asphere_profile(opm, matching)
    materialized = opm.seq_model.ifcs[1].profile
    ensure_asphere_profile(opm, matching)
    assert opm.seq_model.ifcs[1].profile is materialized

    with pytest.raises(ValueError, match="already aspheric with a different type"):
        ensure_asphere_profile(
            opm,
            {
                "kind": "asphere_conic_constant",
                "surface_index": 1,
                "asphere_kind": "RadialPolynomial",
            },
        )


def test_ensure_asphere_profile_ignores_non_asphere_targets_and_rejects_unknown_kind():
    from rayoptics_web_utils.optimization.targets import ensure_asphere_profile

    opm = _FakeModel()
    original_profile = opm.seq_model.ifcs[1].profile
    ensure_asphere_profile(
        opm,
        {"kind": "radius", "surface_index": 1},
    )
    assert opm.seq_model.ifcs[1].profile is original_profile

    with pytest.raises(ValueError, match="Unknown asphere kind: Unknown"):
        ensure_asphere_profile(
            opm,
            {
                "kind": "asphere_conic_constant",
                "surface_index": 1,
                "asphere_kind": "Unknown",
            },
        )


def test_target_read_and_write_cover_scalar_asphere_and_toroid_branches():
    from rayoptics_web_utils.optimization.targets import (
        read_target_value,
        write_target_value,
    )

    opm = _FakeModel()
    write_target_value(opm, {"kind": "radius", "surface_index": 1}, -25.0)
    write_target_value(opm, {"kind": "thickness", "surface_index": 1}, 7.5)
    assert read_target_value(opm, {"kind": "radius", "surface_index": 1}) == pytest.approx(-25.0)
    assert read_target_value(opm, {"kind": "thickness", "surface_index": 1}) == pytest.approx(7.5)

    conic = {
        "kind": "asphere_conic_constant",
        "surface_index": 1,
        "asphere_kind": "EvenAspherical",
    }
    coefficient = {
        "kind": "asphere_polynomial_coefficient",
        "surface_index": 1,
        "asphere_kind": "EvenAspherical",
        "coefficient_index": 3,
    }
    write_target_value(opm, conic, -0.8)
    write_target_value(opm, coefficient, 2.5)
    assert read_target_value(opm, conic) == pytest.approx(-0.8)
    assert read_target_value(opm, coefficient) == pytest.approx(2.5)
    assert opm.seq_model.ifcs[1].profile.coefs == [0.0, 0.0, 0.0, 2.5]
    assert read_target_value(
        opm,
        {
            "kind": "asphere_polynomial_coefficient",
            "surface_index": 1,
            "asphere_kind": "EvenAspherical",
            "coefficient_index": 6,
        },
    ) == pytest.approx(0.0)

    toric = {
        "kind": "asphere_toric_sweep_radius",
        "surface_index": 1,
        "asphere_kind": "XToroid",
    }
    toric_opm = _FakeModel()
    write_target_value(toric_opm, toric, 31.0)
    assert read_target_value(toric_opm, toric) == pytest.approx(31.0)


@pytest.mark.parametrize(
    ("kind", "attribute", "slot"),
    [
        ("decenter_alpha", "euler", 0),
        ("decenter_beta", "euler", 1),
        ("decenter_gamma", "euler", 2),
        ("decenter_x", "dec", 0),
        ("decenter_y", "dec", 1),
    ],
)
def test_decenter_targets_materialize_and_read_write_all_components(kind, attribute, slot):
    from rayoptics_web_utils.optimization.targets import read_target_value, write_target_value

    opm = _FakeModel()
    entry = {"kind": kind, "surface_index": 1, "decenter_type": "bend"}
    write_target_value(opm, entry, 4.25)

    assert read_target_value(opm, entry) == pytest.approx(4.25)
    assert getattr(opm.seq_model.ifcs[1].decenter, attribute)[slot] == pytest.approx(4.25)
    assert opm.seq_model.ifcs[1].decenter.dtype == "bend"


def test_decenter_target_rejects_conflicting_existing_strategy_and_unconfigured_source_reads_zero():
    from rayoptics_web_utils.optimization.targets import read_target_value

    opm = _FakeModel()
    opm.seq_model.ifcs[1].decenter = SimpleNamespace(dtype="reverse", euler=[1, 2, 3], dec=[4, 5, 0])
    with pytest.raises(ValueError, match="already has decenter type reverse"):
        read_target_value(opm, {"kind": "decenter_alpha", "surface_index": 1, "decenter_type": "bend"})

    del opm.seq_model.ifcs[1].decenter
    assert read_target_value(
        opm,
        {"kind": "decenter_x", "surface_index": 1, "decenter_type": "bend", "materialize": False},
    ) == 0.0


def test_target_read_and_write_report_unknown_and_non_toroid_kinds_exactly():
    from rayoptics_web_utils.optimization.targets import (
        read_target_value,
        write_target_value,
    )

    opm = _FakeModel()
    unknown = {"kind": "unknown", "surface_index": 1}
    with pytest.raises(ValueError, match="^Unknown variable kind: unknown$"):
        read_target_value(opm, unknown)
    with pytest.raises(ValueError, match="^Unknown variable kind: unknown$"):
        write_target_value(opm, unknown, 1.0)

    toric = {
        "kind": "asphere_toric_sweep_radius",
        "surface_index": 1,
        "asphere_kind": "EvenAspherical",
    }
    with pytest.raises(ValueError, match="Toroid sweep radius target requires"):
        read_target_value(opm, toric)
    with pytest.raises(ValueError, match="Toroid sweep radius target requires"):
        write_target_value(opm, toric, 1.0)


@pytest.mark.parametrize(
    ("profile", "expected"),
    [
        (SimpleNamespace(coefs=[]), True),
        (SimpleNamespace(coefs=[0.0, 1.0]), True),
        (SimpleNamespace(), False),
        (SimpleNamespace(coefs=None), True),
    ],
)
def test_supports_polynomials_reports_coefficient_attribute_presence(profile, expected):
    """Polynomial support follows whether a profile exposes a coefficient store."""
    from rayoptics_web_utils.optimization.targets import supports_polynomials

    assert supports_polynomials(profile) is expected


def test_target_snapshots_deduplicate_keys_and_restore_values_before_update():
    from rayoptics_web_utils.optimization.targets import restore_state, snapshot_state

    opm = _FakeModel()
    radius = {"kind": "radius", "surface_index": 1}
    thickness = {"kind": "thickness", "surface_index": 1}
    snapshot = snapshot_state(opm, [radius, thickness], [radius])

    assert set(snapshot) == {("radius", 1), ("thickness", 1)}
    opm.seq_model.ifcs[1].profile.r = 99.0
    opm.seq_model.gaps[1].thi = 99.0

    restore_state(opm, snapshot)

    assert opm.seq_model.ifcs[1].profile.r == pytest.approx(20.0)
    assert opm.seq_model.gaps[1].thi == pytest.approx(5.0)
    assert opm.update_count == 1
