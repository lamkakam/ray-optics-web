"""Provide internal rendering and JSON-normalization helpers."""

from io import BytesIO
import base64
import numpy as np
from rayoptics.environment import OpticalModel
from matplotlib.figure import Figure
import matplotlib.pyplot as plt


def _fig_to_base64(fig: Figure, dpi: int=150) -> str:
    """Return a base64-encoded PNG and close the matplotlib figure.

    The image is saved through an in-memory buffer at ``dpi`` with a tight bounding
    box. Closing the figure prevents accumulation in long-running Pyodide sessions.

    Args:
        fig: Matplotlib figure to encode.
        dpi: PNG resolution in dots per inch.

    Returns:
        Base64-encoded PNG image.
    """
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=dpi, bbox_inches='tight')
    buf.seek(0)
    data = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    plt.close(fig)
    return data


def _get_wvl_lbl(opm: OpticalModel, idx: int) -> str:
    """Return the indexed model wavelength formatted with an ``nm`` suffix.

    Args:
        opm: RayOptics optical model.
        idx: Wavelength index.

    Returns:
        The indexed model wavelength formatted with an ``nm`` suffix.
    """
    return f"{opm['optical_spec']['wvls'].wavelengths[idx]}nm"


def _system_units(opm: OpticalModel) -> str:
    """Return the configured system dimension label.

    Args:
        opm: RayOptics optical model.

    Returns:
        The configured system dimension label.
    """
    return opm.system_spec.dimensions


def _json_float(value) -> float | None:
    """Return a plain float, mapping ``None`` and NaN to ``None``.

    Args:
        value: Value to convert to a JSON-safe float.

    Returns:
        A plain float, mapping ``None`` and NaN to ``None``.
    """
    value = float(value)
    if np.isnan(value):
        return None
    return value


def _json_float_list(values) -> list[float | None]:
    """Return JSON-safe floats while preserving invalid samples as ``None``.

    Args:
        values: Values to convert to JSON-safe floats.

    Returns:
        JSON-safe floats while preserving invalid samples as ``None``.
    """
    return [None if value is None else _json_float(value) for value in values]


def _json_float_grid(values) -> list[list[float | None]]:
    """Return a 2-D JSON-safe float grid with invalid cells as ``None``.

    Args:
        values: Values to convert to JSON-safe floats.

    Returns:
        A 2-D JSON-safe float grid with invalid cells as ``None``.
    """
    return [[_json_float(value) for value in row] for row in values]
