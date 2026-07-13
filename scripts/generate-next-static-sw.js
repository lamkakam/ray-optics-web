const { readdir, readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

const MANIFEST_PLACEHOLDER = "/* __NEXT_STATIC_MANIFEST__ */ []";

async function listFiles(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(entryPath, root) : path.relative(root, entryPath);
    })
  );
  return files.flat();
}

function normalizeBasePath(basePath) {
  const trimmed = basePath.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

function encodePublicPath(relativePath) {
  return relativePath.split(path.sep).map(encodeURIComponent).join("/");
}

async function buildNextStaticManifest(outDir, basePath) {
  const staticDir = path.join(outDir, "_next/static");
  let files;
  try {
    files = await listFiles(staticDir);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error(`Expected static build directory at ${path.join("out", "_next/static")}`);
    }
    throw error;
  }

  if (files.length === 0) {
    throw new Error("The out/_next/static directory contains no files");
  }

  const prefix = normalizeBasePath(basePath);
  return files
    .map((file) => `${prefix}/_next/static/${encodePublicPath(file)}`)
    .sort();
}

async function generateNextStaticServiceWorker(outDir, basePath) {
  const manifest = await buildNextStaticManifest(outDir, basePath);
  const workerPath = path.join(outDir, "pyodide-sw.js");
  const template = await readFile(workerPath, "utf8");
  if (!template.includes(MANIFEST_PLACEHOLDER)) {
    throw new Error(`Service worker template is missing ${MANIFEST_PLACEHOLDER}`);
  }
  await writeFile(
    workerPath,
    template.replace(MANIFEST_PLACEHOLDER, JSON.stringify(manifest)),
    "utf8"
  );
}

if (require.main === module) {
  generateNextStaticServiceWorker(
    path.resolve(process.cwd(), "out"),
    process.env.NEXT_PUBLIC_BASE_PATH || ""
  ).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildNextStaticManifest, generateNextStaticServiceWorker };
