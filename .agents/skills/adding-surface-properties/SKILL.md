---
name: adding-surface-properties
description: Add or change a constructional surface property (or a variant of an existing one, such as a new asphere kind) in ray-optics-web, end to end - TypeBox schema, pure descriptor (scale, reverse, RayOptics emission), prescription-grid column and modal, and optionally optimization (constant/variable/pickup) on both the TypeScript and Python sides. Use when planning, implementing, or reviewing any new `Surface` key, a new variant of a property, or making a property optimizable or explicitly not optimizable.
---

# Adding Surface Properties

Every surface property is defined in one folder under
`src/shared/lib/optical-model/surface-properties/<name>/`. The type, the
import/WebMCP schema, grid row conversion, scaling, reversal, Python export, the
worker overlay hint, the editor column and modal, and the read-only inspection
on the Optimization page all come from the registries. Tests, and in some cases
the compiler, fail when a piece is missing, so let them drive the work.

Before planning, read:
- The embedded docs in `descriptor.ts`, `registry.ts`, `uiDescriptor.ts`,
  `registry.ui.ts`, `parameterShape.ts` and `parameters.ts` in that folder.
- The `commands-for-development` and `optics-conventions` skills.
- The `rayoptics-headless-python` skill, before touching any Python.

Follow the repository's TDD, feature-branch and documentation rules.

Use `decenter/` as the reference implementation. It covers every layer: schema,
property, UI, modal, optimization, image-plane support and Python accessor.
`aspherical/` shows the variant pattern.

## Terminology

- **Surface property:** a key on `Surface` (or on the image plane).
- **Constructional parameter:** a scalar inside a property that has a
  constant, variable or pickup mode in optimization.
- **Target:** the goal of a merit-function operand only. Never call a
  constructional parameter a "target".

## Decide first

1. **Required or optional?** A required key needs a `default` in its descriptor.
   An optional key must have none (`registry.test.ts` checks this). New keys
   should almost always be `Type.Optional(...)`, so that existing saved and
   imported files stay valid.
2. **Surface only, or the image plane too?** If the image plane carries it, add
   it to `imagePrescriptionSchema` and implement `python.image`.
3. **Edited inline, or through a modal?** New structured properties use a modal
   and a `*.ui.tsx` file.
4. **Optimizable?** Either register a parameter shape for it, or add it to
   `OPTIMIZATION_OPT_OUTS` in `parameters.ts` with the reason. One of the two is
   required (`parameters.test.ts`). If unsure, ask the user. Integer and
   categorical values cannot be continuous variables.
5. **New property, or a variant of an existing one?** Changing the shape of a
   property that already exists (for example turning it into a
   `kind`-discriminated union) changes the import format. Every schema object
   rejects unknown keys, so this needs an explicit schema-versioning decision
   (see the `opticalModelSchema.ts` header). Ask the user before doing it.

## Part 1: the property (always)

Create these files in `surface-properties/<kebab-name>/`, with camelCase file
prefixes:

| File | Contents |
|---|---|
| `<name>.schema.ts` | TypeBox schema(s) with `{ additionalProperties: false }`. Use `finiteNumberSchema` and `positiveFiniteNumberSchema` from `schema/primitives.ts`, and export `Type.Static` types. Document units on each field. |
| `<name>.variants.ts` (optional) | A `satisfies Record<VariantKind, Variant>` map of per-variant facts (label, RayOptics class, coefficient orders). Labels, scaling and emission read it, so adding a variant is one entry plus a schema branch. |
| `<name>.property.ts` | A `satisfies SurfacePropertyDescriptor<"key">` object, described below. It must not import React. |
| `<name>.ui.tsx` | `"use client"`, a `satisfies SurfacePropertyUi` object, and a thin `*PropertyModal` adapter from the grid row to the modal and back to a row patch. |
| `<Name>Modal/` | The editor modal component. It must support `readOnly`, which the Optimization page uses for inspection. |

The descriptor contract (`descriptor.ts`):
- **`scale(value, factor)`:** scale linear dimensions with `scaleLinear`.
  Preserve angles, densities, orders and dimensionless values.
- **`reverse(value)`:** return the value for the same surface traversed the
  other way (sag z → −z). Work out the sign of each term; `negateNumber` avoids
  `-0`. This hook is mandatory because the asphere reversal bug came from a
  missing one. Verify against RayOptics when unsure.
- **`python.surface(surface, targetExpr)` / `python.image(value, targetExpr)`:**
  the RayOptics statements emitted after `sm.add_surface(...)`. Return `[]` when
  the value is absent. If a statement needs a RayOptics class that the fixed
  import header in `src/shared/lib/python-export/pythonScript.ts` doesn't
  import yet, add it there and update that file's doc comment.
- **`needsWavelengthOverlay?(value)`:** set this when the lens layout should
  draw per-wavelength ray fans (dispersive elements).

Wire it up:
1. Add the schema to `surfaceSchema` (and `imagePrescriptionSchema` if needed)
   in `model/opticalModelSchema.ts`. Re-export its types from
   `model/opticalModel.ts`.
2. Add one entry to `SURFACE_PROPERTIES` in `registry.ts`. Key order is the
   order of emitted Python statements, so keep `label` (the stop marker) last.
   The compiler requires an entry for every `Surface` key.
3. Add one entry to `SURFACE_PROPERTY_UIS` in `registry.ui.ts`, in grid-column
   order. Add a width to `lens-prescription-grid/columnWidths.ts`.
   `registry.ui.test.ts` requires every key to be inline or modal-backed exactly
   once. The editor grid, `SurfacePropertyModalHost`, the WebMCP key sets and
   grid row conversion pick the property up automatically.
4. On the Optimization page, add the read-only column to
   `OptimizationLensPrescriptionGrid.tsx`. Its columns are listed explicitly:
   `createSurfacePropertyColumn(key, …)`, followed by `varColumnsAfter(key)`
   when the property is optimizable.

TDD order:
1. Write schema accept/reject tests, and descriptor tests for `scale`,
   `reverse` and `python` output.
2. Run the registry tests and confirm they fail.
3. Add a modal test that covers `readOnly`.
4. Implement until everything passes.

When an example system uses the property, check its Python export output and
round trip.

## Part 2a: not optimizable

Add `<key>: "<reason>"` to `OPTIMIZATION_OPT_OUTS` in `parameters.ts`. Nothing
else is needed: no wire kind, no Python change, and the manifest fixture stays
the same.

## Part 2b: optimizable (constant / variable / pickup)

### TypeScript

1. **`<name>.optimization.ts`:** `defineParameterShape({ properties, ref,
   pickupSource, applyValue })`.
   - `ref` holds snake_case wire fields: `kind` (a `Type.Enum` of new wire
     kinds), `surface_index` (`parameterSurfaceIndexSchema`), and any
     qualifiers.
   - `pickupSource` holds pickup fields beyond `source_surface_index`, `scale`
     and `offset`.
   - `applyValue` writes a solved value through `updateSurfaceAt` (physical
     surfaces `1..N`) or `updateSurfaceOrImageAt` (`N + 1` is the image), and
     creates the property when it is absent.
2. **`parameters.ts`:** append the shape to `CONSTRUCTIONAL_PARAMETER_SHAPES`
   (wire-schema branch order). The wire types, the AJV variable/pickup schemas
   in `features/optimization/types/parameterTypes.ts` and the report types are
   all derived from it.
3. **`features/optimization/lib/parameters/parameterGroups.ts`:**
   - Add the group key to `ParameterGroupKey` and `ParameterQualifierByGroup`.
   - Add a `ParameterGroupSpec`: `kinds`, `componentKeyOf`, `components`,
     `toRef` (key order must match the wire JSON), `pickupSourceRule`, and
     optionally `qualifier` and `assertCompatible`.
   - Register it in `PARAMETER_GROUPS` (emission order).
   Store state, the config builders and the config inverse are generic over the
   groups.
4. **`features/optimization/components/ParameterModeModal/parameterModeUi.tsx`:**
   add one `PARAMETER_MODE_UI` entry with title, component labels, element ids,
   pickup source options, the qualifier selector and `varColumn`. Its
   `satisfies` clause requires the entry.
5. **Parity fixture:** regenerate it with
   `UPDATE_PARAMETER_MANIFEST=1 npx jest parameterManifest`, then commit
   `src/python/tests/fixtures/constructional_parameters.json`.

### Python (`src/python/src/rayoptics_web_utils/optimization/`)

Activate the venv first, then follow `rayoptics-headless-python`: no GUI imports,
and use `from __future__ import annotations`.

1. **`_types.py`:**
   - Add the kinds to `ConstructionalParameterKind`.
   - Add a `<Name>Ref(TypedDict)` whose fields match the TypeScript `ref`.
   - Add `<Name>Variable(<Name>Ref, VariableBounds)` and
     `<Name>Pickup(<Name>Ref, PickupTransform)`, with any extra pickup-source
     fields.
   - Extend the `ParameterRef`, `VariableConfig` and `PickupConfig` unions.
2. **`parameters/<snake_name>.py`:** add `<NAME>_ACCESSOR =
   ParameterAccessor(kinds=..., read=..., write=...)`.
   - `write` materializes missing RayOptics structures.
   - A pickup source read with `materialize: False` must not mutate the model.
   - Pass `natural_unit=...` when the parameter shapes the sag and its useful
     range is far from 1. It returns the step, in optimizer units (curvature
     for radius), that moves the edge sag by about one model unit (for an rᵖ
     term: `edge_sag_unit(opm, surface_index, p)`). Least squares divides
     unbounded variables by this unit; without it, SciPy's finite-difference
     step and `xtol` test can't move tiny coefficients. It must not mutate the
     model. Other properties keep the default `1.0`.
   - Register the accessor in the tuple that builds `PARAMETER_ACCESSORS` in
     `parameters/__init__.py`.
3. **Kind-specific code that is not registry-driven yet** (update it when the
   new kinds or qualifiers need it):
   - `config.py`: the accepted-kind sets in variable/pickup normalization, the
     qualifier copying, and `validate_target_for_kind`.
   - `problem.py`: the qualifier copying when it builds pickup source and
     variable entries. Internal transforms such as radius ↔ curvature are
     handled there too.
4. **Tests:** cover read/write/materialize/conflict in
   `tests/rayoptics_web_utils/optimization/test_parameters.py`. The parity tests
   there fail until the kinds, accessors and TypedDict fields match the fixture.
   Add an end-to-end optimization test when the solver path changes.
5. **Version and checks:**
   - Bump the `rayoptics_web_utils` patch version in `pyproject.toml`,
     `pyproject.toml.md`, and the wheel URL and doc comment in
     `src/workers/pyodide.worker.ts`.
   - Before building a wheel locally, `rm -rf src/python/build`, so deleted
     modules don't linger in it.
   - CI, the local venv, and Pyodide all run Python 3.14, so no separate
     interpreter check is needed.

## Done when

- `npm run type-check`, `npm run lint`, `npm run format`, `npm run test`,
  `npm run type-check:python`, `bash scripts/run-python-tests.sh` and
  `npm run build` all pass (see `commands-for-development`).
- Embedded docs are updated on every symbol you changed, including the
  module headers that list properties (`pythonScript.ts`,
  `lensPrescriptionGridColumns.tsx`, `LensPrescriptionContainer.tsx`,
  `OptimizationInspectionModals.tsx`).
- Manual check: edit the property in the editor, scale and reverse a range that
  contains it, export the Python script, and import a saved file. If it is
  optimizable, also run an optimization with it as a variable and as a pickup,
  then apply the result.
