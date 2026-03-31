---
name: project-directory-structure
description: Project directory structure for ray-optics-web
---

## Project Structure

```
ray-optics-web/
├── src/                          # All application source code
│   ├── app/                      # Next.js App Router pages
│   │   └── [index.md](../../src/app/index.md)
│   ├── components/               # React UI components
│   │   ├── [index.md](../../src/components/index.md)
│   │   ├── micro/                # Minimal, single-responsibility components
│   │   │   └── [index.md](../../src/components/micro/index.md)
│   │   ├── composite/            # Composed with micro-components
│   │   │   └── [index.md](../../src/components/composite/index.md)
│   │   ├── container/            # Containers for state management and logic
│   │   │   └── [index.md](../../src/components/container/index.md)
│   │   ├── layout/               # Layout components
│   │   │   └── [index.md](../../src/components/layout/index.md)
│   │   ├── page/                 # Page-level components
│   │   │   └── [index.md](../../src/components/page/index.md)
│   │   └── ui/                   # UI primitive components
│   │       └── [index.md](../../src/components/ui/index.md)
│   ├── store/                    # Zustand global state stores
│   │   └── [index.md](../../src/store/index.md)
│   ├── workers/                  # Web Workers
│   │   ├── [index.md](../../src/workers/index.md)
│   │   └── pyodide.worker.ts     # Web Worker: Pyodide init + rayoptics API
│   ├── hooks/                    # React hooks (usePyodide, useAgGridTheme, etc.)
│   │   └── [index.md](../../src/hooks/index.md)
│   ├── lib/                      # TypeScript types and utilities
│   │   └── [index.md](../../src/lib/index.md)
│   ├── python/                   # Python utilities and modules
│   │   ├── [index.md](../../src/python/index.md)
│   │   └── src/
│   │       ├── [index.md](../../src/python/src/index.md)
│   │       └── rayoptics_web_utils/  # Internal Python package (rayoptics_web_utils)
│   │           ├── [index.md](../../src/python/src/rayoptics_web_utils/index.md)
│   │           ├── analysis/
│   │           │   └── [index.md](../../src/python/src/rayoptics_web_utils/analysis/index.md)
│   │           ├── env/
│   │           │   └── [index.md](../../src/python/src/rayoptics_web_utils/env/index.md)
│   │           ├── focusing/
│   │           │   └── [index.md](../../src/python/src/rayoptics_web_utils/focusing/index.md)
│   │           ├── glass/
│   │           │   └── [index.md](../../src/python/src/rayoptics_web_utils/glass/index.md)
│   │           ├── plotting/
│   │           │   └── [index.md](../../src/python/src/rayoptics_web_utils/plotting/index.md)
│   │           ├── raygrid/
│   │           │   └── [index.md](../../src/python/src/rayoptics_web_utils/raygrid/index.md)
│   │           ├── utils/
│   │           │   └── [index.md](../../src/python/src/rayoptics_web_utils/utils/index.md)
│   │           └── zernike/
│   │               └── [index.md](../../src/python/src/rayoptics_web_utils/zernike/index.md)
│   └── [index.md](../../src/index.md)
├── scripts/                      # Build and setup shell scripts
├── docs/                         # Supplemental documentation
└── public/                       # Static assets (service worker, built wheel)
```
