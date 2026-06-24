# `e2e/glassMapMediumSelection.spec.ts`

Playwright end-to-end coverage for returning from Glass Map to an open `Select Medium` workflow.

## Scenarios

- Opens the Object row's `Select Medium` modal, drafts `Schott / N-BK7`, and follows `View in glass map`.
- Changes the plot type, centre wavelength, partial-dispersion type, and a catalog filter; verifies `Schott / N-BK7` remains selected; then uses `Use selected glass` and verifies the modal restores that draft while the prescription row remains unchanged.
- Selects a different plotted glass, records its catalog and glass name from the detail panel, and uses `Use selected glass`.
- Verifies the returned modal contains the newly selected draft, the prescription remains unchanged until confirmation, and `Confirm` commits the glass to the Object row.

## Isolation and Selectors

- Uses the worker-scoped Pyodide page fixture and reloads before each scenario.
- Locates the Object row by its visible grid-cell label.
- Reuses the accessible modal, field, and link names plus `data-testid="glass-point"` from the Glass Map chart.
- Treats the route URL, restored modal visibility, draft values, and prescription commit boundary as acceptance criteria.
