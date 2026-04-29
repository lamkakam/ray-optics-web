# `features/example-systems/ExampleSystemsPage.tsx`

Client route component for selecting and applying bundled example optical systems.

## Behavior

- Renders a two-column layout on large screens with a `MenuContainer` list on the left and apply/description content on the right.
- Keeps selected example key, confirmation modal visibility, and applying state local to the component.
- Displays example names with numeric prefixes stripped.
- Uses `applyExampleSystem()` to load the selected model into editor stores, compute first-order/layout/selected plot/Seidel data, commit specs/model, then route to `/`.
- Calls `onError` and stays on `/example-systems` when applying fails.
