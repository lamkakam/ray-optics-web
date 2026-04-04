# `shared/components/providers/`

App-level React providers and registrars for global concerns such as theme, service worker registration, and shared injected runtime data.

## Components

- [ThemeProvider.tsx](./ThemeProvider.tsx.md) — Provides theme context (light/dark mode) to the app
- [ServiceWorkerRegistrar.tsx](./ServiceWorkerRegistrar.tsx.md) — Registers the service worker for offline caching
- [GlassCatalogProvider.tsx](./GlassCatalogProvider.tsx.md) — Injects shared worker-backed glass catalog data into the app tree
