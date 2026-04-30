# `features/example-systems/ExampleSystemsPage.tsx`

Client route component for selecting and applying bundled example optical systems.

## Behavior

- Uses `useScreenBreakpoint()` to choose between large-screen and small-screen layout at the project `screenLG` breakpoint.
- On `screenLG`, renders the existing two-column layout with a `MenuContainer` list on the left and apply/description content on the right.
- On `screenLG`, uses viewport-relative column sizing so each column occupies approximately half of the available viewport width, sizes the page-specific `MenuContainer` instance to the viewport height, and keeps the Apply button above the page-specific `DescriptionContainer` in the right column.
- On `screenSM`, renders a contained full-width vertical layout with the page heading and Apply button in the same header row.
- On `screenSM`, stacks `MenuContainer` before `DescriptionContainer`, gives both panels the full available route width, and splits the remaining route height between them with `min-h-0`/`flex-1`.
- On `screenSM`, keeps the page wrapper overflow hidden to avoid route-level vertical scrolling; long menu or description content scrolls inside the corresponding panel.
- Adds page-specific spacing between adjacent direct paragraph children in each `DescriptionContainer`, while leaving links and other non-paragraph description content unaffected.
- Keeps selected example key, confirmation modal visibility, and applying state local to the component.
- Displays example names with numeric prefixes stripped.
- Maintains a stable button ref for each example menu item and restores focus to the selected example button when the selected key changes through menu interaction.
- Makes selection follow focus while tabbing through example menu item buttons, so the focused menu item is also the chosen system.
- Handles `Enter` on the page-specific Example Systems menu by opening the existing apply overwrite confirmation when an example is chosen and applying is not in progress.
- Renders the placeholder copy as a `Paragraph`, then renders selected description React nodes directly so description fragments can contain paragraphs and links without nested paragraph markup.
- Uses `applyExampleSystem()` to load the selected model into editor stores, compute first-order/layout/selected plot/Seidel data, commit specs/model, then route to `/`.
- Calls `onError` and stays on `/example-systems` when applying fails.
