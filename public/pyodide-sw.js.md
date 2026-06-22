# `public/pyodide-sw.js`

## Purpose

Service worker providing cache-first delivery for Pyodide runtime assets, PyPI metadata and wheels, and the same-origin `rayoptics_web_utils` wheel.

## Cache lifecycle

- Uses cache name `pyodide-cache-v1.3`.
- On activation, deletes every cache whose name differs from the current cache, including the obsolete v1.2 cache containing Pyodide 0.27.7 assets.
- Claims clients after cache cleanup completes.

## Cache policy

Requests containing `cdn.jsdelivr.net/pyodide/`, `files.pythonhosted.org/`, or `pypi.org/pypi/` are cacheable. The generic jsDelivr path covers Pyodide 314.0.0 WASM, standard-library, lockfile, and package assets. Same-origin `.whl` files are also cacheable.

Successful uncached responses are cloned into the current cache. Failed responses and unrelated requests are not cached.
