---
name: rayoptics-headless-python
description: Preserve headless import safety for RayOptics Python and Pyodide code. Use when planning, changing, or reviewing Python source or tests; changing RayOptics imports or Pyodide initialization; or investigating Python collection failures, PySide6 imports, or headless CI failures.
---

# RayOptics Headless Python

Keep the Python test suite collectible and application entrypoints executable on
machines without GUI libraries. Do not solve headless failures by installing
`libEGL`, PySide6 runtime libraries, or new application dependencies.

## Prepare the environment

Before inspecting, changing, or executing anything under `src/python/`, run:

```bash
source <project-root>/src/python/.venv/bin/activate
which pip
which pip3
which python
which python3
```

Confirm every reported executable comes from `src/python/.venv`. Use that
environment for every Python or pytest command.

## Preserve import order

- Remember that pytest imports test modules during collection. Fixtures,
  including autouse and session fixtures, run only after collection finishes.
- Import collection-safe symbols directly from their narrow RayOptics modules.
  For example, import `OpticalModel` from
  `rayoptics.optical.opticalmodel`, not `rayoptics.environment`.
- Defer imports from `rayoptics.environment`, analysis, plotting, and other
  GUI-transitive namespaces until inside a fixture or test body that runs after
  `rayoptics_web_utils.env.init()`.
- In production entrypoints, call `rayoptics_web_utils.env.init()` before
  importing `rayoptics.environment`, analysis, plotting, or any other
  GUI-transitive module. Keep those imports below the initialization boundary.
- Document non-obvious deferred or direct imports at the narrowest relevant
  module, function, or entrypoint so a future cleanup does not reintroduce an
  eager GUI import.

## Develop with executable guardrails

Follow test-driven development. Before changing an offending import, add or
extend an environment regression test that:

1. Starts pytest collection for the entire `src/python/tests` suite in a fresh
   subprocess.
2. Installs a meta-path finder that raises `ImportError` for `PySide6` and every
   `PySide6.*` import.
3. Asserts that `pytest --collect-only` exits successfully and includes captured
   output when it fails.

Run the new regression test first and confirm it fails for the premature GUI
import. Apply the smallest import-order fix, then confirm the test passes.

## Verify the change

Run focused tests for the changed modules, followed by all required checks:

```bash
bash scripts/run-python-tests.sh
npm run type-check
npm run lint
npm run test
npm run build
```

Treat collection as a separate executable contract: a passing ordinary test
run does not replace the reject-PySide6 subprocess check. Report any command
that could not be run and why.
