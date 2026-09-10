"""Verify the numerical contracts of the glass dispersion helpers."""

import pytest

from rayoptics_web_utils.glass.helper import _abbe_number, _partial_dispersion


def test_abbe_number_uses_the_fraunhofer_f_minus_c_denominator():
    assert _abbe_number(1.5, 1.6, 1.4) == pytest.approx(2.5)


def test_abbe_number_returns_zero_for_zero_dispersion():
    assert _abbe_number(1.5, 1.4, 1.4) == 0.0


def test_partial_dispersion_uses_short_minus_long_over_f_minus_c():
    assert _partial_dispersion(1.7, 1.5, 1.6, 1.4) == pytest.approx(1.0)


def test_partial_dispersion_returns_zero_for_zero_dispersion():
    assert _partial_dispersion(1.7, 1.5, 1.4, 1.4) == 0.0
