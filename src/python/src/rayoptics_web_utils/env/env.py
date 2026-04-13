"""Initialization: Qt stubbing, rayoptics environment setup, custom material creation."""

import sys
import types
from opticalglass.opticalmedium import OpticalMedium


def init() -> dict[str, OpticalMedium]:
    """Initialize the rayoptics environment for use in Pyodide.

    Must be called before importing any other modules from this package
    (analysis, plotting) since they import rayoptics at module level.

    Returns a dict with commonly needed custom materials.
    """
    # 1. Stub PySide6 and other unavailable modules
    for m in [
        'PySide6', 'PySide6.QtWidgets', 'PySide6.QtCore',
        'PySide6.QtGui', 'psutil', 'zmq', 'pyzmq',
        'tornado', 'tornado.ioloop',
    ]:
        sys.modules[m] = types.ModuleType(m)

    # 2. Stub rayoptics.qtgui
    fake_qtgui = types.ModuleType('rayoptics.qtgui')
    fake_guiappcmds = types.ModuleType('rayoptics.qtgui.guiappcmds')
    sys.modules['rayoptics.qtgui'] = fake_qtgui
    sys.modules['rayoptics.qtgui.guiappcmds'] = fake_guiappcmds
    fake_qtgui.guiappcmds = fake_guiappcmds

    # 3. Import rayoptics environment (populates global namespace in caller via *)
    # We don't do `from rayoptics.environment import *` here because that would
    # only affect this module's namespace. The worker will do its own import.

    # 4. Set matplotlib backend to Agg
    import matplotlib
    matplotlib.use('Agg')

    # 5. Load custom materials from package data
    from rayoptics_web_utils.glass.custom_materials import load_custom_material

    caf2 = load_custom_material('CaF2_Malitson.yml', 'CaF2')
    fused_silica = load_custom_material('FusedSilica_Malitson.yml', 'Fused Silica')

    return {'caf2': caf2, 'fused_silica': fused_silica}
