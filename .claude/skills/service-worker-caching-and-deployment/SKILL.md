---
name: service-worker-caching-and-deployment
description: Maintain, diagnose, or change ray-optics-web service-worker caching and GitHub Pages deployment. Use for cache names or versions, Pyodide/PyPI/wheel caching, retained Next.js build assets, service-worker registration or lifecycle, precache-manifest generation, base-path handling, stale/open-tab failures, static export artifacts, CI builds, or Pages deployment workflow changes.
---

# Service Worker Caching and Deployment

Read the relevant source and adjacent `.md` specifications before planning or editing. Also read `commands-for-development`; follow repository TDD, feature-branch, validation, and spec-update rules.

## Understand the architecture

Treat `public/pyodide-sw.js` as a source template. Next copies it to `out/pyodide-sw.js`; `postbuild` then runs `scripts/generate-next-static-sw.js` before license generation. The generator recursively lists `out/_next/static`, produces sorted URL-encoded URLs prefixed by `NEXT_PUBLIC_BASE_PATH`, and replaces only the manifest marker in the deployed copy. Missing/empty static output or a missing marker must fail the build.

Keep these cache classes separate:

- `pyodide-cache-v1.3`: cache-first Pyodide CDN assets, PyPI metadata/packages, and same-origin wheels. Its suffix versions this cache's schema/content, not the service-worker script. Bump it only when existing Pyodide entries must be invalidated; a bump deliberately causes activation to delete the prior version and users to redownload large assets.
- `next-static-assets`: stable, non-expiring cache for same-origin, scope/base-path-prefixed `_next/static` files. Never version or delete it during normal deployment. Each deployment adds its content-hashed files so an older open tab can still load chunks after Pages replaces the artifact. Browser storage eviction is the retention limit.

Do not put HTML, route `.txt` payloads, or other mutable resources in `next-static-assets`; new tabs must receive the current deployment. For matching behavior, keep `src/shared/lib/config/swCachePolicy.ts` and worker tests aligned with the worker implementation.

## Preserve lifecycle guarantees

- During `install`, open `next-static-assets`, precache the entire generated manifest, and wait for completion before `skipWaiting`.
- During `activate`, delete only obsolete names beginning with `pyodide-cache-`; retain the current Pyodide cache, `next-static-assets`, and unrelated caches, then claim clients.
- For an in-scope same-origin `_next/static` fetch, check `next-static-assets` first. On a miss, fetch and cache only an `ok` response. Return failed responses without caching them.
- For configured Pyodide/PyPI/wheel resources, retain cache-first behavior in the current Pyodide cache.
- Ignore unrelated requests so normal browser/network behavior handles mutable application content.
- Register `${NEXT_PUBLIC_BASE_PATH}/pyodide-sw.js` with `updateViaCache: "none"`; this makes app loads check the newly generated worker manifest instead of an HTTP-cached script.

## Understand deployment

GitHub Pages deployment is fully client-side and has no backend:

1. A push to `main` with a non-Markdown change triggers `.github/workflows/deploy.yml`. Pages deployments are serialized and are not cancelled in progress.
2. The job installs Node and Python, initializes `src/python/.venv`, builds the local wheel, and runs `npm ci`.
3. `npm run build` runs the Next static export with `NEXT_PUBLIC_BASE_PATH=/ray-optics-web`; `postbuild` injects the manifest and writes license reports into `out`.
4. The workflow uploads only `out` as a uniquely named Pages artifact, then deploys that artifact.

Pull requests run the corresponding checks in `.github/workflows/ci.yml`, including a base-path production build. Markdown-only changes are ignored by both workflows, so do not claim CI or deployment ran for a skill/documentation-only commit.

## Change safely with TDD

Before implementation, add failing tests for the behavior being changed. Use these existing suites:

- `src/shared/lib/config/__tests__/swCachePolicy.test.ts`: URL origin, exact path, and base-path classification.
- `scripts/__tests__/generate-next-static-sw.test.ts`: deterministic enumeration, URL escaping, base paths, injection, and failure modes.
- `public/__tests__/pyodide-sw.test.ts`: install, fetch, runtime caching, multi-deployment retention, and activation cleanup.
- `src/shared/hooks/__tests__/useServiceWorkerRegistration.test.ts`: registration URL and options.

When changing source, update its adjacent specification. Review `package.json.md` for postbuild ordering, `public/pyodide-sw.js.md` for cache policy, and `scripts/generate-next-static-sw.js.md` for generation behavior.

## Verify changes

Run:

```bash
npm run test
npm run type-check
npm run lint
```

Before `npm run build`, activate `src/python/.venv` and verify `pip`, `pip3`, `python`, and `python3` all resolve inside it, as required by `AGENTS.md`. Build with the deployment base path when validating Pages-specific URLs:

```bash
source src/python/.venv/bin/activate
which pip
which pip3
which python
which python3
NEXT_PUBLIC_BASE_PATH=/ray-optics-web npm run build
```

After building, inspect `out/pyodide-sw.js` and compare its manifest exactly against every file beneath `out/_next/static`. Confirm the source template still contains the marker and was not deployment-modified. For retention changes, simulate two manifests sharing the same cache and prove a version-A hashed asset remains retrievable after version B installs while its network response would fail.

Never push to `main`; use a feature branch and a PR for human approval.
