# `features/example-systems/`

Feature module for the `/example-systems` route.

- `ExampleSystemsPage.tsx` renders the route UI.
- `lib/applyExampleSystem.ts` owns the store update and compute/commit flow for applying a bundled example.
- `lib/exampleSystemDescriptions.ts` maps bundled examples to README-derived source descriptions.
- `lib/exampleSystems.ts` owns the bundled example optical-system catalogue used by the selector.
