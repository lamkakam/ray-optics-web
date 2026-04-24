# `features/optimization/lib/operandMetadata.ts`

## Purpose

Defines the shared optimization operand metadata consumed by the store and operand/evaluation UI.

## Exports

- `OptimizationOperandMetadata` — metadata shape for one operand kind
- `OPTIMIZATION_OPERAND_METADATA` — ordered list of all supported operand kinds
- `getOptimizationOperandMetadata(kind)` — lookup helper by kind

## Key Conventions

- `label` is the user-facing operand name shown in selectors and evaluation tables.
- `requiresTarget` controls whether the UI and config builder require a numeric `target`.
- `defaultTarget` is only present for targeted operands.
- `defaultOptions` carries caller-owned default operand options when an operand needs them.
- `expandsByFieldAndWavelength` determines whether store config assembly attaches field and wavelength weight arrays.
- `getNominalResidualCountPerSample(options)` is used for deterministic `lm` pre-validation. `ray_fan` defaults to `options.num_rays = 21` and contributes `num_rays * 2` residuals per field/wavelength.
