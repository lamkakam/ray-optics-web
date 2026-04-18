# `features/optimization/components/OptimizationWeightsGrid.tsx`

Shared AG Grid wrapper for field and wavelength weight rows with a single numeric update callback.

- Wraps the grid in a horizontal-overflow container and relies on parent layout padding instead of adding its own outer `p-4`.
- Keeps AG Grid in `domLayout="autoHeight"` without adding its own vertical scroll container so parent layout containers can own vertical scrolling.
- Applies `defaultColDef={{ sortable: false, suppressMovable: true }}` so Optimization field and wavelength columns keep a fixed order.
