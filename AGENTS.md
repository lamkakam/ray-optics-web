# AGENTS.md

## Project Overview

**ray-optics-web** is a web-based GUI for RayOptics. It is ALL CLIENT SIDE. NO BACKEND SERVER.

## Rules

- Before working on files under `<project-root>/src/python/`, always use venv by running `source <project-root>/src/python/.venv/bin/activate`. Always check with `which pip`, `which pip3`, `which python` and `which python3` to ensure you are using the venv before running any Python script

- Use TDD in all situations. Never implement anything before writing tests. The newly added tests should fail first, then you implement the feature to make the tests pass

- Always work on a feature branch. Never work on main branch

- Never push to main branch. Always push to a feature branch and open a PR for human approval

- All type checking and linting (commands specified in the skill of "commands-for-development") must be passed

- The skills md files are under `<project-root>/.claude/skills`. Before doing code changes, in plan mode or not, always read the skill of "commands-for-development".

- Specs is in the file of `<FILENAME_INCLUDING_FILENAME_EXTENSION>.md` (for example: `opticalModel.ts.md`) under the same directory of the source code file. Read the relevant specs files before planning or before code implementation.

- Do not reinvent the wheel: try to reuse existing codes.

- Always update the specs (`<FILENAME_INCLUDING_FILENAME_EXTENSION>.md` under the same directory of the source code file) after any change involving source code.

- In TypeScript, use `undefined` instead of `null` whenever possible

- Make the modules loosely coupled (eg. use DI)

- When including link to any GitHub page, always use the domain name `redirect.github.com`. Never use the domain name of `github.com`

- End your commit message with "Co-Authored-By: <model-name-with-precise-version-number> with an email address "no-reply@<domain-name>" for auditing purpose (eg. `"Co-Authored-By: GPT-5.6-sol <no-reply@openai.com>"`)

- Use `gh` outside the sandbox when making a Pull Request

