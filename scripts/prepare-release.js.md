# `prepare-release.js`

## Purpose

Prepare a clean, deployable distribution directory from the root-path static
export in `out`.

## Behavior

`prepareRelease(outDir, destinationDir, currentWheel)` replaces the destination
and recursively copies the static export while excluding:

- directories named `__tests__`;
- files whose names contain `.test.` or `.spec.`;
- JavaScript, TypeScript, JSON, shell, and Python specification sidecars;
- every wheel except the named current application wheel.

Deployable HTML, Next.js assets and route payloads, service-worker files,
server configuration, and license reports are retained. When run directly, the
script reads the internal package version from `src/python/pyproject.toml` and
prepares `release-dist` from `out`, relative to the current working directory.
