# `e2e/schmidtCameraDownload.spec.ts`

Playwright end-to-end test that loads the Schmidt Camera example system from `/example-systems`, confirms the overwrite modal, returns to the Lens Editor, and verifies the downloaded configuration JSON shape.

## Flow

- Navigate to `/example-systems`.
- Select `Schmidt Camera 200mm f/5`.
- Click `Apply`, confirm `Load`, and wait for navigation back to `/`.
- Open the Prescription tab, download the config, parse it as JSON, and assert expected top-level model keys.
