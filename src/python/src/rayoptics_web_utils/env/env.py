"""Prepare the headless Pyodide environment for RayOptics."""

import sys
import types
from opticalglass.opticalmedium import OpticalMedium


def init() -> dict[str, OpticalMedium]:
    """Initialize RayOptics for use in Pyodide and return shared materials.

    Call this before importing analysis or plotting modules. It stubs unavailable
    GUI and networking packages, selects matplotlib's headless `Agg` backend, and
    loads the bundled CaF2, fused-silica, water, and D263TECO media plus one
    stateful user-defined-material registry.

    Repeated calls overwrite the stubs harmlessly. Calling it after dependent
    modules are cached cannot retroactively affect their imports. Bundled YAML is
    loaded through package resources so zip-installed wheels are supported.

    Args:
        None.

    Returns:
        Shared bundled and user-defined optical materials.
    """
    for m in [
        'PySide6', 'PySide6.QtWidgets', 'PySide6.QtCore',
        'PySide6.QtGui', 'psutil', 'zmq', 'pyzmq',
        'tornado', 'tornado.ioloop',
    ]:
        sys.modules[m] = types.ModuleType(m)

    fake_qtgui = types.ModuleType('rayoptics.qtgui')
    fake_guiappcmds = types.ModuleType('rayoptics.qtgui.guiappcmds')
    sys.modules['rayoptics.qtgui'] = fake_qtgui
    sys.modules['rayoptics.qtgui.guiappcmds'] = fake_guiappcmds
    fake_qtgui.guiappcmds = fake_guiappcmds

    # We don't do `from rayoptics.environment import *` here because that would
    # only affect this module's namespace. The worker will do its own import.

    import matplotlib
    matplotlib.use('Agg')

    from rayoptics_web_utils.glass.custom_materials import load_custom_material

    caf2 = load_custom_material('CaF2_Malitson.yml', 'CaF2')
    fused_silica = load_custom_material('FusedSilica_Malitson.yml', 'Fused Silica')
    water = load_custom_material('Water_Daimon-20.0C.yml', 'Water')
    d263teco = load_custom_material('D263TECO.yml', 'D263TECO')

    from rayoptics_web_utils.glass.user_defined_materials import UserDefinedMaterial
    user_defined_materials = UserDefinedMaterial()

    return {
        'caf2': caf2,
        'fused_silica': fused_silica,
        'water': water,
        'd263teco': d263teco,
        'user_defined': user_defined_materials,
    }
