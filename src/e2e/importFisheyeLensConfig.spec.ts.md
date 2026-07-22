# `src/e2e/importFisheyeLensConfig.spec.ts`

## Purpose

End-to-end coverage for importing `fisheye-lens-config.json`, explicitly running `Update System`, and verifying that the imported prescription and system-spec state remains consistent after computation.

## Covered Flow

1. Open the `Prescription` tab and import `src/e2e/jsons/fisheye-lens-config.json`.
2. Confirm the load dialog.
3. Click `Update System` and wait for computation to finish.
4. Verify the auto aperture dimensions switch is checked and displays `Auto`.
5. Verify every imported surface row shows the expected label, radius, thickness, medium, and post-compute semi-diameter, and that inactive aspherical or tilt/decenter cells display `None`.
6. Verify `System Specs` keeps `Entrance Pupil Diameter` set to `0.25`.
7. Verify the Half-Field modal shows `90` degree angle fields with `[0, 0.707, 1]` relative values and wide-angle mode enabled.
8. Verify the wavelength modal shows the expected three wavelengths, weights, and reference wavelength.

## Notes

- The test reads the prescription grid after `Update System` to ensure the imported model survives the compute cycle and verifies the worker-computed semi-diameters displayed in auto-aperture mode.
- The final surface thickness assertion uses the full stored numeric string because the imported JSON contains a long floating-point value.
- Prescription row assertions identify each surface by its displayed `Index` value, then read cells from the matching center-row container so the pinned `Index` column does not create duplicate-row selector failures.
