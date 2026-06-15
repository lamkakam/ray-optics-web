# `features/analysis/components/LongitudinalSphericalAberrationChart/longitudinalSphericalAberrationChartOption.ts`

## Purpose

Builds the ECharts option for longitudinal spherical aberration plots.

## Behavior

- Registers line, grid, legend, tooltip, and canvas renderer modules.
- Produces one value `xAxis` named `Longitudinal Focus Shift` with the payload x-unit.
- Produces one numeric `yAxis` named `Normalized Pupil Coordinate`, bounded from `0` to `1`.
- Uses field-curve grid spacing and solid grey split-line styling.
- Enables a crosshair axis pointer through tooltip configuration.
- Renders one symbol-free line series per wavelength, named from the provided wavelength labels.
