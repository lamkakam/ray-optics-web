"""Tests for rayoptics_web_utils.env module."""

import sys


class TestInit:
    """Tests for the init() function."""

    def test_init_stubs_pyside6_modules(self):
        """init() should stub PySide6 and related modules in sys.modules."""
        from rayoptics_web_utils.env import init
        init()
        stubbed = [
            'PySide6', 'PySide6.QtWidgets', 'PySide6.QtCore',
            'PySide6.QtGui', 'psutil', 'zmq', 'pyzmq',
            'tornado', 'tornado.ioloop',
        ]
        for mod_name in stubbed:
            assert mod_name in sys.modules, f"{mod_name} should be stubbed"

    def test_init_stubs_rayoptics_qtgui(self):
        """init() should stub rayoptics.qtgui and rayoptics.qtgui.guiappcmds."""
        from rayoptics_web_utils.env import init
        init()
        assert 'rayoptics.qtgui' in sys.modules
        assert 'rayoptics.qtgui.guiappcmds' in sys.modules
        qtgui = sys.modules['rayoptics.qtgui']
        assert hasattr(qtgui, 'guiappcmds')

    def test_init_returns_dict_with_custom_materials(self):
        """init() should return a dict containing both custom material keys."""
        from rayoptics_web_utils.env import init
        result = init()
        assert isinstance(result, dict)
        assert 'caf2' in result
        assert result['caf2'] is not None
        assert 'fused_silica' in result
        assert result['fused_silica'] is not None

    def test_init_sets_matplotlib_backend(self):
        """init() should set the matplotlib backend to Agg."""
        from rayoptics_web_utils.env import init
        init()
        import matplotlib
        assert matplotlib.get_backend() == 'Agg'
