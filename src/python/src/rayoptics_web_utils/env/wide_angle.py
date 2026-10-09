"""Recover wide-angle chief-ray aiming when RayOptics' pupil search gives up.

RayOptics 0.9.9 replaced the wide-angle entrance-pupil search. Starting from the
paraxial entrance pupil, it steps the pupil position once in each direction and
stops after two traces that miss the first surface, without sampling the far side.
When the real pupil lies well away from the paraxial one, for example an afocal
pair whose stop is the second lens at 20-40 degrees, aiming then fails although a
stop-centered chief ray exists and RayOptics 0.9.8 found it.

This module only imports narrow RayOptics tracing modules. It never imports
``rayoptics.environment`` or GUI modules.
"""

import numpy as np
import rayoptics.optical.model_constants as mc
from rayoptics.raytr import trace, wideangle

#: Pupil positions sampled when the upstream search fails. Bracketing the
#: stop-center crossing of the 40-degree afocal case needs at least 257.
_SCAN_SAMPLES = 257


def _scan_stop_crossing(opm, stop_idx, fld, wvl, z_center):
    """Return the sign-change bracket of stop heights nearest ``z_center``.

    Traces chief-ray candidates through pupil positions sampled uniformly over
    ``z_center`` plus or minus ``max(|z_center|, 1)``.

    Args:
        opm: RayOptics optical model.
        stop_idx: Aperture-stop interface index.
        fld: Field being aimed.
        wvl: Wavelength in nanometres.
        z_center: Paraxial entrance-pupil distance from the first interface.

    Returns:
        ``(z_a, z_b, height_a, height_b)`` for adjacent traced samples whose stop
        heights change sign, or ``None`` when no traced pair brackets the center.
    """
    fod = opm["analysis_results"]["parax_data"].fod
    _, direction = opm["optical_spec"].obj_coords(fld)
    args = (opm["seq_model"], stop_idx, direction, fod.obj_dist, wvl)
    span = max(abs(z_center), 1.0)

    samples = []
    for z_enp in np.linspace(z_center - span, z_center + span, _SCAN_SAMPLES):
        stop_point, ray_result = wideangle.enp_z_coordinate(z_enp, *args)
        height = stop_point[mc.y] if ray_result.err is None else None
        samples.append((float(z_enp), height))

    best = None
    for (z_a, height_a), (z_b, height_b) in zip(samples, samples[1:]):
        if height_a is None or height_b is None or height_a * height_b > 0:
            continue
        distance = min(abs(z_a - z_center), abs(z_b - z_center))
        if best is None or distance < best[0]:
            best = (distance, (z_a, z_b, height_a, height_b))
    return None if best is None else best[1]


def find_real_enp_with_fallback(opm, stop_idx, fld, wvl, *args, **kwargs):
    """Locate the wide-angle entrance pupil, scanning when upstream gives up.

    Returns RayOptics' ``wideangle.find_real_enp`` result whenever it finds a
    pupil. Otherwise scans pupil positions around the paraxial entrance pupil,
    takes the stop-center crossing nearest it, and refines that bracket with
    RayOptics' ``find_z_enp_on_interval``.

    Args:
        opm: RayOptics optical model.
        stop_idx: Aperture-stop interface index, or ``None`` for interface 1.
        fld: Field being aimed.
        wvl: Wavelength in nanometres.
        *args: Extra positional arguments forwarded to RayOptics.
        **kwargs: Extra keyword arguments forwarded to RayOptics.

    Returns:
        ``(z_enp, ray_result)`` as returned by RayOptics. ``z_enp`` stays ``None``
        with RayOptics' ray result when no scanned pair brackets the stop center
        or the refinement fails.
    """
    z_enp, ray_result = wideangle.find_real_enp(
        opm, stop_idx, fld, wvl, *args, **kwargs
    )
    if z_enp is not None:
        return z_enp, ray_result

    stop_idx = 1 if stop_idx is None else stop_idx
    z_center = opm["analysis_results"]["parax_data"].fod.enp_dist
    bracket = _scan_stop_crossing(opm, stop_idx, fld, wvl, z_center)
    if bracket is None:
        return z_enp, ray_result

    z_a, z_b, height_a, height_b = bracket
    if height_a == height_b:
        z_estimate = z_a
    else:
        z_estimate = z_a - (z_b - z_a) / (height_b - height_a) * height_a
    try:
        start_coords, refined_result, _ = wideangle.find_z_enp_on_interval(
            opm, stop_idx, z_a, z_b, z_estimate, fld, wvl
        )
    except (IndexError, ValueError):
        return z_enp, ray_result
    return start_coords[2], refined_result


def install_wide_angle_pupil_fallback() -> None:
    """Route RayOptics chief-ray aiming through the fallback search.

    Rebinds the ``find_real_enp`` name that ``rayoptics.raytr.trace`` uses for
    ``aim_chief_ray``, which serves every wide-angle aiming path. Repeated calls
    leave the binding unchanged.

    Args:
        None.

    Returns:
        None.
    """
    trace.find_real_enp = find_real_enp_with_fallback
