# `e2e/sasianTripletManualInput.spec.ts`

Playwright end-to-end test that manually builds the Sasian Triplet lens from a blank Lens Editor state and verifies the updated optical system renders analysis output.

## Flow

- Reload the app and wait for Pyodide initialization.
- Configure System Specs aperture to `12.5`.
- Open the Field modal, switch to angle fields, set the max field value to `20`, and add normalized field rows `0.707` and `1`.
- Open the Wavelengths modal, configure Fraunhofer lines `F`, `d`, and `C`, set the `d` line weight to `2`, and mark it as the reference wavelength.
- Open the Prescription tab and insert six surface rows at the end of the prescription grid.
- Edit surfaces `1` through `6` by their visible prescription `Index` column values, not AG Grid physical `row-index` attributes.
- Set glass media for surfaces `1`, `3`, and `5` through the Medium selector modal.
- Click `Update System`, wait for computation to complete, then verify the EFL chip and lens layout image are visible.

## Selector Conventions

- Field and wavelength modal grids are small modal-local AG Grid instances; their helpers use AG Grid `row-index`.
- The lens prescription grid uses helpers from `utils.ts` that locate rows by the rendered `Index` column. The `Index` column is the stable user-facing surface identity and skips Object/Image rows.
- Prescription helpers first locate the pinned `Index` row, then read or edit cells from the matching center-row container for the same AG Grid `row-index`.
- Prescription row insertion waits for the expected count of visible surface indices instead of assuming a specific AG Grid physical row position.
