# `app/`

Next.js App Router pages and configuration.

## Structure

- [layout.tsx](./layout.tsx) — Root server layout with metadata and global providers
- [AppShell.tsx](./AppShell.tsx) — Shared client shell wrapped around all routed content
- [AppShellContext.tsx](./AppShellContext.tsx) — Context exposing shared Pyodide and shell UI state to route pages
- [UnappliedOptimizationResultModal.tsx](./UnappliedOptimizationResultModal.tsx) — App-shell warning for leaving Optimization with an unapplied optimized model
- [page.tsx](./page.tsx) — Lens Editor route (`/`)
- [glass-map/page.tsx](./glass-map/page.tsx) — Glass Map route (`/glass-map`)
- [settings/page.tsx](./settings/page.tsx) — Settings route (`/settings`)
- [privacy-policy/page.tsx](./privacy-policy/page.tsx) — Privacy Policy route (`/privacy-policy`)
- [about/page.tsx](./about/page.tsx) — About route (`/about`)
