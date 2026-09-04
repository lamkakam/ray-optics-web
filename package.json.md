# `package.json`

## Build behavior

`npm run build` runs the static Next.js export and then executes `postbuild`. Post-build processing runs in this order:

1. Generate the `_next/static` precache manifest in `out/pyodide-sw.js`.
2. Generate the npm third-party license report in `out`.
3. Generate the Python third-party license report in `out` using the project virtual environment.

Both the tracked and deployment npm license reports explicitly exclude the
first-party, private `ray-optics-web` root package by name. Other private
packages remain reportable if they are introduced as third-party dependencies.

Running the manifest generator first ensures a deployment cannot complete without its immutable Next asset list.

## Lint behavior

`npm run lint` regenerates the Python export helpers and then runs Biome with
warnings promoted to errors. Biome applies its stable recommended rules and the
recommended Next.js, React, test, and Playwright domains. Its formatter is
disabled, and its CSS parser accepts Tailwind CSS directives.

Linting respects `.gitignore` and excludes dependency, build, and coverage
output, `src/python`, `scripts`, and all generated TypeScript under
`src/shared/lib/utils/generated`. Generated helpers are validated at their
source and generation boundaries instead of linted after generation.
