# `python/src/rayoptics_web_utils/analysis/field_curves.py`

## Purpose

Extracts wavelength-selectable sagittal and tangential focus-shift curves sampled across the full field of view.

## Exports

- `get_field_curvature_data(opm, wvl_idx, num_points=21)`: returns field curvature chart data for one wavelength.
- `get_astigmatism_curve_data(opm, wvl_idx, num_points=21)`: returns astigmatism curve chart data for one wavelength.

Both helpers return one payload with `wvlIdx`, `Sagittal`, `Tangential`, `fieldLabels`, `unitX`, and `unitY`. `Sagittal` and `Tangential` contain focus-shift `x` arrays and category-index `y` arrays so the frontend can render one category-y chart.
