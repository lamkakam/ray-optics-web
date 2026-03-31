# `src/`

All application source code for ray-optics-web.

## App Shell

- [app/](./app/index.md) — Next.js App Router pages and configuration
- [app/pages/](./app/pages/index.md) — Static informational page components (About, Settings, Privacy)

## Feature Modules

- [features/lens-editor/](./features/lens-editor/index.md) — Main lens design and editing workflow
- [features/analysis/](./features/analysis/index.md) — Optical analysis plots and aberration data
- [features/glass-map/](./features/glass-map/index.md) — Interactive Abbe diagram / glass material browser

## Shared (cross-feature)

- [shared/components/primitives/](./shared/components/primitives/index.md) — Generic UI primitives
- [shared/components/layout/](./shared/components/layout/index.md) — App layout and navigation shell
- [shared/components/providers/](./shared/components/providers/index.md) — React providers
- [shared/tokens/](./shared/tokens/index.md) — Design tokens and theme constants
- [shared/hooks/](./shared/hooks/index.md) — Shared React hooks
- [shared/lib/types/](./shared/lib/types/index.md) — Core domain TypeScript types
- [shared/lib/data/](./shared/lib/data/index.md) — Static data constants
- [shared/lib/utils/](./shared/lib/utils/index.md) — Utility functions
- [shared/lib/schemas/](./shared/lib/schemas/index.md) — Runtime validation schemas
- [shared/lib/config/](./shared/lib/config/index.md) — App-wide configuration

## Worker & Runtime

- [hooks/usePyodide.ts](./hooks/usePyodide.ts.md) — Hook to initialise and access the Pyodide worker
- [workers/](./workers/index.md) — Pyodide Web Worker + factory

## Tests & Mocks

- [__mocks__/](./mocks/index.md) — Jest mocks (Comlink, Pyodide, ag-grid, visx)
- [__tests__/](./tests/index.md) — Top-level smoke tests
- [e2e/](./e2e/index.md) — Playwright end-to-end tests

## Static Data

- [data/](./data/) — Static data files (glass catalogs, etc.)
- [python/](./python/index.md) — Internal Python package (rayoptics_web_utils)
