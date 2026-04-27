# `e2e/importLensConfig.spec.ts`

End-to-end coverage for importing `lens-config.json` through the `Load Config` button and verifying the imported specs, prescription grid, modals, and update flow.

## Flow

1. Dismiss any startup dialog, load the JSON fixture, and confirm the import.
2. Verify imported system, aperture, field, and wavelength values through the Specs UI.
3. Verify the Prescription grid values for key rows, including visible aspherical/decenter text labels (`Conic`, `None`, `bend`, `decenter`, `reverse`).
4. Open the aspherical and decenter modals from prescription cells and verify the imported modal values.
5. Update the system and verify output metrics appear.
