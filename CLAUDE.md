# CLAUDE.md

## Project Overview

**ray-optics-web** is a web-based GUI for RayOptics. It is ALL CLIENT SIDE. NO BACKEND SERVER.

## Rules
```xml
<meta_rules>
  <rule_1>
    Always display all meta_rules, all safety_rules and all behavioral_rules
  </rule_1>
</meta_rules>
<safety_rules>
  <rule_1>
    Before working on files under `python/`, always use venv by running `source <project-root>/python/.venv/bin/activate`. Always check with `which pip`, `which pip3`, `which python` and `which python3` to ensure you are using the venv before running any Python script
  </rule_1>
</safety_rules>
<behavioral_rules>
  <rule_1>
    Use TDD. Never implement anything before writing tests. The newly added tests should fail first, then you implement the feature to make the tests pass
  </rule_1>
  <rule_2>
    Always work on a feature branch. Never work on main branch
  </rule_2>
  <rule_3>
    Never push to main branch. Always push to a feature branch and open a PR for human approval
  </rule_3>
  <rule_4>
    All tests must be pass and type checking must be passed before merging into main
  </rule_4>
  <rule_5>
    Always read relevant skills md files under `<project-root>/claude/skills` before planning
  </rule_5>
  <rule_6>
    Read the relevant specs in md files. Do not reinvent the wheel
  </rule_6>
  <rule_7>
    Always update the specs (`<FILENAME_INCLUDING_FILENAME_EXTENSION>.md`) after changing codes in a file
  </rule_7>
  <rule_8>
    In TypeScript, use `undefined` instead of `null` whenever possible
  </rule_8>
  <rule_9>
    Make the modules loosely coupled
  </rule_9>
  <rule_10>
    When including link to any GitHub page, always use the domain name `redirect.github.com`. Never use the domain name of `github.com`
  </rule_10>
</behavioral_rules>
```

