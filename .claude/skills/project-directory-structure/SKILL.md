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
│   ├── app/                      # Next.js App Router (thin routing shell)
│   │   ├── pages/                # Static informational page components
│   │   │   ├── __tests__/        # Tests for page components
│   │   │   └── index.md
│   │   ├── __tests__/            # Tests for app routes
│   │   └── index.md
│   │
│   ├── features/                 # Domain feature modules (co-located by feature)
│   │   ├── lens-editor/          # Main lens design workflow
│   │   │   ├── components/       # Composite + container + domain-cell components
│   │   │   │   ├── __tests__/
│   │   │   │   └── index.md
│   │   │   ├── stores/           # lensEditorStore, specsConfigurerStore
│   │   │   │   ├── __tests__/
│   │   │   │   └── index.md
│   │   │   ├── __tests__/        # Tests for LensEditor page
│   │   │   ├── LensEditor.tsx    # Page-level entry point
│   │   │   └── index.md
│   │   ├── analysis/             # Analysis plots and aberrations
│   │   │   ├── components/       # AnalysisPlotView, AnalysisPlotContainer
│   │   │   │   ├── __tests__/
│   │   │   │   └── index.md
│   │   │   ├── stores/           # analysisDataStore, analysisPlotStore, lensLayoutImageStore
│   │   │   │   ├── __tests__/
│   │   │   │   └── index.md
│   │   │   └── index.md
│   │   ├── glass-map/            # Interactive Abbe diagram
│   │   │   ├── components/       # GlassScatterPlot, GlassDetailPanel, GlassMapControls
│   │   │   │   ├── __tests__/
│   │   │   │   └── index.md
│   │   │   ├── stores/           # glassMapStore
│   │   │   │   ├── __tests__/
│   │   │   │   └── index.md
│   │   │   ├── __tests__/        # Tests for GlassMapView page
│   │   │   ├── GlassMapView.tsx  # Page-level entry point
│   │   │   └── index.md
│   │   └── index.md
│   │
│   ├── shared/                   # Code shared across all features
│   │   ├── components/
│   │   │   ├── primitives/       # Generic UI primitives (Button, Input, Modal, etc.)
│   │   │   │   ├── __tests__/
│   │   │   │   └── index.md
│   │   │   ├── layout/           # Layout.tsx, SideNav, BottomDrawer
│   │   │   │   ├── __tests__/
│   │   │   │   └── index.md
│   │   │   └── providers/        # ThemeProvider, ServiceWorkerRegistrar
│   │   │       └── index.md
│   │   ├── tokens/               # styleTokens.ts, theme.ts (design system constants)
│   │   │   └── index.md
│   │   ├── hooks/                # useAgGridTheme, useScreenBreakpoint, useServiceWorkerRegistration
│   │   │   ├── __tests__/
│   │   │   └── index.md
│   │   └── lib/
│   │       ├── types/            # opticalModel, gridTypes, appView, glassMap, zernikeData
│   │       │   ├── __tests__/
│   │       │   └── index.md
│   │       ├── data/             # fraunhoferLines, exampleSystems
│   │       │   ├── __tests__/
│   │       │   └── index.md
│   │       ├── utils/            # gridTransform, plotFunctions, pythonScript, apertureFlag
│   │       │   ├── __tests__/
│   │       │   └── index.md
│   │       ├── schemas/          # importSchema (Zod/AJV validation)
│   │       │   └── index.md
│   │       └── config/           # swCachePolicy
│   │           ├── __tests__/
│   │           └── index.md
│   │
│   ├── hooks/                    # usePyodide (worker lifecycle hook — app-wide)
│   │   ├── __tests__/
│   │   └── index.md
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
│   │           ├── env/          # Environment and configuration
│   │           ├── focusing/     # Lens optimisation algorithms
│   │           ├── glass/        # Glass material data and selection
│   │           ├── plotting/     # Matplotlib visualisation utilities
│   │           ├── raygrid/      # Ray grid generation and sampling
│   │           ├── utils/        # General utilities
│   │           └── zernike/      # Zernike polynomial computation
│   ├── data/                     # Static data files (glass catalogs, etc.)
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
