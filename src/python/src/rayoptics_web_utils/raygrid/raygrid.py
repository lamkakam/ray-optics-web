"""RayGrid factory for rayoptics wavefront and PSF analysis."""

from rayoptics.environment import OpticalModel

from rayoptics_web_utils.raygrid.opd_reference import _resolve_opd_image_point


def make_ray_grid(
    opm: OpticalModel,
    fi: int,
    wavelength_nm: float,
    foc: float = 0.0,
    num_rays: int = 64,
    opd_aim_point: str = "chief_ray",
):
    """Create a RayGrid with standard aperture and vignetting settings.

    Args:
        opm: OpticalModel instance.
        fi: field index into osp['fov'].fields.
        wavelength_nm: wavelength in nm (retrieve via opm['optical_spec']['wvls'].wavelengths[i]).
        foc: defocus value in system units (default 0.0).
        num_rays: grid resolution (default 64).
        opd_aim_point: OPD reference convention, "chief_ray" or "centroid".

    Returns:
        RayGrid instance ready for OPD / PSF extraction.
    """
    from rayoptics.raytr.analyses import RayGrid
    if opd_aim_point == "chief_ray":
        image_pt_2d = None
    else:
        image_pt_2d = _resolve_opd_image_point(
            opm,
            fi=fi,
            wavelength_nm=wavelength_nm,
            foc=foc,
            num_rays=num_rays,
            opd_aim_point=opd_aim_point,
        )
    image_point_kwargs = {} if image_pt_2d is None else {"image_pt_2d": image_pt_2d}
    return RayGrid(
        opm,
        f=fi,
        wl=wavelength_nm,
        foc=foc,
        num_rays=num_rays,
        check_apertures=True,
        apply_vignetting=True,
        **image_point_kwargs,
    )
