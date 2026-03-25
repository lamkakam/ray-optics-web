# CLAUDE.md

## Project Overview

**ray-optics-web** is a web-based GUI for RayOptics. It is ALL CLIENT SIDE. NO BACKEND SERVER.

## Rules
```xml
<meta_rules>
  <rule_1>
    Always display all meta_rules, all safety_rules and all behavioral_rules
  </rule_1>
</meta_rules>
<safety_rules>
  <rule_1>
    Before working on files under `python/`, always use venv by running `source python/.venv/bin/activate`. Always check with `which pip`, `which pip3`, `which python` and `which python3` to ensure you are using the venv before running any Python script
  </rule_1>
</safety_rules>
<behavioral_rules>
  <rule_1>
    Use TDD. Never implement anything before writing tests. The newly added tests should fail first, then you implement the feature to make the tests pass
  </rule_1>
  <rule_2>
    Always work on a feature branch. Never work on main branch
  </rule_2>
  <rule_3>
    Never push to main branch. Always push to a feature branch and open a PR for human approval
  </rule_3>
  <rule_4>
    All tests must be pass and type checking must be passed before merging into main
  </rule_4>
  <rule_5>
    Always read relevant skills md files under `./claude/skills` before planning
  </rule_5>
  <rule_6>
    Read the relevant specs in md files. Do not reinvent the wheel
  </rule_6>
  <rule_7>
    Always update the specs ("FILENAME_INCLUDING_FILENAME_EXTENSION.md") after changing codes in a file
  </rule_7>
  <rule_8>
    In TypeScript, use `undefined` instead of `null` whenever possible
  </rule_8>
  <rule_9>
    Make the modules loosely coupled
  </rule_9>
  <rule_10>
    When including link to any GitHub page, always use the domain name `redirect.github.com`. Never use the domain name of `github.com`
  </rule_10>
</behavioral_rules>
```

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
| Internal Python package | in `python/` |
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


## Project Structure

```
ray-optics-web/
├── app/                          # Next.js App Router pages
│   └── __tests__/
├── components/                   # React UI components
│   ├── micro/                    # Minimal, single-responsibility components
│   ├── composite/                # Composed with micro-components
│   └── container/                # Containers for state management and logic
├── store/                        # Zustand global state stores
├── workers/
│   └── pyodide.worker.ts         # Web Worker: Pyodide init + rayoptics API
├── hooks/                        # React hooks (usePyodide, useAgGridTheme, etc.)
├── lib/                          # TypeScript types and utilities
├── python/                       
│   ├── src/rayoptics_web_utils/  # Internal Python package (rayoptics_web_utils)
│   └── .venv/                    # the venv for installed Python deps
├── scripts/                      # Build and setup shell scripts
├── e2e/                          # Playwright end-to-end tests
├── __tests__/                    # Root-level smoke tests
├── __mocks__/                    # Jest mocks (comlink, pyodide, ag-grid)
├── data/                         # Static data (glass catalogs)
├── docs/                         # Supplemental documentation
└── public/                       # Static assets (service worker, built wheel)
```

## Development Setup

```bash
# Install dependencies
npm install

# Initialize the venv for the local Python package and install deps for the development
bash ./scripts/init-python-venv.sh

# Build the wheel of local rayoptics_web_utils and then run dev server (http://localhost:3000)
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Unit tests (Jest)
npm run test

# Unit tests for the internal Python package
bash ./scripts/run-python-tests.sh

# E2E tests (Playwright)
npm run test:e2e

# Build the wheel of local rayoptics_web_utils and then build the Next app
npm run build

# Serve the built app locally
npm run serve
```

## Known Constraints & Gotchas

- **Web Worker in Next.js**: Next.js requires the `new Worker(new URL(..., import.meta.url))` pattern for correct bundling. **Do not use string paths.**
- **`"use client"` boundary**: The Pyodide hook and all components that use it must be Client Components.

