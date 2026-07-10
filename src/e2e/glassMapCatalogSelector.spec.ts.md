# `e2e/glassMapCatalogSelector.spec.ts`

End-to-end coverage for the Glass Map catalog selector. The scenario opens the side navigation and enters Glass Map, chooses Schott, types the known `N-BK7` glass with non-canonical casing, verifies canonicalization, commits the selection, and verifies the detail heading. It returns the worker-scoped page to Lens Editor so later specifications retain their expected starting route.
