# `features/example-systems/lib/exampleSystemDescriptions.ts`

README-derived display descriptions for bundled example optical systems.

## Exports

- `getExampleSystemDescription(exampleName)` accepts an `ExampleSystemName` and returns source summary text for the selected example.

## Description Map

- Descriptions are keyed by `keyof typeof ExampleSystemList` and the map uses `satisfies Record<ExampleSystemName, ReactNode>`, so TypeScript reports both missing descriptions and extra description entries when the example catalogue changes.
- `ExampleSystemName` is imported from the feature-local catalogue module, keeping description keys aligned with the unprefixed example catalogue.
- `getExampleSystemDescription(exampleName)` indexes the exact map directly; callers must pass a known canonical example name.

## Link Behavior

- Source/reference links use a local `DescriptionExternalLink` wrapper around `ExternalLink` with `variant="description"`, so each link uses the description-sized external-link token, is underlined, theme-aware, and opens in a new tab with `rel="noopener noreferrer"`.
- Links provide explicit `aria-label` values, including descriptive labels for visible text such as `Link`.
