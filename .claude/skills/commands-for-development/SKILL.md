---
name: commands-for-development
description: Bash commands for development, testing, building, and serving ray-optics-web
---

## Commands for Development

### Install dependencies:

```bash
npm ci
```

### Initialize the venv for the local Python package and install deps for the development:

```bash
bash <project-root>/scripts/init-python-venv.sh
```

### Build the wheel of local rayoptics_web_utils and then run dev server (http://localhost:3000):

```bash
npm run dev
```

### Type check:

```bash
npm run type-check
```

### Lint:

```bash
npm run lint
```

### Unit tests (Jest):

```bash
npm run test
```

### Local mutation tests (Stryker through Jest):

```bash
# Full application campaign; can take substantially longer than Jest
npm run test:mutation

# Full-scope instrumentation and initial test run only
npm run test:mutation -- --dryRunOnly

# Bounded utility and TSX runs
npm run test:mutation -- --mutate src/shared/lib/chart-formatting/formatPlotValue.ts
npm run test:mutation -- --mutate src/shared/components/primitives/Button/Button.tsx

# Optional worker limit; otherwise Stryker uses its default concurrency
npm run test:mutation -- --mutate src/shared/lib/chart-formatting/formatPlotValue.ts --concurrency 2
```

Use the full-scope dry run plus focused runs to validate setup; an exhaustive mutation campaign is not needed for configuration changes. Focused runs generally take seconds to minutes. No CI workflow or mutation-score gate is configured, and incremental mode and the optional TypeScript mutant checker are disabled.

The `pretest:mutation` lifecycle hook generates Python-export TypeScript helpers before Stryker copies its sandbox. Keep the six existing `.txt` fixtures under Git-ignored `src/__tests__/data/photons-to-photos/` available locally; `npm ci` does not provide them. Jest also reads Python helper sources and `src/python/pyproject.toml` as text. These files and generated helpers are copied but never mutated; no Python execution or wheel build is needed.

Progress and scores appear in the console. Mutation runs write `reports/mutation/mutation.html` and `reports/mutation/mutation.json`, overwriting the previous reports; dry runs do not write reports. Reports and `.stryker-tmp/` are Git-ignored; sandboxes are excluded from ordinary Jest discovery and TypeScript checking. See the README's local mutation-testing section for scope and sandbox exclusions.

### Unit tests for the internal Python package:

```bash
bash <project-root>/scripts/run-python-tests.sh
```

### E2E tests (Playwright):

```bash
npm run test:e2e
```

### Generate the tracked npm and Python third-party dependency license reports (after initializing the Python venv):

```bash
npm run generate:third-party-licenses
```

### Generate only the tracked Python third-party dependency license report (after initializing the Python venv):

```bash
npm run generate:python-third-party-licenses
```

### Build the wheel of local rayoptics_web_utils and then build the Next app:

```bash
npm run build
```

### Serve the built app locally:

```bash
npm run serve
```
