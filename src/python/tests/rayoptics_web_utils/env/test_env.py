"""Test headless environment setup and collection-time import safety."""

from pathlib import Path
import subprocess
import sys
import textwrap
import types


def test_python_suite_collection_rejects_pyside6_imports():
    """The entire test suite must collect without importing any PySide6 module.

    Pytest fixtures run only after collection, so the session initialization
    fixture cannot protect imports performed at test-module scope.
    """
    python_root = Path(__file__).parents[3]
    collection_script = textwrap.dedent(
        """
        import importlib.abc
        import sys

        import pytest


        class RejectPySide6Imports(importlib.abc.MetaPathFinder):
            def find_spec(self, fullname, path=None, target=None):
                if fullname == "PySide6" or fullname.startswith("PySide6."):
                    raise ImportError(f"PySide6 import rejected during collection: {fullname}")
                return None


        sys.meta_path.insert(0, RejectPySide6Imports())
        raise SystemExit(pytest.main(["--collect-only", "-q", "tests"]))
        """
    )

    result = subprocess.run(
        [sys.executable, "-c", collection_script],
        cwd=python_root,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stdout + result.stderr


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

    def test_init_recreates_all_dependency_stubs_as_named_modules(self, monkeypatch):
        from rayoptics_web_utils.env import init

        stubbed = [
            "PySide6",
            "PySide6.QtWidgets",
            "PySide6.QtCore",
            "PySide6.QtGui",
            "psutil",
            "zmq",
            "pyzmq",
            "tornado",
            "tornado.ioloop",
        ]
        for mod_name in stubbed:
            monkeypatch.delitem(sys.modules, mod_name, raising=False)

        init()

        for mod_name in stubbed:
            module = sys.modules[mod_name]
            assert isinstance(module, types.ModuleType)
            assert module.__name__ == mod_name

    def test_init_stubs_rayoptics_qtgui(self):
        """init() should stub rayoptics.qtgui and rayoptics.qtgui.guiappcmds."""
        from rayoptics_web_utils.env import init
        init()
        assert 'rayoptics.qtgui' in sys.modules
        assert 'rayoptics.qtgui.guiappcmds' in sys.modules
        qtgui = sys.modules['rayoptics.qtgui']
        assert hasattr(qtgui, 'guiappcmds')

    def test_init_links_named_qtgui_modules_to_each_other(self, monkeypatch):
        from rayoptics_web_utils.env import init

        monkeypatch.delitem(sys.modules, "rayoptics.qtgui", raising=False)
        monkeypatch.delitem(sys.modules, "rayoptics.qtgui.guiappcmds", raising=False)

        init()

        qtgui = sys.modules["rayoptics.qtgui"]
        guiappcmds = sys.modules["rayoptics.qtgui.guiappcmds"]
        assert isinstance(qtgui, types.ModuleType)
        assert isinstance(guiappcmds, types.ModuleType)
        assert qtgui.__name__ == "rayoptics.qtgui"
        assert guiappcmds.__name__ == "rayoptics.qtgui.guiappcmds"
        assert qtgui.guiappcmds is guiappcmds

    def test_init_returns_dict_with_custom_materials(self):
        """init() should return a dict containing all custom material keys."""
        from rayoptics_web_utils.env import init
        result = init()
        assert isinstance(result, dict)
        assert 'caf2' in result
        assert result['caf2'] is not None
        assert 'fused_silica' in result
        assert result['fused_silica'] is not None
        assert 'water' in result
        assert result['water'] is not None
        assert 'd263teco' in result
        assert result['d263teco'] is not None

    def test_init_forwards_each_catalog_material_and_returns_registry(self, monkeypatch):
        import rayoptics_web_utils.glass.custom_materials as custom_materials
        import rayoptics_web_utils.glass.user_defined_materials as user_materials
        from rayoptics_web_utils.env import init

        material_calls = []

        def fake_load_custom_material(filename, label):
            material = object()
            material_calls.append((filename, label, material))
            return material

        registry = object()

        monkeypatch.setattr(
            custom_materials, "load_custom_material", fake_load_custom_material
        )
        monkeypatch.setattr(user_materials, "UserDefinedMaterial", lambda: registry)

        result = init()

        assert [(filename, label) for filename, label, _ in material_calls] == [
            ("CaF2_Malitson.yml", "CaF2"),
            ("FusedSilica_Malitson.yml", "Fused Silica"),
            ("Water_Daimon-20.0C.yml", "Water"),
            ("D263TECO.yml", "D263TECO"),
        ]
        assert set(result) == {
            "caf2",
            "fused_silica",
            "water",
            "d263teco",
            "user_defined",
        }
        assert [result[key] for key in ("caf2", "fused_silica", "water", "d263teco")] == [
            material for _, _, material in material_calls
        ]
        assert result["user_defined"] is registry

    def test_init_sets_matplotlib_backend(self):
        """init() should set the matplotlib backend to Agg."""
        from rayoptics_web_utils.env import init
        init()
        import matplotlib
        assert matplotlib.get_backend() == 'Agg'
