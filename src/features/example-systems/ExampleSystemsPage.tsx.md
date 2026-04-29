# `features/example-systems/ExampleSystemsPage.tsx`

Client route component for selecting and applying bundled example optical systems.

## Behavior

- Renders an always-horizontal two-column layout with a `MenuContainer` list on the left and apply/description content on the right.
- Uses viewport-relative column sizing so each column occupies approximately half of the available viewport width; narrow viewports keep the two columns side by side and allow page overflow instead of stacking.
- Sizes the page-specific `MenuContainer` instance to the viewport height with an instance-level max-height override so large screens do not leave unused vertical gaps.
- Sizes the page-specific `DescriptionContainer` instance to approximately half the viewport height and keeps the Apply button above it in the right column.
- Keeps selected example key, confirmation modal visibility, and applying state local to the component.
- Displays example names with numeric prefixes stripped.
- Uses `applyExampleSystem()` to load the selected model into editor stores, compute first-order/layout/selected plot/Seidel data, commit specs/model, then route to `/`.
- Calls `onError` and stays on `/example-systems` when applying fails.
