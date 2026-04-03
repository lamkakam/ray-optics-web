# `__tests__/packageVersion.test.ts`

## Purpose
Verifies the root package metadata reports the expected application version.

## Behaviour
- Reads the repository `package.json` from the project root at test runtime
- Asserts the `version` field matches the current release version `0.4.4`
