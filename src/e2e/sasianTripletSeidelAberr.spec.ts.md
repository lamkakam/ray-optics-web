# `e2e/sasianTripletSeidelAberr.spec.ts`

Playwright end-to-end test that loads the Sasian Triplet example system from `/example-systems`, confirms the overwrite modal, returns to the Lens Editor, and verifies all Seidel aberration modal tabs.

## Flow

- Navigate to `/example-systems`.
- Select `Sasian Triplet`.
- Click `Apply`, confirm `Load`, and wait for navigation back to `/`.
- Open the Prescription tab after the automatic computation has finished and the route has returned to `/`.
- Open the `3rd Order Seidel Aberrations` modal and compare table values in each tab against reference data.
