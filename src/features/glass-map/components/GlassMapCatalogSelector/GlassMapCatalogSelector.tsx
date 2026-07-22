"use client";

import { useState } from "react";
import { getEligibleGlassNames, resolveCatalogGlass } from "@/features/glass-map/lib/glassMap";
import { CATALOG_NAMES } from "@/features/glass-map/types/glassMap";
import type { CatalogName, CompleteGlassCatalogsData, GlassLookupMaps, SelectedGlass } from "@/features/glass-map/types/glassMap";
import { Button } from "@/shared/components/primitives/Button";
import { Datalist } from "@/shared/components/primitives/Datalist";
import { Select } from "@/shared/components/primitives/Select";

interface GlassMapCatalogSelectorProps {
  /** Authoritative catalog data. */
  readonly catalogsData: CompleteGlassCatalogsData;
  /** Canonical lookup maps built from the same catalog-data snapshot. */
  readonly lookupMaps: GlassLookupMaps;
  /** Called with the canonical stored catalog name, glass name, and data. */
  readonly onSelect: (glass: SelectedGlass) => void;
}

/**
Single-row catalog and glass selector for the Glass Map controls panel. The draft catalog and glass input are component-local; selecting a valid glass delegates the committed selection to the parent.

## Behavior

- Renders the shared `Select`, `Datalist`, and `Button` primitives with accessible Catalog, Glass, and Select-glass labels.
- Catalog options contain every `CATALOG_NAMES` entry, including catalogs with no glasses, `Special`, and `Custom`.
- Defaults Catalog to the first catalog containing an eligible glass and Glass to blank.
- Clears Glass whenever Catalog changes.
- Glass suggestions come from the selected bucket in `catalogsData`.
- The `Special` bucket excludes the shared built-in special materials (`air` and `REFL`) case-insensitively.
- Exact trimmed, case-insensitive input matches are canonicalized through the lookup maps to stored spelling. Blank, partial, aliased, and unmatched inputs keep Select disabled.
- Does not read or change catalog plot-filter state.
*/
export function GlassMapCatalogSelector({ catalogsData, lookupMaps, onSelect }: GlassMapCatalogSelectorProps) {
  const [catalogName, setCatalogName] = useState<CatalogName>(
    CATALOG_NAMES.find((name) => getEligibleGlassNames(catalogsData, name).length > 0)
      ?? CATALOG_NAMES[0],
  );
  const [glassValue, setGlassValue] = useState("");
  const resolvedGlass = resolveCatalogGlass(catalogsData, lookupMaps, catalogName, glassValue);
  const glassNames = getEligibleGlassNames(catalogsData, catalogName);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 px-4 pt-4">
      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Catalog
        <Select
          aria-label="Catalog"
          value={catalogName}
          options={CATALOG_NAMES.map((name) => ({ value: name, label: name }))}
          onChange={(event) => {
            setCatalogName(event.target.value as CatalogName);
            setGlassValue("");
          }}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Glass
        <Datalist
          aria-label="Glass"
          value={glassValue}
          options={glassNames.map((name) => ({ value: name, label: name }))}
          onChange={(event) => {
            const value = event.target.value;
            const match = resolveCatalogGlass(catalogsData, lookupMaps, catalogName, value);
            setGlassValue(match?.glassName ?? value);
          }}
        />
      </label>
      <Button
        variant="primary"
        aria-label="Select glass"
        disabled={resolvedGlass === undefined}
        onClick={() => {
          if (resolvedGlass !== undefined) onSelect(resolvedGlass);
        }}
      >
        Select
      </Button>
    </div>
  );
}
