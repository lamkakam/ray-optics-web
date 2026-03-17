"""Initialization: Qt stubbing, rayoptics environment setup, CaF2 material creation."""

import sys
import types


def init():
    """Initialize the rayoptics environment for use in Pyodide.

    Must be called before importing any other modules from this package
    (analysis, plotting) since they import rayoptics at module level.

    Returns a dict with commonly needed objects (e.g. 'caf2').
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

    # 5. Load CaF2 YAML from package data and create material
    import importlib.resources
    import yaml
    from opticalglass.rindexinfo import create_material

    data_path = importlib.resources.files('rayoptics_web_utils') / 'data' / 'CaF2_Malitson.yml'
    with importlib.resources.as_file(data_path) as f:
        caf2_yaml = yaml.safe_load(f.read_text())

    caf2 = create_material(caf2_yaml, 'CaF2', 'rii-main', 'data-nk')

    return {'caf2': caf2}
