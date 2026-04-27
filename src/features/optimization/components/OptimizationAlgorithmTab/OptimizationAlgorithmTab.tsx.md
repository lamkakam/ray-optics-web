# `features/optimization/components/OptimizationAlgorithmTab/OptimizationAlgorithmTab.tsx`

Renders the optimizer configuration form for the Algorithm tab while leaving state ownership in the parent page.

- Uses the drawer panel padding provided by the parent layout and does not add its own outer `p-4` wrapper.
- Reads optimizer kind labels, method options, and tolerance field labels from `features/optimization/lib/optimizerUiConfig.ts`.
- Imports optimization worker-boundary optimizer types from `features/optimization/types/optimizationWorkerTypes.ts`.
- Uses the shared `OptimizationConfig["optimizer"]` attribute names for form state. Numeric optimizer fields are represented as strings for inputs, so the tab reads and patches `max_nfev`, `ftol`, `xtol`, `gtol`, `tol`, and `atol` directly.
- The Optimizer Kind select is controlled by the parent and emits kind changes so the store can reset kind-specific algorithm defaults.
- The Method select is rendered only for method-based optimizers. Least squares supports both `Trust Region Reflective` (`trf`) and `Levenberg-Marquardt` (`lm`) through the centralized optimizer UI metadata.
- Differential Evolution is methodless and renders only `Max. num of steps`, `Relative tolerance`, and `Absolute tolerance`.
- Keeps `Max. num of steps` as a separately rendered field rather than treating it as metadata-driven.
