# Optimization mutation survivor dispositions

The original full mutation report is preserved at `/tmp/ray-optics-mutation-original.json`.
Its SHA-256 is `37bea0f060bd4952a4d8a82706d6f0b0c639386ce3b7038d4fd582b3535a823b`.
The report was parsed with `jq --stream` into `/tmp/optimization-survivors.json`; that
streaming extraction contains 734 surviving mutants across 24 optimization files.

The baseline accounting below applies to every survivor in the corresponding file row.
The extracted JSON retains each mutant ID, source location, mutator, and replacement for
line-level review. Focused JSON reports are kept in the ignored `reports/mutation/`
directory so later Stryker runs cannot overwrite the preserved baseline.

The tracked [survivor index](./optimization-mutation-survivor-index.json) contains all
734 exact records. It compares focused campaigns by file, start/end location, mutator,
and replacement, deliberately excluding mutant IDs from the comparison. Each record
stores the matched campaign status and the reviewed disposition reason.

## Disposition key

- **Covered behavior** means an assertion was added or retained for the user-visible
  state transition, callback, serialization result, or worker interaction represented by
  the mutant.
- **Equivalent or unreachable** means the replacement cannot change a supported user
  flow, or requires an invalid internal state excluded by the component/store contract.
- **Static configuration** means grid metadata, chart presentation, fixed IDs, labels,
  memo dependency identity, or CSS/layout configuration. These are recorded without
  adding styling or implementation-detail assertions.
- **Environment-only** means a branch requires SSR, browser geometry, a worker failure,
  or a platform capability that the client-side Jest contract does not model. No SSR
  tests were added.
- A residual that is not equivalent, unreachable, static, or environment-only remains
  explicitly marked as deferred rather than being treated as killed.

## Baseline survivor accounting

| File | Original survivors | Disposition |
| --- | ---: | --- |
| `OptimizationPage.tsx` | 174 | Covered modal routing, confirmations, inspection close actions, evaluation states, optimization success/stop paths, and editor application. Residuals are worker failure/capability paths, DOM measurement, memoized selectors, SSR drawer-height fallback, and static layout/configuration; environment-only and static survivors are deferred. |
| `AsphereVarModal.tsx` | 75 | Covered coefficient, pickup, bound, mode, remount, and empty-state behavior. Residuals are fallback keys, default arrays/strings, impossible term-shape guards, and serialization details with no distinct supported state transition. |
| `BottomDrawerContainer.tsx` | 24 | Covered tab rendering, selection, optimizer handlers, and forwarded grid actions. Residuals are drawer layout metadata, memo identity, default labels, and optional callback guards. |
| `GlassVariableModal.tsx` | 88 | Covered catalog eligibility, variable selection, unavailable persisted rows, remounting, confirm/cancel, and empty catalog behavior. Residuals are AG Grid metadata, filter/selection configuration, fallback keys/labels, and defensive empty-state branches. |
| `OptimizationAlgorithmTab.tsx` | 2 | Fixed option-label replacements with no state effect; classified as static configuration. |
| `OptimizationEvaluationPanel.tsx` | 14 | Covered warning precedence, empty states, residual rows, formatting, and scroll behavior. Remaining survivors are presentation metadata, fixed copy, and static row/layout configuration; no CSS assertions were added. |
| `OptimizationInspectionModals.tsx` | 37 | Covered surface and object medium inspection, reflective-media restrictions, modal remounting, and read-only values. Residuals are fallback keys, optional nested-data defaults, and invalid row-shape guards. |
| `OptimizationLensPrescriptionGrid.tsx` | 17 | Covered row mapping, variable columns, labels, tooltips, and modal action forwarding. Residuals are AG Grid defaults, memo dependencies, optional callbacks, and static configuration. |
| `PickupModeFields.tsx` | 22 | Covered input-backed and select-backed source, scale, offset, and extra-field callbacks. Residuals are fixed IDs/labels/classes and optional-field presentation branches. |
| `OptimizationOperandsTab.tsx` | 17 | Covered add/edit/delete, target handling, zero-target display, and commit-before-action behavior. Residuals are AG Grid metadata, memo dependencies, and invalid/no-row guards. |
| `OptimizationProgressModal.tsx` | 37 | Covered chart-window data, stop states, cleanup, and completed-run OK dismissal. Residuals are ECharts presentation, theme colors, default props, chart sizing, and defensive cleanup branches. |
| `OptimizationWeightsGrid.tsx` | 16 | Covered weight editing, commit-before-action, and rerender preservation. Residuals are AG Grid metadata/value getters, memo dependencies, and no-row guards. |
| `RadiusModeModal.tsx` | 15 | Covered mode changes, bounds validation, pickup source/scale/offset, cancel, and confirm behavior. Residuals are invalid-open guards, remount keys, memo dependencies, and impossible mode fallbacks. |
| `ThicknessModeModal.tsx` | 17 | Covered mode changes, bounds validation, pickup source/scale/offset, cancel, and confirm behavior. Residuals are invalid-open guards, remount keys, memo dependencies, and impossible mode fallbacks. |
| `BoundedVariableModeFields.tsx` | 9 | Covered supported bound-field rendering and validation flow; remaining fixed labels and option metadata are static configuration. |
| `UnboundedVariableModeFields.tsx` | 1 | Defensive branch requires an invalid field configuration and is unreachable through the supported modal modes. |
| `applyOptimizationModelToEditor.ts` | 2 | Covered the apply success/failure flow; remaining fallback guard/string replacements do not distinguish a supported result. |
| `glassCandidateSelection.ts` | 16 | Covered catalog absence, Special-media filtering, case-insensitive eligibility, Custom fallback rules, sorting, and stale persisted identities. Remaining survivors are a missing-row guard, a constrained Custom fallback condition, and the catalog-order `Map` initializer; the latter also produced one module-initialization runtime-error mutant. |
| `modalHelpers.ts` | 3 | Covered variable-radius serialization and parsing. Remaining delimiter/default-string replacements are equivalent for the supported mode grammar. |
| `operandMetadata.ts` | 1 | Unknown-operand metadata fallback is a defensive contract guard; supported operand kinds are covered. |
| `optimizationViewModels.ts` | 1 | Covered targetless residual rendering and effective weight handling. |
| `optimizerUiConfig.ts` | 6 | Fixed optimizer labels/default metadata with no additional user state transition; classified as static configuration. |
| `variableModeFields.tsx` | 1 | The shared field callback shape is exercised through the radius/thickness modal flows; the surviving arrow replacement only changes callback identity in an equivalent render path. |
| `optimizationStore.ts` | 139 | Covered initialization, modal flags, optimizer defaults, variable/pickup/asphere/glass state, coefficient trimming, result reconciliation, and editor synchronization. Residuals are private invalid-state guards, default object/array/string fallbacks, serialization variants, and callbacks that are unreachable after the store contract has established the required state. |

The original counts sum to 734. Current focused campaigns killed the observable
behavior mutants in the exercised flows; the remaining categories above are retained as
reviewed residuals rather than hidden by changing production code or adding static-style
tests. The exact index comparison matched 207 baseline survivors as killed, 499 as
survived, 1 as no-coverage, 1 as timeout, and left 26 without a focused campaign match;
the latter are still covered by the file-level disposition rows and are not counted as
kills.

## Final focused campaign records

These reports were generated after the final test additions. Counts are reported exactly
as Stryker emitted them; `NoCoverage`, `Timeout`, and `RuntimeError` are campaign
limitations, not surviving behavior claims.

| Report | Total | Killed | Survived | No coverage | Timeout | Runtime error |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `optimization-page.json` | 506 | 272 | 155 | 52 | 27 | 0 |
| `optimization-store.json` | 1,047 | 915 | 76 | 52 | 4 | 0 |
| `optimization-glass-modal.json` | 297 | 247 | 46 | 4 | 0 | 0 |
| `optimization-asphere.json` | 324 | 290 | 29 | 5 | 0 | 0 |
| `optimization-components-group.json` | 526 | 383 | 125 | 18 | 0 | 0 |
| `optimization-progress.json` | 81 | 36 | 43 | 2 | 0 | 0 |
| `optimization-thickness.json` | 70 | 30 | 18 | 22 | 0 | 0 |
| `optimization-glass.json` | 87 | 83 | 3 | 0 | 0 | 1 |

The focused campaigns were run with the final Jest tests for each source slice. The
full client-side optimization Jest suite remains the release check; SSR behavior is
outside that suite by design.
