# `python/src/rayoptics_web_utils/glass/glass.py`

## Purpose

Extracts optical glass catalog data (refractive indices, Abbe numbers, partial dispersions) from the `opticalglass` library and returns it as plain Python dicts suitable for JSON serialisation.

## Key Conventions

- `opticalglass` has **no** rayoptics dependency → all functions in this module are eagerly importable (no lazy loading required).
- `glass_data(name)` returns a `pandas.Series` with a multi-level tuple index `(category, sub_key)`.
- `nd` key: `('refractive indices', 'd')`.
- `ne` key: `('refractive indices', 'e')`.
- Test cases ensure that all interested attributes of each optical glass from the built-in catalogs in `opticalglass` are valid.

## Partial Dispersion Formulas

- P_F,e = (nF − ne) / (nF − nC)
- P_F,d = (nF − nd) / (nF − nC)
- P_g,F = (ng − nF) / (nF − nC)

## API

### `_partial_dispersions(data) -> dict[str, float]`

Reads refractive indices at `"C"`, `"d"`, `"e"`, `"F"`, `"g"` from `('refractive indices', letter)` and computes all three partial dispersions. Returns `0.0` if the denominator (nF − nC) is zero.

### `_get_dispersion_coefficients(catalog_name: str, data: pd.Series) -> dict[str, str | list[float]]`

- Reads `"dispersion coefficients"` of each glass from `data`.
- Each glass from catalog name of `"CDGM"`, `"Hoya"` and `"Sumita"` use the convention for Schott dispersion equation with total 5 terms. Each glass from `"Hikari"` use the convention for Schott dispersion equation with total 8 terms. For output, `"dispersion_coeffs"` for each glass from `"CDGM"`, `"Hoya"`, `"Sumita"` is padded to have a uniform length of 8, aligning to the length of `"dispersion_coeffs"` of each glass from `"Hikari"`. The `"dispersion_coeff_kind"` is `"Schott2x6"`.
- Each glass from catalog name of `"Ohara"` and `"Schott"` use the convention of Sellmeier dispersion equation with total 6 terms. The `"dispersion_coeff_kind"` is `"Sellmeier3T"`.

### `_build_glass_entry(data) -> dict[str, float | dict[str, float] | list[float]]`

Assembles the full glass dict from a `glass_data()` Series.

### `get_glass_catalog_data(catalog_name) -> dict[str, dict]`

Returns `{glass_name: glass_dict}` for all valid glasses in the named catalog. Catalog name is case-insensitive (delegated to `opticalglass` CaselessDictionary).

### `get_all_glass_catalogs_data() -> dict[str, dict[str, dict]]`

Returns data for all 6 opticalglass catalogs (CDGM, Hikari, Hoya, Ohara, Schott, Sumita) plus the `"Special"` catalog from `custom_materials.get_special_materials_data()` (contains CaF2). Total: 7 catalog keys.

## Output Schema (per glass)
The value for the attribute `"dispersion_coeff_kind"` is either `"Schott2x6"` or `"Sellmeier3T"`

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
  },
  "dispersion_coeff_kind": "Sellmeier3T",
  "dispersion_coeffs": [
    1.03961212,
    0.231792344,
    1.01046945,
    0.006000699,
    0.0200179144,
    103.560653
  ]
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
| Special  | 1 (CaF2)           |

## Usages

### `get_all_glass_catalogs_data`

Called from the Pyodide worker to load all optical glass catalog data for the glass map feature:

```python
from rayoptics_web_utils.glass.glass import get_all_glass_catalogs_data

all_catalogs = get_all_glass_catalogs_data()
# Returns: {
#   "CDGM": {"D-ZK1": {...}, "D-PK3": {...}, ...},
#   "Hikari": {"A5": {...}, "A3": {...}, ...},
#   "Hoya": {"FC5": {...}, "E-FDS6": {...}, ...},
#   "Ohara": {"S-BAH3": {...}, ...},
#   "Schott": {"BK7": {...}, "FK51": {...}, ...},
#   "Sumita": {"K-BaK4": {...}, ...},
#   "Special": {"CaF2": {...}}
# }
json_result = json.dumps(all_catalogs)
```

### `get_glass_catalog_data`

Query a single optical glass catalog by name:

```python
from rayoptics_web_utils.glass.glass import get_glass_catalog_data

schott_catalog = get_glass_catalog_data("Schott")
# Returns: {"BK7": {...}, "SF5": {...}, ...}

bk7_data = schott_catalog["BK7"]
# Returns: {
#   "refractive_index_d": 1.5168,
#   "abbe_number_d": 64.17,
#   "partial_dispersions": {...},
#   "dispersion_coeff_kind": "Sellmeier3T",
#   "dispersion_coeffs": [...]
# }
```

- Exported eagerly from `rayoptics_web_utils.__init__` as `get_glass_catalog_data` and `get_all_glass_catalogs_data`.
- Called from the Pyodide worker (`workers/pyodide.worker.ts`) to populate the glass map feature on the frontend.
- All data is JSON-serializable and transmitted as plain dicts (no live pyproxy objects).
