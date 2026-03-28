"""Internal helpers shared across the package."""

from io import BytesIO
import base64
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
