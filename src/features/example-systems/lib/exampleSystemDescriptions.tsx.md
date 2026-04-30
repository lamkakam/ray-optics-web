# `features/example-systems/lib/exampleSystemDescriptions.ts`

README-derived display descriptions for bundled example optical systems.

## Exports

- `stripExamplePrefix(name)` removes generated numeric prefixes such as `1: ` from example keys.
- `getExampleSystemDescription(exampleKey)` returns source summary text for the selected example.

## Description Map

- Descriptions are keyed by `keyof typeof ExampleSystemList` and the map uses `satisfies Record<ExampleSystemName, ReactNode>`, so TypeScript reports both missing descriptions and extra description entries when the example catalogue changes.
- `getExampleSystemDescription(exampleKey)` still accepts arbitrary strings. It strips the generated numeric prefix, uses an own-property type guard before indexing the exact map, and returns `"Bundled example optical system."` for unknown names.

## Link Behavior

- Source/reference links use a local `DescriptionExternalLink` wrapper around `ExternalLink` with `variant="description"`, so each link uses the description-sized external-link token, is underlined, theme-aware, and opens in a new tab with `rel="noopener noreferrer"`.
- Links provide explicit `aria-label` values, including descriptive labels for visible text such as `Link`.
