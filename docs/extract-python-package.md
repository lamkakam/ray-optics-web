# Extract Embedded Python into a Local Python Package

## What was done

The ~170 lines of Python code embedded as string literals in `workers/pyodide.worker.ts` have been extracted into a proper Python package (`rayoptics-web-utils`). The package is built as a `.whl` file, placed in `public/`, and installed by micropip during worker initialization.

## Why

- **Maintainability**: Python code in template strings had no syntax highlighting, linting, or type checking.
- **Testability**: Python functions can now be unit-tested with pytest under CPython.
- **Separation of concerns**: The TypeScript worker file is now focused on orchestration, not Python logic.

## Package structure

```
python/
├── pyproject.toml                         # Build config (setuptools)
├── src/
│   └── rayoptics_web_utils/
│       ├── __init__.py                    # Lazy-import public API
│       ├── setup.py                       # Qt stubbing + env init + CaF2 material
│       ├── analysis.py                    # get_first_order_data, get_3rd_order_seidel_data
│       ├── plotting.py                    # 5 plot functions (lens layout, ray fan, OPD fan, spot diagram, Seidel bar chart)
│       ├── _utils.py                      # _fig_to_base64, _get_wvl_lbl
│       └── data/
│           └── CaF2_Malitson.yml          # Bundled CaF2 refractive index data
└── tests/
    ├── test_setup.py
    ├── test_analysis.py
    └── test_plotting.py
```

## How it works

1. **Build**: `scripts/build-python-wheel.sh` runs `python3 -m build --wheel` and outputs the `.whl` to `public/`.
2. **npm hooks**: `prebuild` and `predev` scripts in `package.json` automatically build the wheel before `next build` or `next dev`.
3. **Worker init**: `init()` in `pyodide.worker.ts` computes the wheel URL from the app origin and base path, then passes it to `_init()`.
4. **`_init()`** installs rayoptics + dependencies via micropip, then installs the local wheel and calls `rayoptics_web_utils.init()` to stub Qt modules, set the matplotlib backend, and create the CaF2 material.
5. **CaF2 data** is bundled inside the wheel via `importlib.resources` — no more fetching YAML at runtime or writing to the Pyodide FS.

## Key design decisions

- **`__init__.py` uses lazy imports**: `analysis.py` and `plotting.py` import rayoptics at module level, so they can only be imported after `init()` has stubbed Qt modules. The `__getattr__` pattern defers these imports.
- **`plot_lens_layout(opm)`**: Now takes `opm` as a parameter instead of relying on a global variable.
- **All plot/analysis functions derive `sm = opm['seq_model']` internally** instead of relying on a global `sm`.
- **Service worker caching**: `public/pyodide-sw.js` and `lib/swCachePolicy.ts` now cache same-origin `.whl` files.

## Files changed

### New
| File | Purpose |
|------|---------|
| `python/` | Entire Python package (source + tests + pyproject.toml) |
| `scripts/build-python-wheel.sh` | Wheel build script |
| `docs/extract-python-package.md` | This document |

### Modified
| File | Change |
|------|--------|
| `workers/pyodide.worker.ts` | Replaced embedded Python with wheel install + imports |
| `workers/__test__/pyodide.worker.test.ts` | Updated test expectations |
| `__mocks__/pyodide.ts` | Removed FS mock (no longer needed) |
| `lib/swCachePolicy.ts` | Added same-origin `.whl` caching |
| `lib/__tests__/swCachePolicy.test.ts` | Added 3 tests for `.whl` caching |
| `public/pyodide-sw.js` | Added same-origin `.whl` caching |
| `package.json` | Added `prebuild`/`predev` scripts |
| `.gitignore` | Added Python artifacts |
| `.github/workflows/ci.yml` | Added Python 3.12 setup + wheel build |
| `.github/workflows/deploy.yml` | Added Python 3.12 setup + wheel build |

### Removed
| File | Reason |
|------|--------|
| `public/database/data/main/CaF2/nk/Malitson.yml` | Bundled in the Python package |

## CI changes

Both `ci.yml` and `deploy.yml` now include:
```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
- run: pip install build
- run: bash scripts/build-python-wheel.sh
```

This runs before `npm ci` so the wheel is in `public/` before the Next.js build.

## Verification

- 582 Jest tests pass (including 3 new service worker cache tests)
- TypeScript type-check passes
- ESLint passes
- Wheel builds successfully (`rayoptics_web_utils-0.1.0-py3-none-any.whl`)
