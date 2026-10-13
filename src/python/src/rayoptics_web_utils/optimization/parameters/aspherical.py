"""Accessor for asphere conic constants, toric sweep radii, and polynomial coefficients.

Every reference names its ``asphere_kind``; reading or writing a spherical
surface first installs that profile (zero conic constant, no coefficients, and
for toroids a sweep radius equal to the base radius). The toric sweep parameter
is the sweep radius (RayOptics ``rR``), never the sweep curvature ``cR``.
``rayoptics.elem.profiles`` is a narrow, GUI-free module and safe to import here.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, TypeGuard, cast

from rayoptics.elem.profiles import EvenPolynomial, RadialPolynomial, SurfaceProfile, XToroid, YToroid

from ._accessor import ParameterAccessor, edge_sag_unit, surface_profile, validate_surface_index

if TYPE_CHECKING:
    from rayoptics.optical.opticalmodel import OpticalModel

    from .._types import AsphereKind, ConstructionalParameterKind, MutableParameter

ASPHERE_PARAMETER_KINDS: frozenset[ConstructionalParameterKind] = frozenset(
    {"asphere_conic_constant", "asphere_polynomial_coefficient", "asphere_toric_sweep_radius"}
)

type AsphereProfile = EvenPolynomial | RadialPolynomial | YToroid
"""Profiles installed by ``ensure_asphere_profile``; ``XToroid`` subclasses ``YToroid``."""


def asphere_kinds() -> dict[AsphereKind, type[SurfaceProfile]]:
    """Maps each asphere kind to the RayOptics profile class that represents it."""
    return {
        "Conic": EvenPolynomial,
        "EvenAspherical": EvenPolynomial,
        "RadialPolynomial": RadialPolynomial,
        "XToroid": XToroid,
        "YToroid": YToroid,
    }


def supports_polynomials(profile: SurfaceProfile) -> bool:
    """Returns whether a profile carries polynomial coefficients."""
    return hasattr(profile, "coefs")


def is_toroid(profile: SurfaceProfile) -> TypeGuard[YToroid]:
    """Returns whether a profile is an X or Y toroid."""
    return hasattr(profile, "cR")


def ensure_asphere_profile(opm: OpticalModel, entry: MutableParameter) -> None:
    """Installs the referenced asphere profile on a spherical surface.

    Raises:
        ValueError: For an unknown asphere kind, or when the surface is already
            aspheric with a different profile type.
    """
    asphere_kind = entry.get("asphere_kind")
    if entry["kind"] not in ASPHERE_PARAMETER_KINDS:
        return
    if asphere_kind not in asphere_kinds():
        raise ValueError(f"Unknown asphere kind: {asphere_kind}")

    sm = opm["seq_model"]
    validate_surface_index(sm.ifcs, entry["surface_index"], "surface_index")
    ifc = sm.ifcs[entry["surface_index"]]
    profile = ifc.profile

    profile_class = asphere_kinds()[asphere_kind]
    if isinstance(profile, profile_class):
        return

    if isinstance(profile, (EvenPolynomial, RadialPolynomial, XToroid, YToroid)):
        raise ValueError(f"Surface {entry['surface_index']} is already aspheric with a different type")

    radius = float(profile.r)
    if asphere_kind == "Conic":
        ifc.profile = EvenPolynomial(r=radius, cc=0.0)
    elif asphere_kind == "EvenAspherical":
        ifc.profile = EvenPolynomial(r=radius, cc=0.0, coefs=[])
    elif asphere_kind == "RadialPolynomial":
        ifc.profile = RadialPolynomial(r=radius, cc=0.0, coefs=[])
    elif asphere_kind == "XToroid":
        # ``rR`` is the toric sweep radius; RayOptics' ``cR`` keyword is its curvature.
        ifc.profile = XToroid(r=radius, cc=0.0, rR=radius, coefs=[])
    else:
        ifc.profile = YToroid(r=radius, cc=0.0, rR=radius, coefs=[])


def _installed_profile(opm: OpticalModel, entry: MutableParameter) -> AsphereProfile:
    ensure_asphere_profile(opm, entry)
    # ensure_asphere_profile has installed one of the asphere profile classes.
    return cast("AsphereProfile", surface_profile(opm, entry["surface_index"]))


def _read(opm: OpticalModel, entry: MutableParameter) -> float:
    profile = _installed_profile(opm, entry)
    if entry["kind"] == "asphere_conic_constant":
        return float(profile.cc)
    if entry["kind"] == "asphere_polynomial_coefficient":
        coefficients = list(getattr(profile, "coefs", []))
        coefficient_index = entry["coefficient_index"]
        return float(coefficients[coefficient_index] if coefficient_index < len(coefficients) else 0.0)
    if not is_toroid(profile):
        raise ValueError("Toroid sweep radius target requires an XToroid or YToroid surface")
    return float(profile.rR)


def _write(opm: OpticalModel, entry: MutableParameter, value: float) -> None:
    profile = _installed_profile(opm, entry)
    if entry["kind"] == "asphere_conic_constant":
        profile.cc = float(value)
        return
    if entry["kind"] == "asphere_polynomial_coefficient":
        coefficient_index = entry["coefficient_index"]
        coefficients = list(getattr(profile, "coefs", []))
        while len(coefficients) <= coefficient_index:
            coefficients.append(0.0)
        coefficients[coefficient_index] = float(value)
        profile.coefs = coefficients
        return
    if not is_toroid(profile):
        raise ValueError("Toroid sweep radius target requires an XToroid or YToroid surface")
    profile.rR = float(value)


def polynomial_term_power(asphere_kind: AsphereKind, coefficient_index: int) -> int:
    """Returns the radial power multiplied by ``coefs[coefficient_index]``.

    ``RadialPolynomial`` coefficients start at ``r``; even-polynomial and toroid
    coefficients start at the quadratic ``r**2`` and step by even powers.
    """
    if asphere_kind == "RadialPolynomial":
        return coefficient_index + 1
    return 2 * coefficient_index + 2


def _natural_unit(opm: OpticalModel, entry: MutableParameter) -> float:
    """Polynomial coefficients use ``h**-power`` (one unit of edge sag); conic and sweep radius use ``1.0``.

    Reads only the reference and the surface aperture, so it never installs a profile.
    """
    if entry["kind"] != "asphere_polynomial_coefficient":
        return 1.0
    power = polynomial_term_power(entry["asphere_kind"], entry["coefficient_index"])
    return edge_sag_unit(opm, entry["surface_index"], power)


ASPHERICAL_ACCESSOR = ParameterAccessor(
    kinds=ASPHERE_PARAMETER_KINDS, read=_read, write=_write, natural_unit=_natural_unit
)
"""Reads and writes asphere terms, installing the referenced profile when absent."""
