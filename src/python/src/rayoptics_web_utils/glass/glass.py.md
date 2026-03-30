# `python/src/rayoptics_web_utils/glass/glass.py`

## Purpose

Extracts optical glass catalog data (refractive indices, Abbe numbers, partial dispersions) from the `opticalglass` library and returns it as plain Python dicts suitable for JSON serialisation.

## Key Conventions

- `opticalglass` has **no** rayoptics dependency → all functions in this module are eagerly importable (no lazy loading required).
- `glass_data(name)` returns a `pandas.Series` with a multi-level tuple index `(category, sub_key)`.
- `nd` key: tries `('refractive indices', 'd')` first; falls back to `('refractive index', 'd')` (Hoya primary store).
- `ne` key: tries `('refractive indices', 'e')` first; falls back to `('refractive index', 'e')`.
- Glass entries where `nd`, `ne`, `vd`, `ve`, or any partial dispersion (P_F_e, P_F_d, P_g_F) is missing/NaN are silently skipped.

## Partial Dispersion Formulas

- P_F,e = (nF − ne) / (nF − nC)
- P_F,d = (nF − nd) / (nF − nC)
- P_g,F = (ng − nF) / (nF − nC)

## API

### `_safe_float(data, key) -> float | None`

Returns the float value at `key` in `data`, or `None` if the key is missing, non-numeric, or NaN.

### `_partial_dispersions(data) -> dict[str, float] | None`

Reads nF, ne, nd, nC, ng from `('refractive indices', letter)` and computes all three partial dispersion ratios. Returns `None` if any input value is unavailable or the denominator (nF − nC) is zero.

### `_build_glass_entry(data) -> dict | None`

Assembles the full glass dict from a `glass_data()` Series. Returns `None` if nd, ne, vd, ve, or any partial dispersion is unavailable.

### `get_glass_catalog_data(catalog_name) -> dict[str, dict]`

Returns `{glass_name: glass_dict}` for all valid glasses in the named catalog. Catalog name is case-insensitive (delegated to `opticalglass` CaselessDictionary).

### `get_all_glass_catalogs_data() -> dict[str, dict[str, dict]]`

Returns data for all 6 catalogs: CDGM, Hikari, Hoya, Ohara, Schott, Sumita.

## Output Schema (per glass)

```json
{
  "refractive_index_d": 1.5168,
  "refractive_index_e": 1.51872,
  "abbe_number_d": 64.17,
  "abbe_number_e": 63.96,
  "partial_dispersions": {
    "P_F_e": 0.454094,
    "P_F_d": 0.692308,
    "P_g_F": 0.533499
  }
}
```

## Catalogs

| Catalog  | # Glasses (approx) |
|----------|--------------------|
| CDGM     | 240                |
| Hikari   | 160                |
| Hoya     | 194                |
| Ohara    | 134                |
| Schott   | 123                |
| Sumita   | 134                |

## Usages

- Exported eagerly from `rayoptics_web_utils.__init__` as `get_glass_catalog_data` and `get_all_glass_catalogs_data`.
- Intended for use by the Pyodide worker to power the glass map feature on the frontend.
