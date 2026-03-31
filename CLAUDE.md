# CLAUDE.md

## Project Overview

**ray-optics-web** is a web-based GUI for RayOptics. It is ALL CLIENT SIDE. NO BACKEND SERVER.

## Rules
```xml
<meta_rules>
  <rule_1>
    Always display all meta_rules, all safety_rules and all behavioral_rules at EVERY response
  </rule_1>
</meta_rules>
<safety_rules>
  <rule_1>
    Before working on files under `src/python/`, always use venv by running `source <project-root>/src/python/.venv/bin/activate`. Always check with `which pip`, `which pip3`, `which python` and `which python3` to ensure you are using the venv before running any Python script
  </rule_1>
</safety_rules>
<behavioral_rules>
  <rule_1>
    Use TDD in all situations. Never implement anything before writing tests. The newly added tests should fail first, then you implement the feature to make the tests pass
  </rule_1>
  <rule_2>
    Always work on a feature branch. Never work on main branch
  </rule_2>
  <rule_3>
    Never push to main branch. Always push to a feature branch and open a PR for human approval
  </rule_3>
  <rule_4>
    All type checking and linting (commands specified in the skill of "commands-for-development") must be passed
  </rule_4>
  <rule_5>
    The skills md files are under `<project-root>/.claude/skills`.
    Before doing code changes, in plan mode or not, always read the skill of "commands-for-development".
    In planning mode, before planning:
    If you need to search for a file, then read the skill of "project-directory-structure".
    If you need to know the tech stack or the architecture of this project, then read the skill of "project-tech-stack-and-architecture".
    If you need to refactor the frontend part or add new features to the frontend part of this project, then read the skill of "frontend-coding-standard".
    If you need to add a new feature or change an existing feature involving the logics of lens prescription grid, then read "optics-conventions".
  </rule_5>
  <rule_6>
    Specs is in the file of `<FILENAME_INCLUDING_FILENAME_EXTENSION>.md` (for example: `opticalModel.ts.md`) under the same directory of the source code file. Read the relevant specs files before planning or before code implementation.
    Do not reinvent the wheel: try to reuse existing codes.
  </rule_6>
  <rule_7>
    Always update the specs (`<FILENAME_INCLUDING_FILENAME_EXTENSION>.md` under the same directory of the source code file) after any change involving source code.
  </rule_7>
  <rule_8>
    In TypeScript, use `undefined` instead of `null` whenever possible
  </rule_8>
  <rule_9>
    Make the modules loosely coupled (eg. use DI)
  </rule_9>
  <rule_10>
    When including link to any GitHub page, always use the domain name `redirect.github.com`. Never use the domain name of `github.com`
  </rule_10>
</behavioral_rules>
```

