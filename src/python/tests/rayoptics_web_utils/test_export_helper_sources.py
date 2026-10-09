"""Keep the source modules inlined into exported standalone scripts executable.

``scripts/generate-python-export-helpers.mjs`` joins the aperture modules and
embeds ``optical_specs.py`` after other code in the exported notebook script, so
these modules cannot use ``from __future__ import annotations`` and every
signature annotation must resolve without importing this package.
"""

from pathlib import Path

PACKAGE_ROOT = Path(__file__).parents[2] / "src" / "rayoptics_web_utils"
APERTURE_HELPER_SOURCES = (
    PACKAGE_ROOT / "aperture" / "annular.py",
    PACKAGE_ROOT / "aperture" / "offset_circular.py",
    PACKAGE_ROOT / "aperture" / "offset_rotated_rectangular.py",
    PACKAGE_ROOT / "aperture" / "ronchi_ruling.py",
)
EXACT_SPEC_HELPER_SOURCE = PACKAGE_ROOT / "optical_specs.py"
EXPORT_PREAMBLE = (
    "isdark = False\n"
    "from rayoptics.raytr.vigcalc import set_vig\n"
    "from rayoptics.elem.surface import DecenterData, Circular, Aperture, Rectangular\n"
)


def test_inlined_helper_sources_execute_after_export_preamble() -> None:
    """Mirror ``buildExportScript``: preamble, joined apertures, then exact specs."""
    aperture_helpers = "\n".join(path.read_text(encoding="utf-8") for path in APERTURE_HELPER_SOURCES)
    exact_spec_helpers = EXACT_SPEC_HELPER_SOURCE.read_text(encoding="utf-8")
    script = f"{EXPORT_PREAMBLE}\n{aperture_helpers}\n\n{exact_spec_helpers}\n"
    namespace: dict[str, object] = {"__name__": "__export_script__"}

    exec(compile(script, "<export script>", "exec"), namespace)

    for name in ("Annular", "OffsetCircular", "OffsetRotatedRectangular", "RonchiRuling", "ExactOpticalModel"):
        assert name in namespace
