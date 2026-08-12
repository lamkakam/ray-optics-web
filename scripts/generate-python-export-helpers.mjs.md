# `scripts/generate-python-export-helpers.mjs`

## Purpose

Generates the ignored TypeScript string constants used to inline Python aperture and exact-spec helpers in standalone notebook export scripts.

## Behavior

- Reads the aperture helper Python source files in this fixed order:
  1. `src/python/src/rayoptics_web_utils/aperture/annular.py`
  2. `src/python/src/rayoptics_web_utils/aperture/offset_circular.py`
  3. `src/python/src/rayoptics_web_utils/aperture/offset_rotated_rectangular.py`
  4. `src/python/src/rayoptics_web_utils/aperture/ronchi_ruling.py`
- Joins those aperture sources with a single newline.
- Reads `src/python/src/rayoptics_web_utils/optical_specs.py` as the exact-spec helper source.
- Creates `src/shared/lib/utils/generated/` if needed.
- Writes `src/shared/lib/utils/generated/pythonExportApertureHelpers.ts`.
- Writes `src/shared/lib/utils/generated/pythonExportExactSpecHelpers.ts`.
- Uses `JSON.stringify` for the generated string literal so Python source text is embedded safely in TypeScript.

## Usage

```bash
node scripts/generate-python-export-helpers.mjs
```

The project runs this script automatically through npm lifecycle hooks, including `postinstall`, `pretype-check`, `prelint`, `pretest`, `prebuild`, `predev`, and `pretest:e2e`. Developers may run it directly when they want to refresh the generated file without running another command.

## Notes

- Both generated TypeScript outputs are ignored by git and should not be committed.
- Normal dev, check, test, and build commands regenerate the output before consuming TypeScript, so developers do not need to remember a manual codegen step.
- No Python code is executed; the script only reads Python source files as text.
