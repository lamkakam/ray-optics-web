# `features/analysis/components/fieldCategoryLineChartOption.ts`

## Purpose

Provides private low-level helpers for field-category line charts used by field curvature and astigmatism chart option builders.

## Behavior

- Converts paired `LineAxisData.x` and `LineAxisData.y` arrays into ECharts `[x, y]` line points, truncating to the shorter array.
- Builds the shared focus-shift x-axis, field-category y-axis, and fixed grid dimensions.
- Explicitly enables solid grey split lines on both axes.
- Limits visible y-axis category labels, tick marks, and horizontal split lines to five evenly distributed field labels when more than five labels are available.
- Shows every y-axis category label, tick mark, and horizontal split line when five or fewer field labels are available.
- Builds symbol-free line series from caller-provided series definitions.

## Public API

This file is a feature-local implementation helper. It is imported directly by chart option modules and is not re-exported from a component `index.ts`.
