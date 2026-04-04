# `shared/lib/utils/glassCatalogs.ts`

## Purpose

Shared helpers for projecting normalized worker-backed glass catalog data into the lens editor's manufacturer/glass selector model.

## Exports

### `NON_GLASS_SPECIAL_MEDIA`
```ts
readonly ["air", "REFL"]
```

- UI-only media that are not present in the worker glass catalogs
- Always appear under the synthetic `"Special"` manufacturer bucket in the lens editor

### `buildLensEditorGlassCatalogOptions(catalogsData)`
```ts
buildLensEditorGlassCatalogOptions(
  catalogsData: AllGlassCatalogsData,
): LensEditorGlassCatalogOptions
```

Returns:

```ts
interface LensEditorGlassCatalogOptions {
  manufacturers: readonly string[];
  mediaByManufacturer: Readonly<Record<string, readonly string[]>>;
}
```

## Behavior

- Includes `"Special"` as the first manufacturer option
- Includes only non-empty worker-backed catalog manufacturers after `"Special"`
- Builds `"Special"` media as:
  - `air`
  - `REFL`
  - sorted worker-backed entries from `catalogsData.Special` such as `CaF2`
- Sorts glass names alphabetically within each manufacturer bucket

## Consumers

- `features/lens-editor/components/MediumSelectorModal.tsx`
