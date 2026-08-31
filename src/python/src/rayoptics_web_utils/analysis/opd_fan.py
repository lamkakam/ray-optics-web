"""Extract single- and all-wavelength optical-path-difference fan data."""

import rayoptics.optical.model_constants as mc
from rayoptics.environment import OpticalModel
from rayoptics.raytr.waveabr import wave_abr_full_calc

from rayoptics_web_utils._finite_opd import first_order_data_for_wavelength
from rayoptics_web_utils.analysis._fan import _trace_fan_series
from rayoptics_web_utils.analysis._afocal import afocal_opd, exit_pupil_plane, is_afocal_image_space, reference_direction
from rayoptics_web_utils.raygrid import make_ray_grid
from rayoptics_web_utils.utils import _json_float_list


def get_opd_fan_data_for_wavelength(
    opm: OpticalModel,
    fi: int,
    wvl_idx: int,
    image_point: str = "chief_ray",
) -> dict:
    """Return OPD fan data for one field and configured wavelength.

    The result has the same schema and semantics as one entry returned by
    `get_opd_fan_data`, including `fieldIdx`, `wvlIdx`, sagittal and tangential
    21-point fans, blocked-sample gaps, and wave units.

    Finite image space uses
    `wave_abr_full_calc(...) / opm.nm_to_sys_units(wvl)` with a copy of the
    model's first-order data whose object- and image-space indices come from
    the boundary media at the traced wavelength. The cached reference-
    wavelength first-order data is not changed.
    Infinite image space uses the shared exit-pupil plane-wave OPD, excludes the
    artificial final gap, makes chief-ray OPD zero, and converts to the traced
    wavelength's waves. `image_point="chief_ray"` preserves the historical
    reference, while `"centroid"` uses the shared centroid image point. The
    selected wavelength's best-fit afocal reference is shared by both fan axes.
    The all-wavelength API instead establishes centroid reference geometry at
    the configured primary wavelength and shares it across wavelengths.

    Args:
        opm: RayOptics optical model.
        fi: Field index.
        wvl_idx: Configured wavelength index.
        image_point: Image-point reference convention.

    Returns:
        OPD fan data for one field and wavelength.
    """

    return _get_opd_fan_data_for_wavelength(
        opm, fi, wvl_idx, image_point, reference_wvl_idx=wvl_idx
    )


def _get_opd_fan_data_for_wavelength(
    opm,
    fi: int,
    wvl_idx: int,
    image_point: str,
    reference_wvl_idx: int,
) -> dict:
    """Trace one OPD fan using explicit monochromatic/reference geometry policy."""
    afocal = is_afocal_image_space(opm)
    references = {}
    finite_first_order_data = {}
    finite_reference_point = None
    centroid_piston = 0.0
    if image_point == "centroid":
        reference_wavelength = opm.optical_spec.spectral_region.wavelengths[
            reference_wvl_idx
        ]
        fitted_grid = make_ray_grid(
            opm,
            fi=fi,
            wavelength_nm=reference_wavelength,
            num_rays=21,
            image_point="centroid",
        )
        if afocal:
            references["shared"] = (
                fitted_grid.reference_direction,
                fitted_grid.chief_ray_pkg,
                fitted_grid.exit_pupil_point,
            )
        else:
            finite_reference_point = fitted_grid.image_point
            centroid_piston = fitted_grid.piston

    def _opd_abr(p, xy, ray_pkg, fld, wvl, foc):
        if ray_pkg[mc.ray] is not None:
            if afocal:
                if "shared" in references:
                    reference, _, plane_point = references["shared"]
                    _, chief_pkg = reference_direction(
                        opm, fi, wvl, image_point="chief_ray"
                    )
                elif wvl not in references:
                    reference, chief_pkg = reference_direction(opm, fi, wvl, image_point=image_point)
                    plane_point, _ = exit_pupil_plane(opm, fld, wvl, chief_pkg=chief_pkg)
                    references[wvl] = (reference, chief_pkg, plane_point)
                else:
                    reference, chief_pkg, plane_point = references[wvl]
                return afocal_opd(opm, ray_pkg, chief_pkg, plane_point, reference, wvl) / opm.nm_to_sys_units(wvl)
            if wvl not in finite_first_order_data:
                finite_first_order_data[wvl] = first_order_data_for_wavelength(
                    opm,
                    wvl,
                )
            fod = finite_first_order_data[wvl]
            opd_val = wave_abr_full_calc(fod, fld, wvl, foc, ray_pkg, fld.chief_ray, fld.ref_sphere)
            if reference_wvl_idx == wvl_idx and image_point == "centroid":
                opd_val -= centroid_piston
            return opd_val / opm.nm_to_sys_units(wvl)
        return None

    sagittal_x, sagittal_y = _trace_fan_series(
        opm,
        fi,
        0,
        _opd_abr,
        image_point=image_point,
        wvl_idx=wvl_idx,
        finite_reference_point=finite_reference_point,
    )
    tangential_x, tangential_y = _trace_fan_series(
        opm,
        fi,
        1,
        _opd_abr,
        image_point=image_point,
        wvl_idx=wvl_idx,
        finite_reference_point=finite_reference_point,
    )

    return {
        "fieldIdx": fi,
        "wvlIdx": wvl_idx,
        "Sagittal": {
            "x": _json_float_list(sagittal_x[0]),
            "y": _json_float_list(sagittal_y[0]),
        },
        "Tangential": {
            "x": _json_float_list(tangential_x[0]),
            "y": _json_float_list(tangential_y[0]),
        },
        "unitX": "",
        "unitY": "waves",
    }


def get_opd_fan_data(opm: OpticalModel, fi: int, image_point: str = "chief_ray") -> list[dict]:
    """Return OPD fan data for all wavelengths at field index ``fi``.

    The public all-wavelength plotting contract is unchanged. Results retain the
    same ordering and schema as `get_ray_fan_data`, with `unitY="waves"`, by
    evaluating each configured wavelength with one shared primary-wavelength
    centroid geometry. Direct single-wavelength calls fit the selected
    wavelength instead.

    Args:
        opm: RayOptics optical model.
        fi: Field index.
        image_point: Image-point reference convention.

    Returns:
        OPD fan data for all configured wavelengths at field index ``fi``.
    """
    if image_point == "chief_ray":
        return [
            get_opd_fan_data_for_wavelength(
                opm, fi, wvl_idx, image_point=image_point
            )
            for wvl_idx in range(
                len(opm.optical_spec.spectral_region.wavelengths)
            )
        ]

    primary_wvl_idx = int(opm.optical_spec.spectral_region.reference_wvl)
    return [
        _get_opd_fan_data_for_wavelength(
            opm,
            fi,
            wvl_idx,
            image_point,
            reference_wvl_idx=primary_wvl_idx,
        )
        for wvl_idx in range(len(opm.optical_spec.spectral_region.wavelengths))
    ]
