# `GlassMapCatalogSelector.tsx`

## Purpose

Single-row catalog and glass selector for the Glass Map controls panel. The draft catalog and glass input are component-local; selecting a valid glass delegates the committed selection to the parent.

## Props

- `catalogsData: CompleteGlassCatalogsData` — authoritative catalog data.
- `onSelect: (glass: SelectedGlass) => void` — called with the canonical stored catalog name, glass name, and data.

## Behavior

- Renders the shared `Select`, `Datalist`, and `Button` primitives with accessible Catalog, Glass, and Select-glass labels.
- Catalog options contain every `CATALOG_NAMES` entry, including catalogs with no glasses, `Special`, and `Custom`.
- Defaults Catalog to the first catalog containing an eligible glass and Glass to blank.
- Clears Glass whenever Catalog changes.
- Glass suggestions come from the selected bucket in `catalogsData`.
- The `Special` bucket excludes the shared built-in special materials (`air` and `REFL`) case-insensitively.
- Exact case-insensitive input matches are canonicalized to stored spelling. Blank, partial, and unmatched inputs keep Select disabled.
- Does not read or change catalog plot-filter state.
