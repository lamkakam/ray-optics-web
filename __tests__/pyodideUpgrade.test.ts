import fs from "node:fs";
import path from "node:path";

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Pyodide 314 migration", () => {
  it("loads the npm loader against the versioned 314.0.0 CDN", () => {
    const worker = readProjectFile("src/workers/pyodide.worker.ts");
    const moduleLoader = readProjectFile("src/workers/loadPyodideModule.ts");

    expect(worker).toContain('import { loadPyodide, version } from "pyodide"');
    expect(worker).toContain(
      'const CDN = `https://cdn.jsdelivr.net/pyodide/v${version}/full`',
    );
    expect(moduleLoader).toContain('/* webpackIgnore: true */ `${cdnUrl}/pyodide.asm.mjs`');
    expect(worker).toContain("createPyodideModule");
    expect(worker).not.toContain("importScripts");
  });

  it("constructs Pyodide as a module worker", () => {
    const factory = readProjectFile("src/workers/createPyodideWorker.ts");

    expect(factory).toContain('{ type: "module" }');
  });

  it("excludes Pyodide's guarded Node-only imports from browser bundles", () => {
    const nextConfig = readProjectFile("next.config.ts");

    expect(nextConfig).toContain("new webpack.IgnorePlugin");
    expect(nextConfig).toContain("resourceRegExp: /^(?:node:|ws$)/");
    expect(nextConfig).toContain("config.optimization.splitChunks = false");
    expect(nextConfig).toContain("config.experiments.outputModule = true");
    expect(nextConfig).toContain("config.output.module = true");
    expect(nextConfig).toContain(`config.output.library = {
        type: "assign",
        name: ["globalThis", "_N_E"],
      }`);
  });

  it("uses a new cache version and evicts obsolete cache entries", () => {
    const serviceWorker = readProjectFile("public/pyodide-sw.js");

    expect(serviceWorker).toContain('const CACHE_NAME = "pyodide-cache-v1.3"');
    expect(serviceWorker).toContain(".filter((name) => name !== CACHE_NAME)");
    expect(serviceWorker).toContain("caches.delete(name)");
  });
});
