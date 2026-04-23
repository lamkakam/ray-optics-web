# `features/optimization/components/OptimizationAlgorithmTab.tsx`

Renders the optimizer configuration form for the Algorithm tab while leaving state ownership in the parent page.

- Uses the drawer panel padding provided by the parent layout and does not add its own outer `p-4` wrapper.
- The Method select is controlled by the parent and supports both `Trust Region Reflective` (`trf`) and `Levenberg-Marquardt` (`lm`).
