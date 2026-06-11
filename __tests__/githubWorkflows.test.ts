import { readFileSync } from "node:fs";
import path from "node:path";

const workflowPaths = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
];

const readWorkflow = (workflowPath: string) =>
  readFileSync(path.join(process.cwd(), workflowPath), "utf8");

describe("GitHub workflows", () => {
  it.each(workflowPaths)("uses Node 24 setup-node actions in %s", (workflowPath) => {
    const workflow = readWorkflow(workflowPath);

    expect(workflow).not.toContain("FORCE_JAVASCRIPT_ACTIONS_TO_NODE24");
    expect(workflow).toContain("actions/setup-node@v6");
    expect(workflow).toContain("node-version: '24'");
  });
});
