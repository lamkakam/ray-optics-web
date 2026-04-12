# `src/e2e/importTransmissiveDiffractionGratingConfig.spec.ts`

## Purpose

End-to-end coverage for importing `transmissive-diffraction-grating.json` through the `Load Config` button and verifying that the imported diffraction grating and tilt/decenter settings are visible from the prescription UI.

## Covered Flow

1. Open the `Prescription` tab and import `src/e2e/jsons/transmissive-diffraction-grating.json`.
2. Confirm the load dialog.
3. Verify the imported prescription grid marks the expected diffraction grating row and both tilt/decenter rows as `Set`.
4. Open the diffraction grating modal from the imported row and verify `lp/mm = 600` and `order = 1`.
5. Open the tilt/decenter modal for the first imported decenter row and verify `dec and return` with `alpha = 15` and zeroed remaining fields.
6. Open the tilt/decenter modal for the second imported decenter row and verify `dec and return` with `alpha = -15` and zeroed remaining fields.

## Notes

- The assertions use the imported row positions from this JSON fixture: row `4` and row `9` for tilt/decenter, row `6` for diffraction grating.
- The test validates the state displayed in the modals triggered by the row-level `SetButton` instances, which is the acceptance target for this import path.
- The selectors scope each `SetButton` to the specific AG Grid column cell so duplicate button renderers in the same row do not cause Playwright strict-mode failures.
