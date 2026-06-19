# `e2e/importPhotonsToPhotosTxt.spec.ts`

## Purpose

End-to-end coverage for importing Photons to Photos `.txt` files through the Lens Editor toolbar.

## Coverage

- Prime import: opens the TXT file chooser from `Import a file from Photons to Photos`, confirms overwrite, and verifies representative system specs plus prescription-grid values.
- Zoom import: selects a focal length in the modal, confirms overwrite, and verifies selected-column field and thickness values.

## Notes

- Fixtures are reused from `src/__tests__/data/photons-to-photos`.
- The test intentionally verifies imported UI state rather than running an optical compute.
