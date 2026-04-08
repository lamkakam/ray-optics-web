"""Internal helpers shared across the package."""

from io import BytesIO
import base64
import numpy as np
from rayoptics.environment import OpticalModel
from matplotlib.figure import Figure
import matplotlib.pyplot as plt


def _fig_to_base64(fig: Figure, dpi: int=150) -> str:
    """Convert a matplotlib figure to a base64-encoded PNG string."""
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=dpi, bbox_inches='tight')
    buf.seek(0)
    data = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    plt.close(fig)
    return data


def _get_wvl_lbl(opm: OpticalModel, idx: int) -> str:
    """Get wavelength label string for a given index."""
    return f"{opm['optical_spec']['wvls'].wavelengths[idx]}nm"


def _system_units(opm: OpticalModel) -> str:
    """Return the configured system dimension label."""
    return opm.system_spec.dimensions


def _json_float(value) -> float | None:
    """Convert numeric-like values to JSON-safe floats, mapping NaN to None."""
    value = float(value)
    if np.isnan(value):
        return None
    return value


def _json_float_list(values) -> list[float]:
    """Convert an iterable of numeric-like values to plain Python floats."""
    return [float(value) for value in values]


def _json_float_grid(values) -> list[list[float | None]]:
    """Convert a 2-D numeric grid to nested JSON-safe floats."""
    return [[_json_float(value) for value in row] for row in values]
