"""Expose custom RayOptics apertures and Ronchi-safe vignetting setup."""

from rayoptics_web_utils.aperture.annular import Annular
from rayoptics_web_utils.aperture.offset_circular import OffsetCircular
from rayoptics_web_utils.aperture.offset_rotated_rectangular import OffsetRotatedRectangular
from rayoptics_web_utils.aperture.ronchi_ruling import (
    RonchiRuling,
    set_vig_with_ronchi_envelopes,
)

__all__ = [
    "Annular",
    "OffsetCircular",
    "OffsetRotatedRectangular",
    "RonchiRuling",
    "set_vig_with_ronchi_envelopes",
]
