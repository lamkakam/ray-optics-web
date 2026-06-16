# `features/optimization/lib/operandMetadata.ts`

## Purpose

Defines the shared optimization operand metadata consumed by the store and operand/evaluation UI.

## Exports

- `OPTIMIZATION_OPERAND_METADATA` — ordered list of all supported operand kinds
- `getOptimizationOperandMetadata(kind)` — lookup helper by kind

## Key Conventions

- `label` is the user-facing operand name shown in selectors and evaluation tables.
- `requiresTarget` controls whether the UI and config builder require a numeric `target`.
- `defaultTarget` is only present for targeted operands.
- Type definitions for operand metadata and options live in `features/optimization/types/optimizationOperandTypes.ts`.
- `defaultOptions` carries caller-owned default operand options when an operand needs them.
- `expandsByFieldAndWavelength` determines whether store config assembly attaches field and wavelength weight arrays.
- OPD Difference variants are targeted scalar operands with default target `"0"` and field/wavelength expansion. The combined operand keeps both fan axes, while `opd_difference_tangential` and `opd_difference_sagittal` select one axis.
- Ray Fan variants are target-less vector operands with default `options.num_rays = 21` and field/wavelength expansion. The combined operand contributes both axes, while `ray_fan_tangential` and `ray_fan_sagittal` select one axis.
- `getNominalResidualCountPerSample(options)` is used for deterministic `lm` pre-validation. `ray_fan` contributes `num_rays * 2` residuals per field/wavelength, while axis-specific Ray Fan operands contribute `num_rays`.
