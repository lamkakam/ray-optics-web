# Lens-editor and optimization mutation survivor accounting

This document records the disposition of the 1,623 survivors reported for the two requested feature areas. The preserved baseline remains at `reports/mutation/mutation.json`; `reports/mutation/original-mutation.json` is its byte-for-byte copy with SHA-256 `de63b390bd1815a8a4d870f6b2d7208df14691ada8c2c2e282f61f7e2678dcf6`.

The baseline survivor inventory was extracted as JSONL by a line-oriented parser. It contains only the 1,623 records under the `src/features/lens-editor` and `src/features/optimization` paths, across 56 source files. The original report was not loaded wholesale. Focused results were written separately to:

- `reports/mutation/lens-core-mutation.json`
- `reports/mutation/lens-ui-mutation.json`
- `reports/mutation/lens-remaining-mutation.json`
- `reports/mutation/lens-zernike-mutation.json`
- `reports/mutation/optimization-core-mutation.json`
- `reports/mutation/optimization-ui-mutation.json`
- `reports/mutation/lens-optimization-final-mutation.json`

## Matching method

Original and focused records were matched without mutant IDs. The streaming matcher used source path, exact start and end location, mutator name, replacement, and the source slice at that location. Stryker's JSON report does not expose a separate mutated-content field; the source slice is therefore the available content check, while the replacement is retained as the mutation content. Every original record matched exactly one focused record; there were no records that were already resolved or unmatched in the current source.

## Rerun summary

The status columns below describe each original survivor after the focused rerun. `S` means Stryker still reported `Survived`; it is not treated as a kill or silently removed from the accounting.

| Group | Original survivors | Killed | S | Timeout | No coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| Lens core | 202 | 79 | 123 | 0 | 0 |
| Lens UI | 365 | 67 | 295 | 3 | 0 |
| Lens remaining | 173 | 0 | 171 | 0 | 2 |
| Lens Zernike | 17 | 8 | 9 | 0 | 0 |
| Optimization core | 252 | 82 | 132 | 17 | 21 |
| Optimization UI | 614 | 66 | 548 | 0 | 0 |
| **Total** | **1,623** | **302** | **1,278** | **20** | **23** |

The union of focused matches is exactly 1,623 records. The 302 kills are behavior assertions added to the requested feature tests; no mutation threshold, production source, dependency, or Stryker configuration was changed.

A final cross-feature run used the stream-generated source ranges for the inventory and all 57 lens-editor/optimization test files. It exercised 687 location-scoped mutants across 56 source files: 301 killed, 304 survived, 7 timed out, and 75 had no coverage, with no runtime errors. The six focused reports above remain the authoritative exact accounting because the range-scoped Stryker run collapses multiple operators at the same source location.

## Per-file accounting

The residual-class column applies to the non-killed records in that row. `E` is equivalent or redundant under the documented typed contract, `U` is unreachable or unsupported through client behavior, `C` is cosmetic/static/diagnostic, `G` is a focused-test selection coverage gap, and `T` is a mutation-run timeout that does not establish equivalence.

### Lens-editor

| Source file | Original | Killed | S | T | G | Residual class |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `src/features/lens-editor/lib/lensPrescriptionWebMcp.ts` | 90 | 30 | 60 | 0 | 0 | E/U/C |
| `src/features/lens-editor/lib/photonsToPhotosParser.ts` | 75 | 25 | 50 | 0 | 0 | E/U/C |
| `src/features/lens-editor/stores/specsConfiguratorStore.ts` | 20 | 14 | 6 | 0 | 0 | E/U |
| `src/features/lens-editor/stores/lensEditorStore.ts` | 17 | 10 | 7 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/LensPrescriptionContainer/LensPrescriptionContainer.tsx` | 97 | 14 | 81 | 2 | 0 | E/U/C/T |
| `src/features/lens-editor/components/WavelengthConfigModal/WavelengthConfigModal.tsx` | 65 | 18 | 47 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/LensPrescriptionContainer/AsphericalModal/AsphericalModal.tsx` | 51 | 2 | 49 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/LensPrescriptionContainer/ApertureModal/ApertureModal.tsx` | 44 | 6 | 37 | 1 | 0 | E/U/C/T |
| `src/features/lens-editor/LensEditor.tsx` | 38 | 10 | 28 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/LensPrescriptionContainer/MediumSelectorModal/MediumSelectorModal.tsx` | 36 | 14 | 22 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/FieldConfigModal/FieldConfigModal.tsx` | 34 | 3 | 31 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/SeidelAberrModal/SeidelAberrModal.tsx` | 30 | 0 | 30 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/SpecsConfiguratorContainer/SpecsConfiguratorContainer.tsx` | 27 | 0 | 25 | 0 | 2 | G/C |
| `src/features/lens-editor/components/LensEditorConfigToolbar/LensEditorConfigToolbar.tsx` | 17 | 0 | 17 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/LensPrescriptionContainer/FormattingModal/FormattingModal.tsx` | 12 | 0 | 12 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/LensPrescriptionContainer/DecenterModal/DecenterModal.tsx` | 12 | 0 | 12 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/LensPrescriptionContainer/PythonScriptModal/PythonScriptModal.tsx` | 11 | 0 | 11 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/FirstOrderChips/FirstOrderChips.tsx` | 10 | 0 | 10 | 0 | 0 | C/U |
| `src/features/lens-editor/components/FocusingContainer/FocusingContainer.tsx` | 9 | 0 | 9 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/SpecsConfiguratorPanel/SpecsConfiguratorPanel.tsx` | 8 | 0 | 8 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/LensPrescriptionContainer/LensPrescriptionGrid/LensPrescriptionGrid.tsx` | 7 | 0 | 7 | 0 | 0 | E/U/C |
| `src/features/lens-editor/lib/zernikeData.ts` | 7 | 0 | 7 | 0 | 0 | C |
| `src/features/lens-editor/hooks/useLensPrescriptionWebMCP.ts` | 5 | 0 | 5 | 0 | 0 | E/U |
| `src/features/lens-editor/components/BottomDrawerContainer/BottomDrawerContainer.tsx` | 4 | 0 | 4 | 0 | 0 | C/U |
| `src/features/lens-editor/components/LensPrescriptionContainer/DiffractionGratingModal/DiffractionGratingModal.tsx` | 4 | 0 | 4 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/ParaxialDataModal/ParaxialDataModal.tsx` | 4 | 0 | 4 | 0 | 0 | E/U/C |
| `src/features/lens-editor/components/LensLayoutPanel/LensLayoutPanel.tsx` | 2 | 0 | 2 | 0 | 0 | C/U |
| `src/features/lens-editor/lib/autoSemiDiameters.ts` | 1 | 0 | 1 | 0 | 0 | E/U |
| `src/features/lens-editor/providers/SpecsConfiguratorStoreProvider.tsx` | 1 | 0 | 1 | 0 | 0 | U |
| `src/features/lens-editor/components/FocusingPanel/FocusingPanel.tsx` | 1 | 0 | 1 | 0 | 0 | C/U |
| `src/features/lens-editor/components/ImageReferencePanel/ImageReferencePanel.tsx` | 1 | 0 | 1 | 0 | 0 | C/U |
| `src/features/lens-editor/components/ZernikeTermsModal/ZernikeTermsModal.tsx` | 17 | 8 | 9 | 0 | 0 | E/C |
| **Lens total** | **757** | **154** | **598** | **3** | **2** |  |

### Optimization

| Source file | Original | Killed | S | T | G | Residual class |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `src/features/optimization/stores/optimizationStore.ts` | 183 | 50 | 113 | 12 | 8 | E/U/C/T/G |
| `src/features/optimization/lib/glassCandidateSelection.ts` | 16 | 4 | 11 | 1 | 0 | E/U/T |
| `src/features/optimization/lib/optimizationViewModels.ts` | 15 | 14 | 1 | 0 | 0 | E |
| `src/features/optimization/lib/modalHelpers.ts` | 14 | 11 | 1 | 0 | 2 | E/G |
| `src/features/optimization/lib/BoundedVariableModeFields/BoundedVariableModeFields.tsx` | 9 | 0 | 0 | 0 | 9 | G/C |
| `src/features/optimization/lib/optimizerUiConfig.ts` | 7 | 0 | 4 | 3 | 0 | C/T |
| `src/features/optimization/lib/applyOptimizationModelToEditor.ts` | 5 | 3 | 2 | 0 | 0 | E/U |
| `src/features/optimization/lib/UnboundedVariableModeFields/UnboundedVariableModeFields.tsx` | 1 | 0 | 0 | 0 | 1 | G |
| `src/features/optimization/lib/operandMetadata.ts` | 1 | 0 | 0 | 1 | 0 | T |
| `src/features/optimization/lib/variableModeFields.tsx` | 1 | 0 | 0 | 0 | 1 | G |
| `src/features/optimization/OptimizationPage.tsx` | 195 | 22 | 173 | 0 | 0 | E/U/C |
| `src/features/optimization/components/GlassVariableModal/GlassVariableModal.tsx` | 99 | 12 | 87 | 0 | 0 | E/U/C |
| `src/features/optimization/components/AsphereVarModal/AsphereVarModal.tsx` | 93 | 19 | 74 | 0 | 0 | E/U/C |
| `src/features/optimization/components/OptimizationProgressModal/OptimizationProgressModal.tsx` | 44 | 7 | 37 | 0 | 0 | E/U/C |
| `src/features/optimization/components/OptimizationInspectionModals/OptimizationInspectionModals.tsx` | 40 | 3 | 37 | 0 | 0 | E/U/C |
| `src/features/optimization/components/BottomDrawerContainer/BottomDrawerContainer.tsx` | 24 | 0 | 24 | 0 | 0 | C/U |
| `src/features/optimization/components/OptimizationLensPrescriptionGrid/PickupModeFields/PickupModeFields.tsx` | 22 | 0 | 22 | 0 | 0 | E/U/C |
| `src/features/optimization/components/OptimizationWeightsGrid/OptimizationWeightsGrid.tsx` | 19 | 3 | 16 | 0 | 0 | E/U/C |
| `src/features/optimization/components/OptimizationOperandsTab/OptimizationOperandsTab.tsx` | 17 | 0 | 17 | 0 | 0 | E/U/C |
| `src/features/optimization/components/ThicknessModeModal/ThicknessModeModal.tsx` | 17 | 0 | 17 | 0 | 0 | E/U/C |
| `src/features/optimization/components/OptimizationLensPrescriptionGrid/OptimizationLensPrescriptionGrid/OptimizationLensPrescriptionGrid.tsx` | 17 | 0 | 17 | 0 | 0 | E/U/C |
| `src/features/optimization/components/RadiusModeModal/RadiusModeModal.tsx` | 15 | 0 | 15 | 0 | 0 | E/U/C |
| `src/features/optimization/components/OptimizationEvaluationPanel/OptimizationEvaluationPanel.tsx` | 10 | 0 | 10 | 0 | 0 | E/U/C |
| `src/features/optimization/components/OptimizationAlgorithmTab/OptimizationAlgorithmTab.tsx` | 2 | 0 | 2 | 0 | 0 | C/U |
| **Optimization total** | **866** | **148** | **680** | **17** | **21** |  |

## Concrete residual classifications

The focused tests were extended around supported observable contracts: parser grammar and numeric fallbacks; WebMCP schema paths and no-op/protected rows; zero and independently invalid optical bounds; field, wavelength, aperture, asphere, and medium modal transitions; store synchronization; variable, constant, and pickup conversions; glass eligibility and stale identities; evaluation and optimization payloads; cancellation and error outcomes; and applying results back to the editor.

The remaining `Survived` records have these concrete dispositions:

- Lens parser and WebMCP survivors are redundant branches over discriminated row kinds, already-normalized invalid values, defensive optional accesses, and diagnostic/default strings. Supported parser sections and exact WebMCP error paths are asserted; the remaining replacements do not change a valid payload or committed row.
- Lens store and modal survivors are guarded combinations prevented by the row/specification unions or by the modal owner, no-op updates for protected rows, stable callback/dependency values, and display-only labels/classes. The added tests cover the supported zero, invalid, cancellation, confirmation, and asynchronous-result boundaries.
- The Zernike survivors include the internal request counter's `+= 1` to `-= 1` replacement, which still generates a distinct token for each outstanding request and preserves equality-based stale-result rejection. The remaining fallback-array and MathJax-key mutations are not rendered while data is absent or do not affect displayed values. The new tests kill the stale-response guard, current-selection payload, loading-state, ordering-option, and ordering-conversion behavior mutations.
- Optimization store survivors include redundant type guards, typed asphere/pickup branches, protected modal resets, diagnostic strings, and browser/worker lifecycle defenses. The supported variable/pickup, bounds, residual-count, synchronization, result-application, and cancellation cases are asserted. The `report.final_glasses.length >= 0` mutation is tautological for an array and is equivalent.
- Optimization UI survivors are mostly presentation strings, stable callback/dependency identities, guarded optional modal state, and layout measurements. The page's browser-only `window`, `crypto`, `SharedArrayBuffer`, and DOM measurement paths are classified as unsupported/unreachable client states or browser-layout behavior where applicable. No SSR tests were added because this application is client-side and the task explicitly excludes SSR coverage.
- Static Zernike names, optimizer metadata, and UI labels are classified as cosmetic/static unless they alter an observable supported value; the latter cases are covered by exact option, header, payload, and rendered-value assertions.

The 20 `Timeout` matches are retained as unresolved mutation-run outcomes rather than called equivalent. They are concentrated in `LensPrescriptionContainer` (2), `ApertureModal` (1), `optimizationStore` (12), `glassCandidateSelection` (1), `optimizerUiConfig` (3), and `operandMetadata` (1). They are async modal/store or module-initialization mutations whose focused worker exceeded Stryker's timeout; no production behavior or threshold was changed.

The 23 `NoCoverage` matches are explicit test-selection gaps, not equivalent claims: `SpecsConfiguratorContainer` (2), `BoundedVariableModeFields` (9), `optimizationStore` (8), `modalHelpers` (2), `UnboundedVariableModeFields` (1), and `variableModeFields` (1). They remain visible in the per-file table and are not suppressed.

The optimization-core rerun also produced four `RuntimeError` mutants outside the original survivor set. They were malformed generated module-initialization mutations in `operandMetadata`, `optimizerUiConfig`, and `glassCandidateSelection`; they do not indicate a production defect and are not counted as original survivors.

## Scope

Only tests and this accounting document were changed. No production source, embedded production declaration, dependency, or mutation configuration was changed. No SSR test or version test was added.
