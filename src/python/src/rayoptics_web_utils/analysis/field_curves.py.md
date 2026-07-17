# `python/src/rayoptics_web_utils/analysis/field_curves.py`

## Purpose

Extracts wavelength-selectable field-curve data sampled across the full field of view.

## Exports

- `get_field_curvature_data(opm, wvl_idx, num_points=21)`: returns field curvature chart data for one wavelength with `Sagittal` and `Tangential` focus-shift curves.
- `get_astigmatism_curve_data(opm, wvl_idx, num_points=21)`: returns astigmatism chart data for one wavelength with one `Astigmatism` curve, computed as `Tangential.x - Sagittal.x`.

For finite image space, both helpers retain RayOptics astigmatic focus-shift tracing and system-length units. For infinite image space, symmetric differential pupil rays are evaluated at the exit-pupil plane and return sagittal/tangential output vergence in `D`; astigmatism remains tangential minus sagittal. `fieldLabels` contain sampled field values and curve `y` arrays contain category indices.
