---
name: project-tech-stack-and-architecture
description: Project tech stack, architecture, known issues and gotchas for ray-optics-web
---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Testing | jest, React Testing Library, Playwright for E2E tests |
| UI | React + TypeScript |
| UI global state management | Zustand |
| Styling | Tailwind CSS |
| Python runtime | Pyodide v0.27.7 |
| Worker communication | Comlink |
| Internal Python package | in `<project-root>/python/` |
| Package manager | npm |


## Architecture

### Core Concept: Pyodide in a Web Worker

RayOptics computations are CPU-intensive. **Never run Pyodide on the main thread.** The version of Pyodide must be exactly v0.27.7.

### Worker Lifecycle

1. Web worker is initialized once as a singleton at app startup. Worker loads Pyodide, then installs `rayoptics` via `micropip`.
2. React component communicates with the worker through a typed Comlink proxy.
3. RayOptics under Pyodide env in the web worker does all the computations. Result is serialized and returned via `json.dumps`.
4. The worker parses the serialized result into a TypeScript object.
5. React component receives the object and renders the UI accordingly. The web worker is still alive awaiting further requests initiated from a React component.

### Key Architectural Decisions

- **Singleton worker**: Never create more than one Pyodide instance.
- **Comlink for RPC**: Never use raw `postMessage`. Use Comlink to expose worker functions as async calls.
- **No SSR for worker-dependent components**: ALL components must be rendered client-side only (`"use client"` + `dynamic` with `ssr: false` if needed).
- **Service worker caching**: Cache the Pyodide WASM bundle and `rayoptics` wheel to avoid re-downloading on every visit.

## Known Constraints & Gotchas

- **Web Worker in Next.js**: Next.js requires the `new Worker(new URL(..., import.meta.url))` pattern for correct bundling. **Do not use string paths.**
- **`"use client"` boundary**: The Pyodide hook and all components that use it must be Client Components.