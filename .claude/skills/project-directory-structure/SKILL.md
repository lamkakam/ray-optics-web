---
name: project-directory-structure
description: Project directory structure for ray-optics-web
---

## Project Structure

```
ray-optics-web/
├── src/                          # All application source code
│   ├── app/                      # Next.js App Router pages
│   │   └── __tests__/
│   ├── components/               # React UI components
│   │   ├── micro/                # Minimal, single-responsibility components
│   │   ├── composite/            # Composed with micro-components
│   │   └── container/            # Containers for state management and logic
│   ├── store/                    # Zustand global state stores
│   ├── workers/
│   │   └── pyodide.worker.ts     # Web Worker: Pyodide init + rayoptics API
│   ├── hooks/                    # React hooks (usePyodide, useAgGridTheme, etc.)
│   ├── lib/                      # TypeScript types and utilities
│   ├── python/
│   │   ├── src/rayoptics_web_utils/  # Internal Python package (rayoptics_web_utils)
│   │   └── .venv/                # the venv for installed Python deps
│   ├── e2e/                      # Playwright end-to-end tests
│   ├── __tests__/                # Root-level smoke tests
│   ├── __mocks__/                # Jest mocks (comlink, pyodide, ag-grid)
│   └── data/                     # Static data (glass catalogs)
├── scripts/                      # Build and setup shell scripts
├── docs/                         # Supplemental documentation
└── public/                       # Static assets (service worker, built wheel)
```
