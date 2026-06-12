# `python/src/rayoptics_web_utils/analysis/field_curves.py`

## Purpose

Extracts wavelength-selectable field-curve data sampled across the full field of view.

## Exports

- `get_field_curvature_data(opm, wvl_idx, num_points=21)`: returns field curvature chart data for one wavelength with `Sagittal` and `Tangential` focus-shift curves.
- `get_astigmatism_curve_data(opm, wvl_idx, num_points=21)`: returns astigmatism chart data for one wavelength with one `Astigmatism` curve, computed as `Tangential.x - Sagittal.x`.

Both helpers use the same RayOptics astigmatic field-curve trace sampling and wavelength lookup. `fieldLabels` are formatted sampled field values, `unitX` is the optical-system length unit, and `unitY` is the field unit. Curve `y` arrays contain category indices so the frontend can render a category-y chart.
