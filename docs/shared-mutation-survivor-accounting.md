# Shared mutation survivor accounting

This document records the disposition of the 559 survivors reported for `src/shared` in the preserved mutation run. The original report remains at `reports/mutation/mutation.json`; `reports/mutation/original-mutation.json` is its byte-for-byte copy with SHA-256 `de63b390bd1815a8a4d870f6b2d7208df14691ada8c2c2e282f61f7e2678dcf6`. The compact streamed inventory is `reports/mutation/shared-survivors-inventory.jsonl` and contains 559 records across 38 files.

Reports from the focused reruns were matched against the inventory by source file, location, mutator/operator, and replacement. Mutant IDs were used only for the audit table because IDs can change between runs.

| Group | Original survivors | Killed | Equivalent or unreachable |
| --- | ---: | ---: | ---: |
| Components | 173 | 157 | 16 |
| Hooks | 31 | 14 | 17 |
| Grid and utilities | 268 | 216 | 52 |
| Python text generation | 28 | 22 | 6 |
| Schemas | 59 | 57 | 2 |
| **Total** | **559** | **466** | **93** |

The final focused reports had no timeouts. The schema run had 13 `RuntimeError` results from malformed generated validator mutants; those mutants are outside the original survivor set and are recorded here so they are not mistaken for successful assertions.

The 93 non-killed original survivors are listed below. Each row is an original inventory record and has a disposition code whose rationale follows the table.

| Original ID | Location | Operator | Replacement | Code |
| ---: | --- | --- | --- | --- |
| 11915 | `src/shared/components/layout/BottomDrawer/BottomDrawer.tsx:41:26-41:55` | ConditionalExpression | `false` | C1 |
| 11917 | `src/shared/components/layout/BottomDrawer/BottomDrawer.tsx:41:44-41:55` | StringLiteral | `""` | C1 |
| 11999 | `src/shared/components/layout/BottomDrawer/BottomDrawer.tsx:185:30-185:34` | BooleanLiteral | `false` | C1 |
| 11942 | `src/shared/components/layout/BottomDrawer/BottomDrawer.tsx:124:5-124:7` | ArrayDeclaration | `["Stryker was here"]` | C1 |
| 12034 | `src/shared/components/layout/Layout/Layout.tsx:81:51-81:81` | OptionalChaining | `hamburgerRef.current.contains` | C2 |
| 12033 | `src/shared/components/layout/Layout/Layout.tsx:81:11-81:39` | OptionalChaining | `sideNavRef.current.contains` | C2 |
| 12153 | `src/shared/components/primitives/MenuContainer/MenuContainer.tsx:53:11-53:29` | ConditionalExpression | `false` | C3 |
| 12167 | `src/shared/components/primitives/MenuContainer/MenuContainer.tsx:60:11-60:37` | ConditionalExpression | `false` | C3 |
| 12219 | `src/shared/components/primitives/Progress/Progress.tsx:126:13-126:27` | StringLiteral | `""` | C4 |
| 12325 | `src/shared/components/primitives/Tooltip/Tooltip.tsx:63:7-63:41` | EqualityOperator | `tooltipRect.width >= availableWidth` | C5 |
| 12350 | `src/shared/components/primitives/Tooltip/Tooltip.tsx:121:11-121:45` | LogicalOperator | `!triggerElement && !tooltipElement` | C5 |
| 12349 | `src/shared/components/primitives/Tooltip/Tooltip.tsx:121:11-121:45` | ConditionalExpression | `false` | C5 |
| 12371 | `src/shared/components/primitives/Tooltip/Tooltip.tsx:154:11-154:29` | ConditionalExpression | `true` | C5 |
| 12491 | `src/shared/components/providers/ImagePointProvider/ImagePointProvider.tsx:54:6-54:8` | ArrayDeclaration | `["Stryker was here"]` | C6 |
| 12542 | `src/shared/components/providers/ThemeProvider/ThemeProvider.tsx:62:6-62:8` | ArrayDeclaration | `["Stryker was here"]` | C7 |
| 12596 | `src/shared/hooks/usePyodide.ts:193:9-193:28` | ConditionalExpression | `true` | H1 |
| 12599 | `src/shared/hooks/usePyodide.ts:194:28-194:32` | BooleanLiteral | `false` | H1 |
| 12604 | `src/shared/hooks/usePyodide.ts:205:18-207:6` | BlockStatement | `{}` | H1 |
| 12605 | `src/shared/hooks/usePyodide.ts:208:6-208:8` | ArrayDeclaration | `["Stryker was here"]` | H1 |
| 12613 | `src/shared/hooks/useScreenBreakpoint.ts:22:14-22:22` | UpdateOperator | `nextId--` | H2 |
| 12901 | `src/shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx:66:7-66:17` | ConditionalExpression | `false` | G1 |
| 12903 | `src/shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx:66:15-66:17` | StringLiteral | `"Stryker was here!"` | G1 |
| 12959 | `src/shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx:165:14-165:36` | ConditionalExpression | `true` | G1 |
| 13005 | `src/shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx:193:11-193:32` | ConditionalExpression | `false` | G1 |
| 13007 | `src/shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx:193:24-193:32` | StringLiteral | `""` | G1 |
| 13045 | `src/shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx:221:24-221:31` | StringLiteral | `""` | G1 |
| 13043 | `src/shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx:221:11-221:31` | ConditionalExpression | `false` | G1 |
| 13077 | `src/shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx:249:11-249:31` | ConditionalExpression | `false` | G1 |
| 13079 | `src/shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx:249:24-249:31` | StringLiteral | `""` | G1 |
| 13100 | `src/shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx:277:5-277:27` | ConditionalExpression | `true` | G1 |
| 13224 | `src/shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx:388:11-388:32` | ConditionalExpression | `false` | G1 |
| 13249 | `src/shared/lib/lens-prescription-grid/lensPrescriptionGridColumns.tsx:420:11-420:33` | ConditionalExpression | `false` | G1 |
| 13357 | `src/shared/lib/lens-prescription-grid/lib/glassValidation.ts:125:9-125:46` | ConditionalExpression | `false` | G2 |
| 13359 | `src/shared/lib/lens-prescription-grid/lib/glassValidation.ts:125:25-125:46` | StringLiteral | `""` | G2 |
| 13558 | `src/shared/lib/lens-prescription-grid/lib/prescriptionFormatting.ts:92:23-92:41` | ConditionalExpression | `false` | G3 |
| 13592 | `src/shared/lib/lens-prescription-grid/lib/prescriptionFormatting.ts:127:7-127:31` | ConditionalExpression | `false` | G3 |
| 13601 | `src/shared/lib/lens-prescription-grid/lib/prescriptionFormatting.ts:130:7-130:30` | ConditionalExpression | `false` | G3 |
| 13632 | `src/shared/lib/lens-prescription-grid/lib/prescriptionFormatting.ts:150:10-151:33` | LogicalOperator | `isMirrorMedium(surface.medium) \|\| assignedGap !== undefined` | G3 |
| 13631 | `src/shared/lib/lens-prescription-grid/lib/prescriptionFormatting.ts:150:10-151:33` | ConditionalExpression | `true` | G3 |
| 13633 | `src/shared/lib/lens-prescription-grid/lib/prescriptionFormatting.ts:151:8-151:33` | ConditionalExpression | `true` | G3 |
| 13741 | `src/shared/lib/lens-prescription-grid/lib/prescriptionFormatting.ts:257:20-257:51` | OptionalChaining | `gapOverridesBySurfaceIndex.get` | G3 |
| 13755 | `src/shared/lib/lens-prescription-grid/lib/prescriptionFormatting.ts:265:16-265:34` | OptionalChaining | `surface.thickness` | G3 |
| 13757 | `src/shared/lib/lens-prescription-grid/lib/prescriptionFormatting.ts:266:13-266:28` | OptionalChaining | `surface.medium` | G3 |
| 13760 | `src/shared/lib/lens-prescription-grid/lib/prescriptionFormatting.ts:267:19-267:40` | OptionalChaining | `surface.manufacturer` | G3 |
| 14117 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:232:29-234:4` | BlockStatement | `{}` | G4 |
| 14115 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:232:7-232:27` | ConditionalExpression | `false` | G4 |
| 14123 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:240:7-240:73` | LogicalOperator | `(value === undefined \|\| value === null) && typeof value !== "object"` | G4 |
| 14124 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:240:7-240:44` | ConditionalExpression | `false` | G4 |
| 14125 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:240:7-240:44` | LogicalOperator | `value === undefined && value === null` | G4 |
| 14126 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:240:7-240:26` | ConditionalExpression | `false` | G4 |
| 14128 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:240:30-240:44` | ConditionalExpression | `false` | G4 |
| 14130 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:240:48-240:73` | ConditionalExpression | `false` | G4 |
| 14139 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:252:9-252:53` | ConditionalExpression | `true` | G4 |
| 14141 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:252:9-252:53` | LogicalOperator | `scaledValue !== undefined && field in record` | G4 |
| 14142 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:252:9-252:34` | ConditionalExpression | `false` | G4 |
| 14143 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:252:9-252:34` | EqualityOperator | `scaledValue === undefined` | G4 |
| 14170 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:314:46-316:4` | BlockStatement | `{}` | G4 |
| 14165 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:314:7-314:44` | LogicalOperator | `value === undefined && value === null` | G4 |
| 14164 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:314:7-314:44` | ConditionalExpression | `false` | G4 |
| 14166 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:314:7-314:26` | ConditionalExpression | `false` | G4 |
| 14168 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:314:30-314:44` | ConditionalExpression | `false` | G4 |
| 14178 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:322:7-322:27` | ConditionalExpression | `true` | G4 |
| 14179 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:322:7-322:27` | ConditionalExpression | `false` | G4 |
| 14180 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:322:29-324:4` | BlockStatement | `{}` | G4 |
| 14199 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:338:7-338:44` | ConditionalExpression | `false` | G4 |
| 14200 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:338:7-338:44` | LogicalOperator | `value === undefined && value === null` | G4 |
| 14201 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:338:7-338:26` | ConditionalExpression | `false` | G4 |
| 14198 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:338:7-338:73` | LogicalOperator | `(value === undefined \|\| value === null) && typeof value !== "object"` | G4 |
| 14203 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:338:30-338:44` | ConditionalExpression | `false` | G4 |
| 14205 | `src/shared/lib/lens-prescription-grid/lib/surfaceValueScaling.ts:338:48-338:73` | ConditionalExpression | `false` | G4 |
| 14415 | `src/shared/lib/utils/pythonScript.ts:108:45-108:70` | ConditionalExpression | `true` | P1 |
| 14414 | `src/shared/lib/utils/pythonScript.ts:108:27-108:70` | LogicalOperator | `usesExactStack \|\| isFieldWideAngle === true` | P1 |
| 14432 | `src/shared/lib/utils/pythonScript.ts:113:25-113:48` | ConditionalExpression | `true` | P1 |
| 14570 | `src/shared/lib/utils/pythonScript.ts:295:5-295:25` | MethodExpression | `medium.toLowerCase()` | P1 |
| 14568 | `src/shared/lib/utils/pythonScript.ts:295:5-295:36` | ConditionalExpression | `false` | P1 |
| 14571 | `src/shared/lib/utils/pythonScript.ts:295:30-295:36` | StringLiteral | `""` | P1 |
| 12084 | `src/shared/components/primitives/CheckboxInput/CheckboxInput.tsx:77:9-77:34` | ConditionalExpression | `true` | C8 |
| 12570 | `src/shared/hooks/useDebouncedCallback.ts:45:6-45:8` | ArrayDeclaration | `["Stryker was here"]` | H3 |
| 12575 | `src/shared/hooks/useDebouncedCallback.ts:55:27-55:35` | ArrayDeclaration | `[]` | H3 |
| 12635 | `src/shared/hooks/useServiceWorkerRegistration.ts:24:7-24:74` | ConditionalExpression | `false` | H4 |
| 12642 | `src/shared/hooks/useServiceWorkerRegistration.ts:24:76-26:4` | BlockStatement | `{}` | H4 |
| 12651 | `src/shared/hooks/useServiceWorkerRegistration.ts:58:6-58:8` | ArrayDeclaration | `["Stryker was here"]` | H4 |
| 12656 | `src/shared/hooks/useWebMCP.ts:13:89-13:91` | ArrayDeclaration | `["Stryker was here"]` | H5 |
| 12661 | `src/shared/hooks/useWebMCP.ts:21:26-21:57` | ConditionalExpression | `false` | H5 |
| 12663 | `src/shared/hooks/useWebMCP.ts:21:46-21:57` | StringLiteral | `""` | H5 |
| 12653 | `src/shared/hooks/useWebMCP.ts:6:35-6:64` | ConditionalExpression | `false` | H5 |
| 12654 | `src/shared/hooks/useWebMCP.ts:6:35-6:64` | EqualityOperator | `typeof window !== "undefined"` | H5 |
| 12652 | `src/shared/hooks/useWebMCP.ts:6:35-6:64` | ConditionalExpression | `true` | H5 |
| 12655 | `src/shared/hooks/useWebMCP.ts:6:53-6:64` | StringLiteral | `""` | H5 |
| 12692 | `src/shared/lib/chart-formatting/formatPlotValue.ts:26:34-26:45` | ConditionalExpression | `false` | G5 |
| 12716 | `src/shared/lib/chart-formatting/formatPlotValue.ts:47:7-47:43` | EqualityOperator | `value < MINIMUM_NON_ZERO_PLOT_VALUE` | G5 |
| 14359 | `src/shared/lib/schemas/importSchema.ts:143:41-143:56` | StringLiteral | `""` | S1 |
| 14368 | `src/shared/lib/schemas/prescriptionSchema.ts:13:11-13:19` | StringLiteral | `""` | S2 |

## Disposition rationale

- **C1** — The two browser/server replacements still select `window.innerHeight` in a browser, while server effects do not run and the initial maximum is the deterministic 850px fallback. The collapsed ref is assigned alongside the collapsed height and state, so changing that ref assignment does not change any supported rendered or committed value. The replacement dependency array has the same stable string element on every render, so `useCallback` remains stable.
- **C2** — While the outside-pointer listener is installed, both refs are mounted. Cleanup removes the listener before the component unmounts, so the optional accesses cannot change a supported event outcome.
- **C3** — When focus is outside the menu, `activeIndex` is `-1` and the ArrowDown branch already selects index zero. With at least one enabled button, the arithmetic in the target-index branch always produces a valid button, making the defensive guard unreachable for supported keyboard events.
- **C4** — `tailwind-merge` removes `leading-none` when it is followed by the progress token's `text-sm` class, so the empty-string replacement produces the same class attribute.
- **C5** — At exactly the available width, the wide-tooltip correction and the clamped correction compute the same horizontal offset. During the active non-portal hover effect both geometry refs are mounted, and the portal mouse-enter handler owns the same trigger ref, so the guard replacements do not change supported behavior.
- **C6/C7** — The provider callback dependency arrays contain no captured values; replacing their empty arrays with a stable string element does not change callback behavior.
- **C8** — The checkbox input is mounted before its effect runs, so the ref null check is false on every supported effect execution.
- **H1** — `initOnce()` is itself singleton-guarded, and the hook effect has an empty dependency list. Replaying the effect or changing the per-instance guard does not create a second worker or initialization. The cleanup block only removes a listener; React exposes no post-unmount state update, and the listener's singleton progress value remains available to the next mounted hook. The replacement dependency array has one stable string element.
- **H2** — Subscription IDs are internal map keys. Incrementing or decrementing the counter still gives each simultaneously registered subscription a unique key, and cleanup uses the returned key.
- **H3** — The debounce callback's cancel callback has no captured values, and its cleanup effect depends on that stable callback. The replacement dependency arrays preserve the same callback identities and cleanup behavior.
- **H4** — Registration errors are swallowed. On an unsupported browser, forcing the guard false only reaches `navigator.serviceWorker.register`, whose failure is caught; replacing the guard block with an empty block also resolves. The empty dependency replacement still runs the registration effect once.
- **H5** — The layout-effect choice has the same committed-tool ordering for the supported browser hook, the document capability conditional has the same result in a browser, and the effect does not run during server rendering. The default dependency replacement contributes a stable value, so it does not cause extra registration.
- **G1** — Valid grid rows are a discriminated union: Object has no curvature radius, Image has no thickness or medium, and Object/Image have no surface-only optional fields. The row-kind guards therefore return the same `undefined` values when removed or changed. The rectangular-aperture helper is called only with a row already known to be a surface. Empty parser input is rejected by the numeric regex even if its explicit empty-string check is changed, and the replacement sentinel is also rejected by that regex.
- **G2** — `resolvePrescriptionMedia` returns `catalog-unavailable` before entering its loop whenever lookup maps are absent. With maps present, `resolvePrescriptionMedium` cannot produce that result, so changing the in-loop branch condition or discriminant string is unreachable.
- **G3** — A missing Object index satisfies `-1 + 1 === 0`. Canonical row kinds make the reserved-ID alternatives redundant. In mirror replacement handling, the selected replacement is already a mirror and the assigned-gap map has an entry for every valid selected gap, so the changed conjunction remains true. Reverse helpers receive their normalized gap map and valid surface selectors from the formatting path; the optional accesses only differ for invalid or absent selectors outside the supported range.
- **G4** — Supported scaling policies contain functions, nested objects, arrays, finite numbers, or `undefined` preservation entries. They do not contain `null` or scalar non-object values at the recursive object branches. Every field reached by the policy loop is present by construction, so the `field in record` alternatives have the same result. The collector's array and absent-value guards have the same result for dense supported arrays and omitted optional values; invalid nested values are outside the typed GridRow contract.
- **G5** — Zero is already below `MINIMUM_NON_ZERO_PLOT_VALUE`, so removing the explicit zero check does not change the formatter. At the exact positive floor both comparison operators select the same format, and negative values remain below either comparison.
- **P1** — `usesExactStack` is exactly `isFieldWideAngle === true`, making the two wide-angle conditions equivalent. The object field-space test is redundant because the only other supported field space is handled by the preceding image branch. For reflected Object media, the function has already substituted built-in air and its manufacturer is suppressed; ordinary media take the other branch, so the manufacturer-related replacements produce the same generated text.
- **S1** — The imported schema's `version` property has `const: "1.0"`; changing the separate regex cannot admit another version.
- **S2** — The finite-number keyword is nested under a schema whose outer `type: "number"` check rejects nonnumeric values first. Replacing the custom keyword's type label therefore does not change validation of supported inputs.

The focused test files cover the supported observable cases named by these contracts. No mutation operator or source exclusion was added.
