import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildNextStaticManifest,
  generateNextStaticServiceWorker,
} from "../generate-next-static-sw";

describe("generate-next-static-sw", () => {
  async function fixture(): Promise<string> {
    const outDir = await mkdtemp(path.join(tmpdir(), "next-static-sw-"));
    await mkdir(path.join(outDir, "_next/static/chunks"), { recursive: true });
    await mkdir(path.join(outDir, "_next/static/css"), { recursive: true });
    await writeFile(path.join(outDir, "_next/static/chunks/z'chunk.js"), "z");
    await writeFile(path.join(outDir, "_next/static/css/a file.css"), "a");
    await writeFile(
      path.join(outDir, "pyodide-sw.js"),
      "const NEXT_STATIC_MANIFEST = /* __NEXT_STATIC_MANIFEST__ */ [];\n"
    );
    return outDir;
  }

  it("generates a deterministic, base-path-aware, safely escaped manifest", async () => {
    const outDir = await fixture();

    await generateNextStaticServiceWorker(outDir, "/ray-optics-web/");

    const worker = await readFile(path.join(outDir, "pyodide-sw.js"), "utf8");
    expect(worker).toContain(
      JSON.stringify([
        "/ray-optics-web/_next/static/chunks/z'chunk.js",
        "/ray-optics-web/_next/static/css/a%20file.css",
      ])
    );
  });

  it("returns sorted URLs regardless of filesystem enumeration order", async () => {
    const outDir = await fixture();
    await expect(buildNextStaticManifest(outDir, "")).resolves.toEqual([
      "/_next/static/chunks/z'chunk.js",
      "/_next/static/css/a%20file.css",
    ]);
  });

  it("fails when the static output is absent or empty", async () => {
    const missingOut = await mkdtemp(path.join(tmpdir(), "next-static-sw-missing-"));
    await expect(buildNextStaticManifest(missingOut, "")).rejects.toThrow(
      "out/_next/static"
    );

    const emptyOut = await mkdtemp(path.join(tmpdir(), "next-static-sw-empty-"));
    await mkdir(path.join(emptyOut, "_next/static"), { recursive: true });
    await expect(buildNextStaticManifest(emptyOut, "")).rejects.toThrow(
      "no files"
    );
  });
});
