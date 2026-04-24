# `features/optimization/components/OptimizationAlgorithmTab.tsx`

Renders the optimizer configuration form for the Algorithm tab while leaving state ownership in the parent page.

- Uses the drawer panel padding provided by the parent layout and does not add its own outer `p-4` wrapper.
- Reads optimizer kind labels, method options, and tolerance field labels from `features/optimization/lib/optimizerUiConfig.ts`.
- The Method select is controlled by the parent and currently supports both `Trust Region Reflective` (`trf`) and `Levenberg-Marquardt` (`lm`) through the centralized optimizer UI metadata.
- Explicitly requires the selected optimizer metadata to expose `methods` before rendering method options, so future methodless optimizer kinds fail fast until this form is extended for them.
- Keeps `Max. num of steps` as a separately rendered field rather than treating it as metadata-driven.
