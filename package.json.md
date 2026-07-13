# `package.json`

## Build behavior

`npm run build` runs the static Next.js export and then executes `postbuild`. Post-build processing runs in this order:

1. Generate the `_next/static` precache manifest in `out/pyodide-sw.js`.
2. Generate the npm third-party license report in `out`.
3. Generate the Python third-party license report in `out` using the project virtual environment.

Running the manifest generator first ensures a deployment cannot complete without its immutable Next asset list.
