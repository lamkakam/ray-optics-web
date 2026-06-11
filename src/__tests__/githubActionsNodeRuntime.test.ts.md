# githubActionsNodeRuntime.test.ts

## Purpose

Regression coverage for GitHub Actions workflow action refs that must stay on majors with current Node runtime support.

## Behavior

- Reads `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` from the project root.
- Fails if deprecated Node 20 action refs reappear.
- Verifies the workflows use the expected replacement major refs.
