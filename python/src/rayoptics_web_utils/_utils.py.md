# `python/src/rayoptics_web_utils/_utils.py`

## Purpose

Internal helpers shared across the package. Not part of the public API.

## Exports (Internal)

```python
def _fig_to_base64(fig: Figure, dpi: int = 150) -> str: ...
def _get_wvl_lbl(opm: OpticalModel, idx: int) -> str: ...
```

## Function Details

### `_fig_to_base64(fig, dpi=150)`

Serialises a matplotlib `Figure` to a base64-encoded PNG string. This function must be idempotent.

1. Writes the figure to an in-memory `BytesIO` buffer via `fig.savefig(format='png', bbox_inches='tight')`.
2. Base64-encodes the buffer contents and decodes to a UTF-8 string.
3. Closes the buffer.
4. Calls `plt.close(fig)` to release matplotlib memory.
5. Returns the base64 string.

### `_get_wvl_lbl(opm, idx)`

Returns a human-readable wavelength label for matplotlib legend annotations.

- Reads `opm['optical_spec']['wvls'].wavelengths[idx]` and formats it as `"<value>nm"`.

## Key Conventions

- Leading underscores on both the module name (`_utils`) and all symbols signal that nothing here is part of the public API.
- `_fig_to_base64` always calls `plt.close(fig)` before returning to prevent matplotlib figure accumulation in long-running Pyodide sessions.
- `dpi=150` is the default resolution; callers may override for higher or lower quality output.


## Usages

- Imported in the Pyodide web worker (`workers/pyodide.worker.ts`)
