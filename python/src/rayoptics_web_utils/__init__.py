"""rayoptics-web-utils: Python utilities for rayoptics in Pyodide."""

from rayoptics_web_utils.setup import init  # safe — no rayoptics imports at top level

# Lazy imports for modules that depend on rayoptics (must be imported after init())
_LAZY_IMPORTS = {
    # analysis
    'get_first_order_data': 'rayoptics_web_utils.analysis',
    'get_3rd_order_seidel_data': 'rayoptics_web_utils.analysis',
    # zernike
    'get_zernike_coefficients': 'rayoptics_web_utils.zernike',
    # plotting
    'plot_lens_layout': 'rayoptics_web_utils.plotting',
    'plot_ray_fan': 'rayoptics_web_utils.plotting',
    'plot_opd_fan': 'rayoptics_web_utils.plotting',
    'plot_spot_diagram': 'rayoptics_web_utils.plotting',
    'plot_surface_by_surface_3rd_order_aberr': 'rayoptics_web_utils.plotting',
    # focusing
    'focus_by_mono_rms_spot': 'rayoptics_web_utils.focusing',
    'focus_by_mono_strehl':    'rayoptics_web_utils.focusing',
    'focus_by_poly_rms_spot':  'rayoptics_web_utils.focusing',
    'focus_by_poly_strehl':    'rayoptics_web_utils.focusing',
}


def __getattr__(name):
    """Lazy import: analysis/plotting modules import rayoptics at module level,
    so they can only be imported AFTER init() has stubbed Qt modules."""
    if name in _LAZY_IMPORTS:
        import importlib
        module = importlib.import_module(_LAZY_IMPORTS[name])
        return getattr(module, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
