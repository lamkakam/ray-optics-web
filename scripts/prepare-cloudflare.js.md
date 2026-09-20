# `prepare-cloudflare.js`

## Purpose

Prepare a clean Cloudflare Pages Direct Upload directory from the root-path
static export in `out`.

## Behavior

`prepareCloudflarePages(outDir, destinationDir, currentWheel)` prepares the same
clean static distribution used for releases, then writes `_headers` at the
destination root. Tests, specification sidecars, and obsolete wheels are
excluded. The headers apply to every route and enable cross-origin isolation
with `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp`. The permissions policy allows the
Tools API for the same origin with `Permissions-Policy: tools=(self)`.

When run directly, the script reads the internal package version from
`src/python/pyproject.toml` and copies `out` to `cloudflare-pages`, relative to
the current working directory. Copy or write failures make the command fail.
