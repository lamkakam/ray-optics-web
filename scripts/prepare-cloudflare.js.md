# `prepare-cloudflare.js`

## Purpose

Prepare a clean Cloudflare Pages Direct Upload directory from the root-path
static export in `out`.

## Behavior

`prepareCloudflarePages(outDir, destinationDir)` removes the destination
recursively, copies the complete source tree to it, and writes `_headers` at the
destination root. The headers apply to every route and enable cross-origin
isolation with `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp`. The permissions policy allows the
Tools API for the same origin with `Permissions-Policy: tools=(self)`.

When run directly, the script copies `out` to `cloudflare-pages`, relative to
the current working directory. Copy or write failures make the command fail.
