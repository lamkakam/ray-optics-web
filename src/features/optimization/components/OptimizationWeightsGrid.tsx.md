# `features/optimization/components/OptimizationWeightsGrid.tsx`

Shared AG Grid wrapper for field and wavelength weight rows with a single numeric update callback.

- Wraps the grid in a padded container with horizontal overflow enabled for narrow viewports.
- Keeps AG Grid in `domLayout="autoHeight"` without adding its own vertical scroll container so parent layout containers can own vertical scrolling.
