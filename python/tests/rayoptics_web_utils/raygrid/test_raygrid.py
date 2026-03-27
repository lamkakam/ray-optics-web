"""Tests for rayoptics_web_utils.raygrid module."""

import pytest


class TestMakeRayGrid:
    """Tests for make_ray_grid()."""

    def test_returns_ray_grid_instance(self, cooke_triplet):
        """make_ray_grid should return a RayGrid instance."""
        from rayoptics.raytr.analyses import RayGrid
        from rayoptics_web_utils.raygrid import make_ray_grid

        osp = cooke_triplet['optical_spec']
        wavelength_nm = osp['wvls'].wavelengths[1]
        rg = make_ray_grid(cooke_triplet, fi=0, wavelength_nm=wavelength_nm)
        assert isinstance(rg, RayGrid)

    def test_grid_shape(self, cooke_triplet):
        """make_ray_grid().grid should have shape (3, n, n)."""
        from rayoptics_web_utils.raygrid import make_ray_grid

        osp = cooke_triplet['optical_spec']
        wavelength_nm = osp['wvls'].wavelengths[1]
        n = 16
        rg = make_ray_grid(cooke_triplet, fi=0, wavelength_nm=wavelength_nm, num_rays=n)
        assert rg.grid.shape == (3, n, n)

    def test_uses_correct_wavelength(self, cooke_triplet):
        """make_ray_grid should use the provided wavelength_nm."""
        from rayoptics_web_utils.raygrid import make_ray_grid

        osp = cooke_triplet['optical_spec']
        wavelength_nm = osp['wvls'].wavelengths[0]
        rg = make_ray_grid(cooke_triplet, fi=0, wavelength_nm=wavelength_nm)
        assert rg.wvl == wavelength_nm

    def test_default_num_rays(self, cooke_triplet):
        """make_ray_grid default num_rays should be 64."""
        from rayoptics_web_utils.raygrid import make_ray_grid
        import inspect

        sig = inspect.signature(make_ray_grid)
        assert sig.parameters['num_rays'].default == 64

    def test_default_foc(self, cooke_triplet):
        """make_ray_grid default foc should be 0.0."""
        from rayoptics_web_utils.raygrid import make_ray_grid
        import inspect

        sig = inspect.signature(make_ray_grid)
        assert sig.parameters['foc'].default == 0.0
