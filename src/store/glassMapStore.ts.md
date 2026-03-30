# glassMapStore.ts — Spec

## Purpose
Zustand store slice for the Glass Map page state.

## State (`GlassMapState`)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `catalogsData` | `AllGlassCatalogsData \| undefined` | `undefined` | Loaded and normalized glass catalog data |
| `dataLoading` | `boolean` | `false` | True while fetching from worker |
| `dataError` | `string \| undefined` | `undefined` | Error message if loading fails |
| `plotType` | `GlassMapPlotType` | `'refractiveIndex'` | Which plot type to display |
| `abbeNumCenterLine` | `AbbeNumCenterLine` | `'d'` | d or e spectral line for Abbe number axis |
| `partialDispersionType` | `PartialDispersionType` | `'P_g_F'` | Which partial dispersion for y-axis |
| `enabledCatalogs` | `Record<CatalogName, boolean>` | all `true` | Per-catalog visibility filter |
| `selectedGlass` | `SelectedGlass \| undefined` | `undefined` | Currently clicked/selected glass |

## Actions (`GlassMapActions`)
| Action | Description |
|--------|-------------|
| `setCatalogsData(data)` | Store loaded catalog data |
| `setDataLoading(v)` | Set loading flag |
| `setDataError(e)` | Set/clear error string |
| `setPlotType(t)` | Switch between refractiveIndex / partialDispersion |
| `setAbbeNumCenterLine(l)` | Switch d/e spectral line |
| `setPartialDispersionType(t)` | Switch P_F_d / P_F_e / P_g_F |
| `toggleCatalog(name)` | Toggle a single catalog's enabled state |
| `setSelectedGlass(glass)` | Set or clear the selected glass (callable from external components) |

## Export
- `createGlassMapSlice: StateCreator<GlassMapStore>` — use with `createStore<GlassMapStore>(createGlassMapSlice)`
- `GlassMapStore = GlassMapState & GlassMapActions`
