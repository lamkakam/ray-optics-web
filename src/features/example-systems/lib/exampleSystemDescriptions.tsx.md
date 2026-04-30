# `features/example-systems/lib/exampleSystemDescriptions.ts`

README-derived display descriptions for bundled example optical systems.

## Exports

- `stripExamplePrefix(name)` removes generated numeric prefixes such as `1: ` from example keys.
- `getExampleSystemDescription(exampleKey)` returns source summary text for the selected example.

## Link Behavior

- Source/reference links use a local `DescriptionExternalLink` wrapper around `ExternalLink` with `variant="description"`, so each link uses the description-sized external-link token, is underlined, theme-aware, and opens in a new tab with `rel="noopener noreferrer"`.
- Links provide explicit `aria-label` values, including descriptive labels for visible text such as `Link`.
