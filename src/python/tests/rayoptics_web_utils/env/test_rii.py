"""Test the empty RefractiveIndex.INFO database used by headless runtimes."""

import os
from pathlib import Path
import subprocess
import sys
import textwrap

import yaml


_DATABASE_ENV_VAR = "refractiveindexinfodb"

# Fails any attempt by opticalglass to download the RefractiveIndex.INFO
# database, as happens in browser Pyodide where sockets are unavailable.
_BLOCK_DOWNLOADS = textwrap.dedent(
    """
    import urllib.request

    def _blocked_download(*args, **kwargs):
        raise OSError("network download attempted")

    urllib.request.urlretrieve = _blocked_download
    """
)


def _run_python(script: str, home: Path) -> subprocess.CompletedProcess:
    """Run a script in a fresh interpreter with an isolated home directory."""
    environment = {
        key: value
        for key, value in os.environ.items()
        if key != _DATABASE_ENV_VAR
    }
    environment["HOME"] = str(home)
    return subprocess.run(
        [sys.executable, "-c", _BLOCK_DOWNLOADS + textwrap.dedent(script)],
        cwd=Path(__file__).parents[3],
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )


class TestUseEmptyRefractiveindexDatabase:
    """Tests for use_empty_refractiveindex_database()."""

    def test_points_environment_at_an_empty_catalog(self):
        from rayoptics_web_utils.env.rii import use_empty_refractiveindex_database

        database_path = use_empty_refractiveindex_database()

        assert os.environ[_DATABASE_ENV_VAR] == str(database_path)
        catalog = yaml.safe_load(
            (database_path / "catalog-nk.yml").read_text(encoding="utf-8")
        )
        assert catalog == []

    def test_repeated_calls_reuse_the_same_database(self):
        from rayoptics_web_utils.env.rii import use_empty_refractiveindex_database

        assert use_empty_refractiveindex_database() == (
            use_empty_refractiveindex_database()
        )

    def test_opticalglass_reads_no_shelves_from_the_empty_database(self):
        from opticalglass import rindexinfo
        from rayoptics_web_utils.env.rii import use_empty_refractiveindex_database

        use_empty_refractiveindex_database()

        assert rindexinfo.get_rii_libs() == {}

    def test_rejects_activation_after_the_glass_library_was_built(self, tmp_path):
        result = _run_python(
            f"""
            import os
            import pathlib

            stub = pathlib.Path({str(tmp_path / "external")!r})
            stub.mkdir()
            (stub / "catalog-nk.yml").write_text("[]")
            os.environ["{_DATABASE_ENV_VAR}"] = str(stub)

            import opticalglass.glassfactory
            from rayoptics_web_utils.env.rii import use_empty_refractiveindex_database

            try:
                use_empty_refractiveindex_database()
            except RuntimeError as error:
                print("rejected:", error)
            else:
                raise SystemExit("activation after glassfactory import was accepted")
            """,
            tmp_path,
        )

        assert result.returncode == 0, result.stdout + result.stderr
        assert "rejected:" in result.stdout


def test_init_builds_the_glass_library_without_downloading(tmp_path):
    """init() must make the opticalglass import work without network access."""
    result = _run_python(
        """
        from rayoptics_web_utils import init

        init()

        import opticalglass.glassfactory as glassfactory

        rii_libraries = [
            name for name in glassfactory.og_glass_libs if name.startswith("rii-")
        ]
        print("rii libraries:", rii_libraries)
        """,
        tmp_path,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert "rii libraries: []" in result.stdout
    assert not (tmp_path / ".refractiveindex.info-database").exists()
