---
name: project-directory-structure
description: Project directory structure for ray-optics-web
---

## Project Structure

```
ray-optics-web/
├── .claude/                      # Claude Code configuration and skills
├── .github/                      # GitHub workflows and templates
├── src/                          # All application source code
│   ├── app/                      # Next.js App Router pages
│   │   ├── __tests__/            # Tests for app pages
│   │   └── index.md
│   ├── components/               # React UI components
│   │   ├── __tests__/            # Tests for components
│   │   ├── index.md
│   │   ├── micro/                # Minimal, single-responsibility components
│   │   │   ├── __tests__/        # Tests for micro-components
│   │   │   └── index.md
│   │   ├── composite/            # Composed with micro-components
│   │   │   ├── __tests__/        # Tests for composite components
│   │   │   └── index.md
│   │   ├── container/            # Containers for state management and logic
│   │   │   ├── __tests__/        # Tests for container components
│   │   │   └── index.md
│   │   ├── layout/               # Layout components
│   │   │   ├── __tests__/        # Tests for layout components
│   │   │   └── index.md
│   │   ├── page/                 # Page-level components
│   │   │   ├── __tests__/        # Tests for page components
│   │   │   └── index.md
│   │   └── ui/                   # UI primitive components
│   │       ├── __tests__/        # Tests for UI components
│   │       └── index.md
│   ├── store/                    # Zustand global state stores
│   │   ├── __tests__/            # Tests for stores
│   │   └── index.md
│   ├── workers/                  # Web Workers
│   │   ├── __tests__/            # Tests for workers
│   │   ├── index.md
│   │   └── pyodide.worker.ts     # Web Worker: Pyodide init + rayoptics API
│   ├── hooks/                    # React hooks (usePyodide, useAgGridTheme, etc.)
│   │   ├── __tests__/            # Tests for hooks
│   │   └── index.md
│   ├── lib/                      # TypeScript types and utilities
│   │   ├── __tests__/            # Tests for lib utilities
│   │   └── index.md
│   ├── python/                   # Python utilities and modules
│   │   ├── tests/            # Tests for Python modules
│   │   ├── index.md
│   │   └── src/
│   │       ├── __tests__/        # Tests for src utilities
│   │       ├── index.md
│   │       └── rayoptics_web_utils/  # Internal Python package (rayoptics_web_utils)
│   │           ├── __tests__/            # Tests for rayoptics_web_utils
│   │           ├── index.md
│   │           ├── analysis/          # Spot diagram, wavefront, Zernike, Seidel aberrations
│   │           │   ├── __tests__/     # Tests for analysis module
│   │           │   └── index.md
│   │           ├── env/               # Environment and configuration management
│   │           │   ├── __tests__/     # Tests for env module
│   │           │   └── index.md
│   │           ├── focusing/          # Lens optimization algorithms
│   │           │   ├── __tests__/     # Tests for focusing module
│   │           │   └── index.md
│   │           ├── glass/             # Glass material data and selection
│   │           │   ├── __tests__/     # Tests for glass module
│   │           │   └── index.md
│   │           ├── plotting/          # Matplotlib visualization utilities
│   │           │   ├── __tests__/     # Tests for plotting module
│   │           │   └── index.md
│   │           ├── raygrid/           # Ray grid generation and sampling
│   │           │   ├── __tests__/     # Tests for raygrid module
│   │           │   └── index.md
│   │           ├── utils/             # General utility functions
│   │           │   ├── __tests__/     # Tests for utils module
│   │           │   └── index.md
│   │           └── zernike/           # Zernike polynomial computation
│   │               ├── __tests__/     # Tests for zernike module
│   │               └── index.md
│   ├── __mocks__/                # Jest mocks (Comlink, Pyodide, etc.)
│   │   └── index.md
│   ├── __tests__/                # Jest unit and integration tests
│   │   └── index.md
│   ├── e2e/                      # End-to-end tests
│   │   └── index.md
│   └── index.md
├── scripts/                      # Build and setup shell scripts
├── docs/                         # Supplemental documentation
└── public/                       # Static assets (service worker, built wheel)
```
