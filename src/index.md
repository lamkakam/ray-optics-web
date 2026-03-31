# `src/`

All application source code for ray-optics-web.

## Frontend

- [app/](./app/index.md) — Next.js App Router pages
- [components/](./components/index.md) — React UI components (micro, composite, container, layout, page)
- [hooks/](./hooks/index.md) — React hooks for shared logic
- [store/](./store/index.md) — Zustand global state stores
- [lib/](./lib/index.md) — Core types, utilities, and schemas
- [workers/](./workers/index.md) — Web Workers (Pyodide computation)

## Backend (Python)

- [python/](./python/index.md) — Python package for RayOptics integration
  - [python/src/rayoptics_web_utils/](./python/src/rayoptics_web_utils/index.md) — Optical utilities

## Static Assets & Tests

- [data/](./data/) — Static data files (glass catalogs, etc.)
- [e2e/](./e2e/) — Playwright end-to-end tests
- [__tests__/](./), [__mocks__/](./), [__tests__/](./python/src/__tests__/) — Tests and mocks
