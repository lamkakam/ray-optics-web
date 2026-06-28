# `shared/components/providers/`

App-level React providers and registrars for global concerns such as theme, service worker registration, and shared injected runtime data.

## Components

- [ThemeProvider.tsx](./ThemeProvider/ThemeProvider.tsx.md) — Provides theme context (light/dark mode) to the app
- [ImagePointProvider.tsx](./ImagePointProvider/ImagePointProvider.tsx.md) — Provides app-wide Image point selection and persistence
- [ServiceWorkerRegistrar.tsx](./ServiceWorkerRegistrar/ServiceWorkerRegistrar.tsx.md) — Registers the service worker for offline caching
- [GlassCatalogProvider.tsx](./GlassCatalogProvider/GlassCatalogProvider.tsx.md) — Injects shared worker-backed glass catalog data into the app tree
