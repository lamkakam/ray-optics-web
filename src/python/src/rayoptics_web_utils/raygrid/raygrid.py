"""Construct chief-ray and best-fit-centroid wavefront samples.

Centroid OPD conventions are documented in
``docs/image-reference-conventions.md``.
"""

from __future__ import annotations

import numpy as np
import rayoptics.optical.model_constants as mc
from scipy.optimize import least_squares

from rayoptics.environment import OpticalModel
from rayoptics.raytr import trace, waveabr
from rayoptics.raytr.analyses import RayGrid

from rayoptics_web_utils._finite_opd import model_view_for_wavelength_opd
from rayoptics_web_utils.raygrid.opd_reference import (
    _resolve_image_point,
    sample_valid_rays,
)


def _reference_sphere(opm, chief_ray_pkg, image_point: np.ndarray):
    """Build a RayOptics reference sphere around a complete local image point."""
    _, chief_exit_pupil_segment = chief_ray_pkg
    image_point = np.asarray(image_point, dtype=float)
    point_after_image_gap = image_point.copy()
    point_after_image_gap[2] += float(opm.seq_model.gaps[-1].thi)
    sphere_vector = point_after_image_gap - np.asarray(
        chief_exit_pupil_segment[mc.p], dtype=float
    )
    radius = float(np.linalg.norm(sphere_vector))
    if not np.isfinite(radius) or radius <= np.finfo(float).eps:
        raise ValueError("Centroid reference sphere has an invalid radius.")
    return (
        image_point,
        sphere_vector / radius,
        radius,
        opm.seq_model.lcl_tfrms[-2],
    )


def _linear_opd_coefficients(raw_grid, opd_values) -> np.ndarray:
    """Fit piston and normalized-pupil phase tilts to valid OPD samples."""
    coordinates = []
    values = []
    for row, opd_row in zip(raw_grid, opd_values, strict=True):
        for (pupil_x, pupil_y, ray_pkg), opd in zip(row, opd_row, strict=True):
            if ray_pkg is not None and np.isfinite(opd):
                coordinates.append([1.0, float(pupil_x), float(pupil_y)])
                values.append(float(opd))
    if len(values) < 3:
        raise ValueError(
            "Centroid wavefront reference requires at least three valid rays."
        )
    design = np.asarray(coordinates, dtype=float)
    if np.linalg.matrix_rank(design) < 3:
        raise ValueError(
            "Centroid wavefront reference requires non-collinear valid rays."
        )
    return np.linalg.lstsq(design, np.asarray(values, dtype=float), rcond=None)[0]


class CentroidRayGrid(RayGrid):
    """RayGrid using a shifted/tilted best-fit finite reference sphere.

    Uniform valid pupil cells define the fit. The sphere starts at the
    geometric centroid, shifts transversely until both fitted OPD phase slopes
    vanish, then removes weighted mean OPD as piston. Rebuilds repeat the same
    operation and retain the public ``RayGrid`` attributes and grid schema.
    """

    def __init__(self, opt_model, f, wl, foc, num_rays):
        self.opt_model = opt_model
        self.fld = opt_model.optical_spec.field_of_view.fields[f]
        self.wvl = wl
        self.foc = foc
        self.image_pt_2d = None
        self.image_delta = None
        self.num_rays = num_rays
        self.value_if_none = np.nan
        self.rt_kwargs = {
            "check_apertures": True,
            "apply_vignetting": False,
            "output_filter": None,
            "rayerr_filter": None,
        }
        self.update_data()

    def update_data(self, **kwargs):
        """Rebuild the best-fit reference and its piston-free OPD grid."""
        wavelength_model = model_view_for_wavelength_opd(self.opt_model, self.wvl)
        geometric_point = _resolve_image_point(
            self.opt_model,
            fi=self.opt_model.optical_spec.field_of_view.fields.index(self.fld),
            wavelength_nm=self.wvl,
            foc=self.foc,
            num_rays=self.num_rays,
            image_point="centroid",
        )
        raw_grid = sample_valid_rays(
            self.opt_model, self.fld, self.wvl, self.foc, self.num_rays
        )
        _, chief_ray_pkg = trace.setup_pupil_coords(
            wavelength_model, self.fld, self.wvl, self.foc
        )
        first_order_data = wavelength_model["analysis_results"]["parax_data"].fod
        image_profile = self.opt_model.seq_model.ifcs[-1].profile

        def evaluate(transverse):
            sag = float(image_profile.sag(float(transverse[0]), float(transverse[1])))
            image_point = np.array(
                [float(transverse[0]), float(transverse[1]), sag + self.foc]
            )
            ref_sphere = _reference_sphere(
                wavelength_model, chief_ray_pkg, image_point
            )
            opd_rows = []
            for row in raw_grid:
                opd_row = []
                for _, _, ray_pkg in row:
                    opd_row.append(
                        np.nan
                        if ray_pkg is None
                        else waveabr.wave_abr_full_calc(
                            first_order_data,
                            self.fld,
                            self.wvl,
                            self.foc,
                            ray_pkg,
                            chief_ray_pkg,
                            ref_sphere,
                        )
                    )
                opd_rows.append(opd_row)
            return image_point, ref_sphere, np.asarray(opd_rows, dtype=float)

        def residual(transverse):
            _, _, opd_values = evaluate(transverse)
            return _linear_opd_coefficients(raw_grid, opd_values)[1:]

        solution = least_squares(
            residual,
            geometric_point[:2],
            xtol=1.0e-12,
            ftol=1.0e-12,
            gtol=1.0e-12,
            max_nfev=100,
        )
        if not solution.success:
            raise ValueError(
                "Centroid reference-sphere solve did not converge: "
                f"{solution.message}"
            )
        image_point, ref_sphere, opd_values = evaluate(solution.x)
        coefficients = _linear_opd_coefficients(raw_grid, opd_values)
        slope_tolerance = 1.0e-10 * max(1.0, np.nanmax(np.abs(opd_values)))
        if np.any(np.abs(coefficients[1:]) > slope_tolerance):
            raise ValueError(
                "Centroid reference-sphere solve retained non-zero phase tilt."
            )
        valid = np.isfinite(opd_values)
        self.piston = float(np.mean(opd_values[valid]))
        opd_values[valid] -= self.piston
        central_wavelength = self.opt_model.optical_spec.spectral_region.central_wvl
        opd_values /= self.opt_model.nm_to_sys_units(central_wavelength)

        grid = np.empty((3, self.num_rays, self.num_rays), dtype=float)
        for row_index, row in enumerate(raw_grid):
            for column_index, (pupil_x, pupil_y, _) in enumerate(row):
                grid[0, row_index, column_index] = pupil_x
                grid[1, row_index, column_index] = pupil_y
        grid[2] = opd_values
        self.grid = grid
        self.raw_grid = raw_grid
        self.grid_pkg = (raw_grid, None)
        self.image_point = image_point
        self.ref_sphere = ref_sphere
        self.chief_ray_pkg = chief_ray_pkg
        self.fld.chief_ray = chief_ray_pkg
        self.fld.ref_sphere = ref_sphere
        return self


def make_ray_grid(
    opm: OpticalModel,
    fi: int,
    wavelength_nm: float,
    foc: float = 0.0,
    num_rays: int = 64,
    image_point: str = "chief_ray",
):
    """Create wavefront samples with standard aperture and vignetting semantics.

    ``wavelength_nm`` is a plain float in nm. Finite image space lazily imports
    and subclasses ``RayGrid`` with aperture checks enabled and a second
    vignetting transformation disabled because ``vignetting_bbox`` already
    applies it. During each build/refocus, the subclass delegates
    through a read-only model view containing copied first-order data whose
    object- and image-space indices are evaluated at ``wavelength_nm``; the
    returned object's ``opt_model`` remains the original model. Chief-ray mode
    leaves ``image_pt_2d`` unset. Centroid mode returns ``CentroidRayGrid``,
    fitting a complete shifted reference sphere and removing piston. Infinite
    image space returns a RayGrid-compatible namespace whose centroid OPD plane
    normal is likewise fitted for zero phase tilt. In either mode OPD remains
    in central-wavelength waves for downstream scaling. See
    ``docs/image-reference-conventions.md``.

    Args:
        opm: RayOptics optical model.
        fi: Field index.
        wavelength_nm: Wavelength in nanometres.
        foc: Focus shift in system length units.
        num_rays: Pupil-grid sampling resolution.
        image_point: Image-point reference convention.

    Returns:
        RayGrid-compatible wavefront samples.
    """
    from rayoptics_web_utils.analysis._afocal import (
        is_afocal_image_space,
        make_afocal_ray_grid,
    )

    if is_afocal_image_space(opm):
        return make_afocal_ray_grid(
            opm, fi, wavelength_nm, num_rays=num_rays, image_point=image_point,
        )

    from rayoptics.raytr.analyses import RayGrid as CurrentRayGrid

    class WavelengthRayGrid(CurrentRayGrid):
        """RayGrid whose finite OPD lookup uses copied wavelength indices."""

        def update_data(self, **kwargs):
            """Build or refocus without mutating cached first-order data."""
            original_model = self.opt_model
            self.opt_model = model_view_for_wavelength_opd(
                original_model,
                self.wvl,
            )
            try:
                return super().update_data(**kwargs)
            finally:
                self.opt_model = original_model

    if image_point == "centroid":
        return CentroidRayGrid(opm, fi, wavelength_nm, foc, num_rays)
    image_point_kwargs = {}
    return WavelengthRayGrid(
        opm,
        f=fi,
        wl=wavelength_nm,
        foc=foc,
        num_rays=num_rays,
        check_apertures=True,
        apply_vignetting=False,
        **image_point_kwargs,
    )
