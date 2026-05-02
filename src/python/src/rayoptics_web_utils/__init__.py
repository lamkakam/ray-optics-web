"""rayoptics-web-utils: Python utilities for rayoptics in Pyodide."""

from rayoptics_web_utils.env import init  # safe — no rayoptics imports at top level

# Eager imports: opticalglass has no rayoptics dependency, safe to import immediately
from rayoptics_web_utils.glass.glass import (  # noqa: E402
    get_glass_catalog_data,
    get_all_glass_catalogs_data,
)

# Lazy imports for modules that depend on rayoptics (must be imported after init())
_LAZY_IMPORTS = {
    # analysis
    'get_first_order_data': 'rayoptics_web_utils.analysis.first_order',
    'get_3rd_order_seidel_data': 'rayoptics_web_utils.analysis.seidel',
    'get_ray_fan_data': 'rayoptics_web_utils.analysis.ray_fan',
    'get_opd_fan_data': 'rayoptics_web_utils.analysis.opd_fan',
    'get_spot_data': 'rayoptics_web_utils.analysis.spot',
    'get_wavefront_data': 'rayoptics_web_utils.analysis.wavefront',
    'get_geo_psf_data': 'rayoptics_web_utils.analysis.geometric_psf',
    'get_diffraction_psf_data': 'rayoptics_web_utils.analysis.diffraction_psf',
    'get_diffraction_mtf_data': 'rayoptics_web_utils.analysis.diffraction_mtf',
    # zernike
    'get_zernike_coefficients': 'rayoptics_web_utils.zernike.zernike',
    # plotting
    'plot_lens_layout': 'rayoptics_web_utils.plotting.plotting',
    # focusing
    'focus_by_mono_rms_spot': 'rayoptics_web_utils.focusing.focusing',
    'focus_by_mono_strehl':    'rayoptics_web_utils.focusing.focusing',
    'focus_by_poly_rms_spot':  'rayoptics_web_utils.focusing.focusing',
    'focus_by_poly_strehl':    'rayoptics_web_utils.focusing.focusing',
    # optimization
    'evaluate_optimization_problem': 'rayoptics_web_utils.optimization.optimization',
    'optimize_opm': 'rayoptics_web_utils.optimization.optimization',
}


def __getattr__(name):
    """Lazy import: analysis/plotting modules import rayoptics at module level,
    so they can only be imported AFTER init() has stubbed Qt modules."""
    if name in _LAZY_IMPORTS:
        import importlib
        module = importlib.import_module(_LAZY_IMPORTS[name])
        return getattr(module, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
