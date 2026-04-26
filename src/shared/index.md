# `shared/`

Cross-feature shared code. Nothing in `shared/` imports from `features/`.

## Subdirectories

- [components/primitives/](./components/primitives/index.md) — Generic UI primitives (Button, Modal, Input, etc.)
- [components/layout/](./components/layout/index.md) — App layout and navigation shell
- [components/providers/](./components/providers/index.md) — React providers (ThemeProvider, ServiceWorkerRegistrar)
- [tokens/](./tokens/index.md) — Design tokens and theme constants
- [hooks/](./hooks/index.md) — Shared React hooks (AG Grid theme, screen breakpoint, service worker)
- [lib/](./lib/index.md) — Shared domain logic, config, schemas, data, and utilities
- [lib/types/](./lib/types/index.md) — Core domain TypeScript types
- [lib/data/](./lib/data/index.md) — Static data constants
- [lib/lens-prescription-grid/](./lib/lens-prescription-grid/index.md) — Shared AG Grid config, cells, and column builders for lens prescription tables
- [lib/utils/](./lib/utils/index.md) — Utility functions and transformations
- [lib/schemas/](./lib/schemas/index.md) — Runtime validation schemas
- [lib/config/](./lib/config/index.md) — App-wide configuration
