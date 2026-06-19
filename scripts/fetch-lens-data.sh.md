# `scripts/fetch-lens-data.sh`

## Purpose

Download PhotonsToPhotos optical bench text fixtures into `src/__tests__/data/photons-to-photos/` so Jest and Playwright tests can reuse stable local copies of the lens data.

## Behavior (step-by-step)

1. Enables strict shell behavior with `set -euo pipefail`, so the script exits on the first failed command, unset variable, or failed pipeline.
2. Resolves `scripts/` from the script's own location, making the script safe to call from any working directory.
3. Creates `src/__tests__/data/photons-to-photos/` if it does not already exist.
4. Downloads six PhotonsToPhotos optical bench text files with `curl -o`:

   | Local fixture | Source fixture |
   |---------------|----------------|
   | `prime-no-glass-type.txt` | `DE01096057_Example01P.txt` |
   | `prime-with-glass-type.txt` | `CN216526482_Example01P.txt` |
   | `zoom-wide-angle-aspherical-no-glass-type.txt` | `US20140354857_Example07P.txt` |
   | `prime-fisheye-aspherical-no-glass-type.txt` | `US003524697_Example02.txt` |
   | `microscope-objective-finite.txt` | `US003912378_Example02.txt` |
   | `microscope-objective-imaging.txt` | `US006441966_Example02.txt` |

## Preconditions

- `curl` must be available on `PATH`.
- Network access to `https://www.photonstophotos.net/` must be available.
- No existing fixture directory is required; the script creates it if missing.

## Usage

```bash
bash scripts/fetch-lens-data.sh
```

## Output / Side-effects

- Creates `src/__tests__/data/photons-to-photos/` if needed.
- Writes six `.txt` fixture files into that directory.
- Overwrites existing fixture files when rerun.
- Prints `curl` progress output to stdout/stderr.
- Exits non-zero if any required command fails.

## Integration

The downloaded fixtures are consumed by tests that cover PhotonsToPhotos parsing and import flows:

- `src/features/lens-editor/lib/__tests__/photonsToPhotosParser.test.ts`
- `src/features/lens-editor/__tests__/LensEditor.test.tsx`
- `src/e2e/importPhotonsToPhotosTxt.spec.ts`

## Notes

- The script intentionally keeps external PhotonsToPhotos data out of test logic by storing local fixtures under `src/__tests__/data/photons-to-photos/`.
- The source URLs currently point at PhotonsToPhotos optical bench data files under `/GeneralTopics/Lenses/OpticalBench/Data/`.
- Rerun this script only when the fixtures need to be refreshed from the upstream source.
