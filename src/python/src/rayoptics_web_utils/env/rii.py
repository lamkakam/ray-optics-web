"""Point opticalglass at an empty RefractiveIndex.INFO database.

Importing ``opticalglass.glassfactory`` (opticalglass 2.x) builds the central
glass library, which loads every shelf of a local RefractiveIndex.INFO database
and downloads the whole database from GitHub when the directory named by the
``refractiveindexinfodb`` environment variable (default
``~/.refractiveindex.info-database``) is missing. Browser Pyodide has no sockets
and the archive host does not allow cross-origin reads, so that download makes the
import fail. The app never uses the database shelves; bundled RefractiveIndex.INFO
materials are loaded from packaged YAML and URL materials via
``create_glass(url, "rindexinfo")``.
"""

import os
from pathlib import Path
import sys
import tempfile

_DATABASE_ENV_VAR = "refractiveindexinfodb"
_GLASS_FACTORY_MODULE = "opticalglass.glassfactory"

_empty_database_path: Path | None = None


def use_empty_refractiveindex_database() -> Path:
    """Point opticalglass at an empty database so it never downloads one.

    Creates a temporary directory holding a ``catalog-nk.yml`` with no shelves and
    sets the ``refractiveindexinfodb`` environment variable to it, overriding any
    existing value so every runtime sees the same glass libraries. Call this before
    the first import of ``opticalglass.glassfactory``. Repeated calls return the
    directory created by the first call.

    Args:
        None.

    Returns:
        The empty database directory.

    Raises:
        RuntimeError: If ``opticalglass.glassfactory`` was already imported without
            this empty database, because its central library has already been built.
    """
    global _empty_database_path

    if (
        _empty_database_path is not None
        and os.environ.get(_DATABASE_ENV_VAR) == str(_empty_database_path)
    ):
        return _empty_database_path

    if _GLASS_FACTORY_MODULE in sys.modules:
        raise RuntimeError(
            "opticalglass.glassfactory was imported before the empty "
            "RefractiveIndex.INFO database was configured"
        )

    if _empty_database_path is None:
        database_path = Path(tempfile.mkdtemp(prefix="rayoptics-web-rii-"))
        (database_path / "catalog-nk.yml").write_text("[]\n", encoding="utf-8")
        _empty_database_path = database_path

    os.environ[_DATABASE_ENV_VAR] = str(_empty_database_path)
    return _empty_database_path
