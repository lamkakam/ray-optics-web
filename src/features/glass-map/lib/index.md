# `features/glass-map/lib/`

Runtime helper modules for the Glass Map feature.

Keep pure functions, rendering lookup tables, and other executable feature logic here. Type definitions and type-derived constants stay in `features/glass-map/types/`.

## Files

- [glassMap.ts](./glassMap.ts) — Glass map runtime helpers and catalog color map
- [glassCatalogLoader.ts](./glassCatalogLoader.ts) — Pyodide-backed glass catalog loader with in-flight request dedupe only
