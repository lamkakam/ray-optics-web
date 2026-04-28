---
name: project-directory-structure
description: Project directory structure for ray-optics-web
---

## Project Structure

- Access the `index.md` under each directory for brief explanations of the purpose and contents of that directory.


```
ray-optics-web/
├── .claude/                      # Claude Code configuration and skills
├── .github/                      # GitHub workflows and templates
├── src/                          # All application source code
│   ├── app/                      # Next.js App Router pages, layouts, and app shell
│   │   ├── about/               # `/about` route
│   │   ├── glass-map/           # `/glass-map` route
│   │   ├── optimization/        # `/optimization` route
│   │   ├── privacy-policy/      # `/privacy-policy` route
│   │   ├── settings/            # `/settings` route
│   │   ├── __tests__/           # Tests for app routes and page modules
│   │   ├── AppShell.tsx         # Shared client shell around routed content
│   │   ├── AppShellContext.tsx  # Shared Pyodide/shell context for routed pages
│   │   ├── layout.tsx           # Root App Router layout
│   │   ├── page.tsx             # `/` route
│   │   └── index.md
│   │
│   ├── features/                 # Domain feature modules (co-located by feature)
│   │   ├── lens-editor/          # Main lens design workflow
│   │   │   ├── components/       # Composite + container + domain-cell components
│   │   │   │   └── index.md
│   │   │   ├── lib/              # Lens-editor helpers and view models
│   │   │   │   ├── __tests__/
│   │   │   │   └── index.md
│   │   │   ├── providers/        # Lens-editor context providers
│   │   │   ├── stores/           # lensEditorStore, specsConfiguratorStore
│   │   │   │   ├── __tests__/
│   │   │   │   └── index.md
│   │   │   ├── types/            # Lens-editor domain and UI types
│   │   │   ├── __tests__/        # Tests for LensEditor page
│   │   │   ├── LensEditor.tsx    # Page-level entry point
│   │   │   └── index.md
│   │   ├── analysis/             # Analysis plots and aberrations
│   │   │   ├── components/       # AnalysisPlotView, AnalysisPlotContainer
│   │   │   │   └── index.md
│   │   │   ├── lib/              # Chart factories, palette helpers, and tests
│   │   │   │   ├── analysisChartPalette/
│   │   │   │   ├── createAnalysisChartComponent/
│   │   │   │   └── index.md
│   │   │   ├── providers/        # Analysis context providers
│   │   │   ├── stores/           # analysisDataStore, analysisPlotStore, lensLayoutImageStore
│   │   │   │   └── index.md
│   │   │   ├── types/            # Analysis domain and chart types
│   │   │   └── index.md
│   │   ├── glass-map/            # Interactive Abbe diagram
│   │   │   ├── components/       # GlassScatterPlot, GlassDetailPanel, GlassMapControls
│   │   │   │   └── index.md
│   │   │   ├── lib/              # Glass-map helpers and tests
│   │   │   │   └── index.md
│   │   │   ├── stores/           # glassMapStore
│   │   │   │   └── index.md
│   │   │   ├── providers/        # GlassMapStoreProvider (context provider for glass map store)
│   │   │   │   └── index.md
│   │   │   ├── types/            # Glass-map domain and UI types
│   │   │   ├── __tests__/        # Tests for GlassMapView page
│   │   │   ├── GlassMapView.tsx  # Page-level entry point
│   │   │   └── index.md
│   │   ├── optimization/         # Optimization workflow
│   │   │   ├── components/       # Optimization UI panels, tabs, grids, and modals
│   │   │   │   └── index.md
│   │   │   ├── lib/              # Optimization helpers, metadata, and view models
│   │   │   │   └── index.md
│   │   │   ├── providers/        # OptimizationStoreProvider
│   │   │   │   └── index.md
│   │   │   ├── stores/           # optimizationStore
│   │   │   │   └── index.md
│   │   │   ├── types/            # Optimization algorithm, modal, operand, UI, variable, and worker types
│   │   │   │   └── index.md
│   │   │   ├── __tests__/        # Tests for OptimizationPage
│   │   │   ├── OptimizationPage.tsx # Page-level entry point
│   │   │   └── index.md
│   │   └── index.md
│   │
│   ├── shared/                   # Code shared across all features
│   │   ├── components/
│   │   │   ├── primitives/       # Generic UI primitives, each in a directory-per-component group
│   │   │   │   └── index.md
│   │   │   ├── layout/           # Layout level components grouped by component
│   │   │   │   └── index.md
│   │   │   └── providers/        # Shared component providers grouped by provider
│   │   │       └── index.md
│   │   ├── tokens/               # styleTokens.ts, theme.ts (design system constants)
│   │   │   └── index.md
│   │   ├── hooks/                # useAgGridTheme, useScreenBreakpoint, useServiceWorkerRegistration, usePyodide, etc.
│   │   │   ├── __tests__/
│   │   │   └── index.md
│   │   ├── lib/
│   │   │   ├── chart-formatting/ # Shared echart value formatting helpers
│   │   │   │   └── index.md
│   │   │   ├── config/           # swCachePolicy
│   │   │   │   └── index.md
│   │   │   ├── data/             # fraunhoferLines, exampleSystems
│   │   │   │   └── index.md
│   │   │   ├── lens-prescription-grid/ # Shared grid mapping, schema, and transformation logic for lens prescription grid instances
│   │   │   │   ├── lib/
│   │   │   │   │   └── index.md
│   │   │   │   ├── types/
│   │   │   │   │   └── index.md
│   │   │   │   ├── __tests__/
│   │   │   │   └── index.md
│   │   │   ├── schemas/          # importSchema (Zod/AJV validation)
│   │   │   │   └── index.md
│   │   │   ├── types/            # opticalModel
│   │   │   │   └── index.md
│   │   │   ├── utils/            # pythonScript, apertureFlag
│   │   │   │   └── index.md
│   │   │   └── index.md
│   │   └── index.md
│   │
│   ├── workers/                  # Web Workers + factory
│   │   ├── __test__/             # Tests for workers
│   │   ├── index.md
│   │   ├── pyodide.worker.ts     # Pyodide Web Worker: init + rayoptics API
│   │   └── createPyodideWorker.ts # Worker factory (Comlink wrap)
│   ├── python/                   # Internal Python package (rayoptics_web_utils)
│   │   ├── tests/
│   │   ├── index.md
│   │   └── src/
│   │       └── rayoptics_web_utils/
│   │           ├── analysis/     # Spot diagram, wavefront, Zernike, Seidel
│   │           ├── data/         # Bundled package data
│   │           ├── env/          # Environment and configuration
│   │           ├── focusing/     # Lens focusing algorithms
│   │           ├── glass/        # Glass material data and selection
│   │           ├── optimization/ # Optimization orchestration and solvers
│   │           ├── plotting/     # Matplotlib visualisation utilities
│   │           ├── raygrid/      # Ray grid generation and sampling
│   │           ├── utils/        # General utilities
│   │           └── zernike/      # Zernike polynomial computation
│   ├── __mocks__/                # Jest mocks (Comlink, Pyodide, ag-grid, visx)
│   │   └── index.md
│   ├── __tests__/                # Top-level smoke tests
│   │   └── index.md
│   ├── e2e/                      # Playwright end-to-end tests
│   │   └── index.md
│   └── index.md
├── scripts/                      # Build and setup shell scripts
├── docs/                         # Supplemental documentation
└── public/                       # Static assets (service worker, built wheel)
```
