import type { AllGlassCatalogsData, CatalogName } from "@/shared/lib/types/glassMap";

export const NON_GLASS_SPECIAL_MEDIA = ["air", "REFL"] as const;

export interface LensEditorGlassCatalogOptions {
  readonly manufacturers: readonly string[];
  readonly mediaByManufacturer: Readonly<Record<string, readonly string[]>>;
}

function getSortedGlassNames(catalog: Record<string, unknown>): string[] {
  return Object.keys(catalog).sort((left, right) => left.localeCompare(right));
}

export function buildLensEditorGlassCatalogOptions(
  catalogsData: AllGlassCatalogsData,
): LensEditorGlassCatalogOptions {
  const manufacturerCatalogs = (
    Object.entries(catalogsData) as [CatalogName, Record<string, unknown>][]
  ).filter(([catalogName, catalog]) => catalogName !== "Special" && Object.keys(catalog).length > 0);

  const manufacturers = ["Special", ...manufacturerCatalogs.map(([catalogName]) => catalogName)];
  const mediaByManufacturer: Record<string, readonly string[]> = {
    Special: [
      ...NON_GLASS_SPECIAL_MEDIA,
      ...getSortedGlassNames(catalogsData.Special),
    ],
  };

  for (const [catalogName, catalog] of manufacturerCatalogs) {
    mediaByManufacturer[catalogName] = getSortedGlassNames(catalog);
  }

  return {
    manufacturers,
    mediaByManufacturer,
  };
}
