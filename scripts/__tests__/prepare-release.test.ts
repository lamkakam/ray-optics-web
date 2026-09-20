import { access, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { prepareRelease } from "../prepare-release";

async function expectMissing(filePath: string): Promise<void> {
  await expect(access(filePath)).rejects.toThrow();
}

describe("prepare-release", () => {
  it("creates a clean deployable distribution containing only the current wheel", async () => {
    const fixtureDir = await mkdtemp(path.join(tmpdir(), "prepare-release-"));
    const outDir = path.join(fixtureDir, "out");
    const destinationDir = path.join(fixtureDir, "release-dist");
    const currentWheel = "rayoptics_web_utils-0.33.1-py3-none-any.whl";

    await mkdir(path.join(outDir, "_next/static/chunks"), { recursive: true });
    await mkdir(path.join(outDir, "route"), { recursive: true });
    await mkdir(path.join(outDir, "nested/__tests__"), { recursive: true });
    await mkdir(destinationDir, { recursive: true });
    await Promise.all([
      writeFile(path.join(outDir, "index.html"), "root"),
      writeFile(path.join(outDir, "_next/static/chunks/app.js"), "chunk"),
      writeFile(path.join(outDir, "route/__next._tree.txt"), "payload"),
      writeFile(path.join(outDir, "pyodide-sw.js"), "worker"),
      writeFile(path.join(outDir, "serve.json"), "{}"),
      writeFile(path.join(outDir, "THIRD-PARTY-LICENSES.md"), "licenses"),
      writeFile(path.join(outDir, currentWheel), "current"),
      writeFile(
        path.join(outDir, "rayoptics_web_utils-0.33.0-py3-none-any.whl"),
        "obsolete",
      ),
      writeFile(path.join(outDir, "nested/__tests__/worker.ts"), "test"),
      writeFile(path.join(outDir, "component.test.js"), "test"),
      writeFile(path.join(outDir, "component.spec.ts"), "spec"),
      writeFile(path.join(outDir, "pyodide-sw.js.md"), "sidecar"),
      writeFile(path.join(destinationDir, "stale.txt"), "stale"),
    ]);

    await prepareRelease(outDir, destinationDir, currentWheel);

    await expect(
      readFile(path.join(destinationDir, "index.html"), "utf8"),
    ).resolves.toBe("root");
    await expect(
      readFile(path.join(destinationDir, "_next/static/chunks/app.js"), "utf8"),
    ).resolves.toBe("chunk");
    await expect(
      readFile(path.join(destinationDir, "route/__next._tree.txt"), "utf8"),
    ).resolves.toBe("payload");
    await expect(
      readFile(path.join(destinationDir, "THIRD-PARTY-LICENSES.md"), "utf8"),
    ).resolves.toBe("licenses");
    await expect(
      readFile(path.join(destinationDir, currentWheel), "utf8"),
    ).resolves.toBe("current");
    await expectMissing(path.join(destinationDir, "stale.txt"));
    await expectMissing(path.join(destinationDir, "nested/__tests__"));
    await expectMissing(path.join(destinationDir, "component.test.js"));
    await expectMissing(path.join(destinationDir, "component.spec.ts"));
    await expectMissing(path.join(destinationDir, "pyodide-sw.js.md"));
    await expectMissing(
      path.join(
        destinationDir,
        "rayoptics_web_utils-0.33.0-py3-none-any.whl",
      ),
    );
  });
});
