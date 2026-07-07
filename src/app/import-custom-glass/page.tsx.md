# `app/import-custom-glass/page.tsx`

## Purpose
Next.js App Router entry for `/import-custom-glass`.

## Behavior
- Client-only route.
- Dynamically loads `features/import-custom-glass/ImportCustomGlassPage` with SSR disabled because it depends on browser APIs, the app shell worker context, and Zustand client state.
