"""Construct RayGrid-compatible wavefront samples."""

from rayoptics.environment import OpticalModel

from rayoptics_web_utils.raygrid.opd_reference import _resolve_image_point


def make_ray_grid(
    opm: OpticalModel,
    fi: int,
    wavelength_nm: float,
    foc: float = 0.0,
    num_rays: int = 64,
    image_point: str = "chief_ray",
):
    """Create wavefront samples with standard aperture and vignetting semantics.

    ``wavelength_nm`` is a plain float in nm. Finite image space lazily imports and
    constructs ``RayGrid`` with both ``check_apertures`` and ``apply_vignetting`` set.
    Chief-ray mode leaves ``image_pt_2d`` unset; centroid mode supplies the shared
    resolved point. Infinite image space returns a RayGrid-compatible namespace whose
    OPD plane is normal to the selected output direction. In either mode OPD remains
    in central-wavelength waves for downstream scaling."""
    from rayoptics_web_utils.analysis._afocal import is_afocal_image_space, make_afocal_ray_grid
    if is_afocal_image_space(opm):
        return make_afocal_ray_grid(
            opm, fi, wavelength_nm, num_rays=num_rays, image_point=image_point,
        )

    from rayoptics.raytr.analyses import RayGrid
    if image_point == "chief_ray":
        image_pt_2d = None
    else:
        image_pt_2d = _resolve_image_point(
            opm,
            fi=fi,
            wavelength_nm=wavelength_nm,
            foc=foc,
            num_rays=num_rays,
            image_point=image_point,
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
