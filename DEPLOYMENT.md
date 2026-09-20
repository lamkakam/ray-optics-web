# Releases and deployments

Production releases are fully static and are created only by tags that match
`v[0-9]+.[0-9]+.[0-9]+`, for example `v1.2.3`. Prerelease, build-metadata, and
non-version tags do not start either deployment workflow. A tag version is not
required to match `package.json` or the internal Python package version.

## Release outputs

The release workflow in `.github/workflows/release.yml` uses Node 24 and Python
3.12, runs the same type-check, lint, format, unit-test, and static-build gates
as CI, and creates a root-path static export. `npm run prepare:release` copies
the export to a clean staging directory without tests, specification sidecars,
or obsolete wheels. The workflow packages the staging directory's contents at
the archive root and publishes `ray-optics-web-<tag>-dist.zip` on a GitHub
Release with generated release notes.

The compiled archive and Cloudflare directory are uploaded as workflow
artifacts before release publication. Publishing is idempotent: a missing
release is created, while an existing release receives a replacement archive.

The root-path export is also copied to a short-lived `cloudflare-pages`
workflow artifact. `npm run prepare:cloudflare` applies the same clean-copy
policy and adds a Cloudflare Pages `_headers` file containing
the COOP, COEP, and `Permissions-Policy: tools=(self)` response headers. These
headers preserve `SharedArrayBuffer` support without a server or Pages
Functions. See Cloudflare's documentation for [static header
rules](https://developers.cloudflare.com/pages/configuration/headers/) and
[Direct Upload from continuous
integration](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).
The deployment job remains disabled until the Direct Upload project has been
created.

The GitHub Pages workflow in `.github/workflows/deploy.yml` performs a separate
build with `NEXT_PUBLIC_BASE_PATH=/ray-optics-web`. Its service-worker manifest
therefore contains `/ray-optics-web/_next/static/...` URLs, while the release
and Cloudflare manifest contains root-relative `/_next/static/...` URLs.

## Repository environments

The `cloudflare-pages` GitHub environment must allow version-tag deployments
and contain `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets. The API
token needs Cloudflare Pages edit permission. Its environment URL is
`https://ray-optics-web.vestibulum.xyz/`.

The `github-pages` environment must also allow version tags. Its existing
`main` deployment rule may remain for administrative compatibility, although
the workflow itself accepts only matching version tags. Environment protection
rules are an additional approval boundary; workflow tag filters are the source
of truth for which refs produce releases and deployments.

## One-time Cloudflare setup

Create a Direct Upload Pages project named `ray-optics-web`, configure `main`
as its production branch, and attach the custom domain
`ray-optics-web.vestibulum.xyz`. Subsequent matching tags deploy the prepared
static directory through `cloudflare/wrangler-action`.

## Local verification

Initialize and activate `src/python/.venv` before either build. Run `npm run
build` without `NEXT_PUBLIC_BASE_PATH` to inspect the release/Cloudflare export,
then run `npm run prepare:release` and `npm run prepare:cloudflare`. For the
GitHub Pages variant, remove the previous `out` directory through a normal clean
build and run:

```bash
NEXT_PUBLIC_BASE_PATH=/ray-optics-web npm run build
```

For each variant, compare the generated manifest in `out/pyodide-sw.js` with
the complete file set below `out/_next/static` and confirm the corresponding
URL prefix.
