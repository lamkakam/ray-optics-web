import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  CLOUDFLARE_HEADERS,
  prepareCloudflarePages,
} from "../prepare-cloudflare";

describe("prepare-cloudflare", () => {
  it("replaces stale output, copies the complete export, and writes Cloudflare headers", async () => {
    const fixtureDir = await mkdtemp(path.join(tmpdir(), "prepare-cloudflare-"));
    const outDir = path.join(fixtureDir, "out");
    const destinationDir = path.join(fixtureDir, "cloudflare-pages");

    await mkdir(path.join(outDir, "_next/static/chunks"), { recursive: true });
    await mkdir(path.join(outDir, "nested/route"), { recursive: true });
    await mkdir(destinationDir, { recursive: true });
    await writeFile(path.join(outDir, "index.html"), "root");
    await writeFile(path.join(outDir, "_next/static/chunks/app.js"), "chunk");
    await writeFile(path.join(outDir, "nested/route/index.html"), "nested");
    await writeFile(path.join(destinationDir, "stale.txt"), "stale");
    await writeFile(path.join(destinationDir, "_headers"), "stale headers");

    await prepareCloudflarePages(outDir, destinationDir);

    await expect(readFile(path.join(destinationDir, "index.html"), "utf8")).resolves.toBe(
      "root"
    );
    await expect(
      readFile(path.join(destinationDir, "_next/static/chunks/app.js"), "utf8")
    ).resolves.toBe("chunk");
    await expect(
      readFile(path.join(destinationDir, "nested/route/index.html"), "utf8")
    ).resolves.toBe("nested");
    await expect(readFile(path.join(destinationDir, "stale.txt"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(destinationDir, "_headers"), "utf8")).resolves.toBe(
      CLOUDFLARE_HEADERS
    );
    expect(CLOUDFLARE_HEADERS).toBe(
      "/*\n" +
        "  Cross-Origin-Opener-Policy: same-origin\n" +
        "  Cross-Origin-Embedder-Policy: require-corp\n" +
        "  Permissions-Policy: tools=(self)\n"
    );
  });
});
