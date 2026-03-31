# `lib/`

Core domain types, utilities, and helpers.

## Domain & Types

- [opticalModel.ts](./opticalModel.ts.md) — Core TypeScript types for optical system: OpticalModel, Surface, OpticalSpecs, FocusingResult, SeidelData
- [gridTypes.ts](./gridTypes.ts.md) — Type definitions for lens prescription grid rows and columns
- [gridTransform.ts](./gridTransform.ts.md) — Utilities for transforming between surface data and grid rows

## Analysis & Plotting

- [plotFunctions.ts](./plotFunctions.ts.md) — Functions for creating and displaying optical analysis plots
- [zernikeData.ts](./zernikeData.ts.md) — Zernike polynomial data and coefficients for wavefront analysis
- [fraunhoferLines.ts](./fraunhoferLines.ts.md) — Wavelength data for F, d, C Fraunhofer lines

## System & Schema

- [importSchema.ts](./importSchema.ts.md) — Zod schema for validating imported lens prescription files
- [exampleSystems.ts](./exampleSystems.ts.md) — Pre-configured example optical systems (e.g., Cooke Triplet)
- [appView.ts](./appView.ts.md) — Enumeration and constants for different app views/pages
- [glassMap.ts](./glassMap.ts.md) — Glass material data and Abbe diagram coordinates

## UI & Styling

- [theme.ts](./theme.ts.md) — Theme configuration (colors, spacing, breakpoints) for light/dark modes
- [pythonScript.ts](./pythonScript.ts.md) — Utilities for generating and formatting Python scripts for the Python modal
- [apertureFlag.ts](./apertureFlag.ts.md) — Utilities for handling automatic vs. manual aperture settings
- [swCachePolicy.ts](./swCachePolicy.ts.md) — Service worker cache strategy configuration
