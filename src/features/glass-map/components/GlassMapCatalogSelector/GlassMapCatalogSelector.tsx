"use client";

import { useState } from "react";
import { getEligibleGlassNames, resolveCatalogGlass } from "@/features/glass-map/lib/glassMap";
import { CATALOG_NAMES } from "@/features/glass-map/types/glassMap";
import type { CatalogName, CompleteGlassCatalogsData, GlassLookupMaps, SelectedGlass } from "@/features/glass-map/types/glassMap";
import { Button } from "@/shared/components/primitives/Button";
import { Datalist } from "@/shared/components/primitives/Datalist";
import { Select } from "@/shared/components/primitives/Select";

interface GlassMapCatalogSelectorProps {
  readonly catalogsData: CompleteGlassCatalogsData;
  readonly lookupMaps: GlassLookupMaps;
  readonly onSelect: (glass: SelectedGlass) => void;
}

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
