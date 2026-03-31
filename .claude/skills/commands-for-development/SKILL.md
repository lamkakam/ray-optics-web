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

### Unit tests for the internal Python package:

```bash
bash <project-root>/scripts/run-python-tests.sh
```

### E2E tests (Playwright):

```bash
npm run test:e2e
```

### Build the wheel of local rayoptics_web_utils and then build the Next app:

```bash
npm run build
```

### Serve the built app locally:

```bash
npm run serve
```

