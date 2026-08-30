# AGENTS.md

## Project Overview

**ray-optics-web** is a web-based GUI for RayOptics. It is ALL CLIENT SIDE. NO BACKEND SERVER.

## Rules

- Before working on files under `<project-root>/src/python/`, always use venv by running `source <project-root>/src/python/.venv/bin/activate`. Always check with `which pip`, `which pip3`, `which python` and `which python3` to ensure you are using the venv before running any Python script

- Use TDD in all situations. Never implement anything before writing tests. The newly added tests should fail first, then you implement the feature to make the tests pass

- Always work on a feature branch. Never work on main branch

- Never push to main branch. Always push to a feature branch and open a PR for human approval

- All type checking and linting (commands specified in the skill of "commands-for-development") must be passed

- The skills md files are under `<project-root>/.claude/skills`. Before doing code changes, in plan mode or not, always read the skill of "commands-for-development". Before any change under `<project-root>/src/python/`, also read the skill of "rayoptics-headless-python".

- TypeScript, TSX, and Python specifications are embedded in their source files. Symbol-specific documentation belongs at the narrowest corresponding function, component, class, type, interface, or constant; reserve the file header or module docstring for genuinely module-wide documentation. Read the relevant embedded documentation before planning or implementation. JavaScript (including MJS) and shell specifications remain in `<FILENAME_INCLUDING_FILENAME_EXTENSION>.md` sidecars. The generated `src/shared/lib/utils/generated/pythonExportApertureHelpers.ts` also retains its sidecar because its source is generated.

- Do not reinvent the wheel: try to reuse existing codes.

- Always update the corresponding embedded declaration or module documentation after changing TypeScript, TSX, or Python source code. Continue to update sidecar specifications after changing JavaScript, MJS, or shell source code. Update `src/shared/lib/utils/generated/pythonExportApertureHelpers.ts.md` when its generated contract changes; do not edit the generated source directly.

- In TypeScript, use `undefined` instead of `null` whenever possible

- Make the modules loosely coupled (eg. use DI)

- When including link to any GitHub page, always use the domain name `redirect.github.com`. Never use the domain name of `github.com`

- End your commit message with "Co-Authored-By: <model-name-with-precise-version-number> with an email address "noreply@<domain-name>" for auditing purpose (eg. `"Co-Authored-By: GPT-5.6-sol <noreply@openai.com>"`)

- Use `gh` outside the sandbox when making a Pull Request

- Don't add verification section or test result section to the Pull Request body as tests are always run as a part of CI anyway.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
