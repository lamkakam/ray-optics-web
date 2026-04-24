"""RayGrid factory for rayoptics wavefront and PSF analysis."""

from rayoptics.environment import OpticalModel

# test
def make_ray_grid(
    opm: OpticalModel,
    fi: int,
    wavelength_nm: float,
    foc: float = 0.0,
    num_rays: int = 64,
):
    """Create a RayGrid with standard aperture and vignetting settings.

    Args:
        opm: OpticalModel instance.
        fi: field index into osp['fov'].fields.
        wavelength_nm: wavelength in nm (retrieve via opm['optical_spec']['wvls'].wavelengths[i]).
        foc: defocus value in system units (default 0.0).
        num_rays: grid resolution (default 64).

    Returns:
        RayGrid instance ready for OPD / PSF extraction.
    """
    from rayoptics.raytr.analyses import RayGrid
    return RayGrid(
        opm,
        f=fi,
        wl=wavelength_nm,
        foc=foc,
        num_rays=num_rays,
        check_apertures=True,
        apply_vignetting=True,
    )
