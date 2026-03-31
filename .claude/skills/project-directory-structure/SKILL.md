---
name: project-directory-structure
description: Project directory structure for ray-optics-web
---

## Project Structure

```
ray-optics-web/
├── src/                          # All application source code
│   ├── app/                      # Next.js App Router pages
│   │   └── index.md
│   ├── components/               # React UI components
│   │   ├── index.md
│   │   ├── micro/                # Minimal, single-responsibility components
│   │   │   └── index.md
│   │   ├── composite/            # Composed with micro-components
│   │   │   └── index.md
│   │   ├── container/            # Containers for state management and logic
│   │   │   └── index.md
│   │   ├── layout/               # Layout components
│   │   │   └── index.md
│   │   ├── page/                 # Page-level components
│   │   │   └── index.md
│   │   └── ui/                   # UI primitive components
│   │       └── index.md
│   ├── store/                    # Zustand global state stores
│   │   └── index.md
│   ├── workers/                  # Web Workers
│   │   ├── index.md
│   │   └── pyodide.worker.ts     # Web Worker: Pyodide init + rayoptics API
│   ├── hooks/                    # React hooks (usePyodide, useAgGridTheme, etc.)
│   │   └── index.md
│   ├── lib/                      # TypeScript types and utilities
│   │   └── index.md
│   ├── python/                   # Python utilities and modules
│   │   ├── index.md
│   │   └── src/
│   │       ├── index.md
│   │       └── rayoptics_web_utils/  # Internal Python package (rayoptics_web_utils)
│   │           ├── index.md
│   │           ├── analysis/          # Spot diagram, wavefront, Zernike, Seidel aberrations
│   │           │   └── index.md
│   │           ├── env/               # Environment and configuration management
│   │           │   └── index.md
│   │           ├── focusing/          # Lens optimization algorithms
│   │           │   └── index.md
│   │           ├── glass/             # Glass material data and selection
│   │           │   └── index.md
│   │           ├── plotting/          # Matplotlib visualization utilities
│   │           │   └── index.md
│   │           ├── raygrid/           # Ray grid generation and sampling
│   │           │   └── index.md
│   │           ├── utils/             # General utility functions
│   │           │   └── index.md
│   │           └── zernike/           # Zernike polynomial computation
│   │               └── index.md
│   └── index.md
├── scripts/                      # Build and setup shell scripts
├── docs/                         # Supplemental documentation
└── public/                       # Static assets (service worker, built wheel)
```
