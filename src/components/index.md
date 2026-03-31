# `components/`

Top-level app shell and theme setup.

## Components

- [ServiceWorkerRegistrar.tsx](./ServiceWorkerRegistrar.tsx.md) — Registers the service worker for offline caching
- [ThemeProvider.tsx](./ThemeProvider.tsx.md) — Provides theme context (light/dark mode) to the app

## Subdirectories

- [micro/](./micro/index.md) — Minimal, single-responsibility UI primitives
- [composite/](./composite/index.md) — Composed features built from micro-components
- [container/](./container/index.md) — State management containers (Zustand integration)
- [layout/](./layout/index.md) — App layout wrapper
- [page/](./page/index.md) — Page-level views (LensEditor, GlassMap, Settings, etc.)
- [ui/](./ui/index.md) — Design tokens and style utilities
