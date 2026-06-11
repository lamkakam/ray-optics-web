import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workflowPaths = [".github/workflows/ci.yml", ".github/workflows/deploy.yml"];

const deprecatedNode20Actions = [
  "actions/checkout@v4",
  "actions/setup-python@v5",
  "dorny/paths-filter@v3",
];

const expectedActionRefs = [
  "actions/checkout@v6",
  "actions/setup-python@v6",
  "dorny/paths-filter@v4",
];

describe("GitHub Actions Node runtime versions", () => {
  const workflowContents = workflowPaths
    .map((workflowPath) => readFileSync(join(process.cwd(), workflowPath), "utf8"))
    .join("\n");

  it("does not use deprecated Node 20 action refs", () => {
    for (const actionRef of deprecatedNode20Actions) {
      expect(workflowContents).not.toContain(actionRef);
    }
  });

  it("uses the expected major action refs", () => {
    for (const actionRef of expectedActionRefs) {
      expect(workflowContents).toContain(actionRef);
    }
  });
});
