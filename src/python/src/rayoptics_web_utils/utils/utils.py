"""# `python/src/rayoptics_web_utils/utils/utils.py`

## Purpose

Internal helpers shared across the package. Not part of the public API.

## Exports (Internal)

```python
def _fig_to_base64(fig: Figure, dpi: int = 150) -> str: ...
def _get_wvl_lbl(opm: OpticalModel, idx: int) -> str: ...
def _system_units(opm: OpticalModel) -> str: ...
def _json_float(value) -> float | None: ...
def _json_float_list(values) -> list[float | None]: ...
def _json_float_grid(values) -> list[list[float | None]]: ...
```

## Function Details

## Key Conventions

- Module was renamed from `_utils.py` to `utils/utils.py`; the leading underscores on exported symbols remain to signal they are not part of the public API.
- `_fig_to_base64` always calls `plt.close(fig)` before returning to prevent matplotlib figure accumulation in long-running Pyodide sessions.
- `dpi=150` is the default resolution; callers may override for higher or lower quality output.
- JSON-serialization helpers in this module are internal utilities used by analysis functions to return plain Python data structures.

## Usages

Internal helpers shared across the package."""

from io import BytesIO
import base64
import numpy as np
from rayoptics.environment import OpticalModel
from matplotlib.figure import Figure
import matplotlib.pyplot as plt


def _fig_to_base64(fig: Figure, dpi: int=150) -> str:
    """Convert a matplotlib figure to a base64-encoded PNG string.

    ### `_fig_to_base64(fig, dpi=150)`

    Serialises a matplotlib `Figure` to a base64-encoded PNG string. This function must be idempotent.

    1. Writes the figure to an in-memory `BytesIO` buffer via `fig.savefig(format='png', bbox_inches='tight')`.
    2. Base64-encodes the buffer contents and decodes to a UTF-8 string.
    3. Closes the buffer.
    4. Calls `plt.close(fig)` to release matplotlib memory.
    5. Returns the base64 string.

    ### `_fig_to_base64`

    Internal helper used by all plotting functions to convert matplotlib figures to base64-encoded PNG strings:

    ```python
    from rayoptics_web_utils.utils import _fig_to_base64
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots()
    ax.plot([1, 2, 3], [1, 2, 3])
    png_base64 = _fig_to_base64(fig, dpi=150)
    # Returns: "iVBORw0KGgoAAAANS..." (base64-encoded PNG string)
    # fig is automatically closed after encoding
    ```"""
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=dpi, bbox_inches='tight')
    buf.seek(0)
    data = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    plt.close(fig)
    return data


def _get_wvl_lbl(opm: OpticalModel, idx: int) -> str:
    """Get wavelength label string for a given index.

    ### `_get_wvl_lbl(opm, idx)`

    Returns a human-readable wavelength label for matplotlib legend annotations.

    - Reads `opm['optical_spec']['wvls'].wavelengths[idx]` and formats it as `"<value>nm"`.

    ### `_get_wvl_lbl`

    Internal helper used by plotting functions to format wavelength labels for matplotlib legend annotations:

    ```python
    from rayoptics_web_utils.utils import _get_wvl_lbl

    wvl_label = _get_wvl_lbl(opm, 0)
    # Returns: "550nm" or similar, suitable for legend text
    ```

    **Note:** Both functions are internal (prefixed with `_`) and not part of the public API. They are imported and used within the `plotting` module for rendering matplotlib figures to PNG strings suitable for transmission to the frontend.

    The JSON helpers are imported by `analysis/analysis.py` to normalize numpy-backed RayOptics outputs into JSON-encodable Python types."""
    return f"{opm['optical_spec']['wvls'].wavelengths[idx]}nm"


def _system_units(opm: OpticalModel) -> str:
    """Return the configured system dimension label.

    ### `_system_units(opm)`

    Returns the configured system dimension string from `opm.system_spec.dimensions`."""
    return opm.system_spec.dimensions


def _json_float(value) -> float | None:
    """Convert numeric-like values to JSON-safe floats, mapping NaN to None.

    ### `_json_float(value)`

    Converts a numeric-like value to a plain Python float, mapping `NaN` to `None` so the result remains JSON-encodable."""
    value = float(value)
    if np.isnan(value):
        return None
    return value


def _json_float_list(values) -> list[float | None]:
    """Convert an iterable of numeric-like values to JSON-safe floats.

    ### `_json_float_list(values)`

    Converts an iterable of numeric-like values to `list[float | None]`, preserving `None` and mapping `NaN` to `None` so fan gaps and invalid grid cells remain JSON-encodable."""
    return [None if value is None else _json_float(value) for value in values]


def _json_float_grid(values) -> list[list[float | None]]:
    """Convert a 2-D numeric grid to nested JSON-safe floats.

    ### `_json_float_grid(values)`

    Converts a 2-D numeric grid to nested Python lists, mapping `NaN` cells to `None`."""
    return [[_json_float(value) for value in row] for row in values]
