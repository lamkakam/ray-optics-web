#!/usr/bin/env node
/**
 * download-assets.mjs
 *
 * Downloads Pyodide core files and PyPI wheels for self-hosting.
 * Run this before `npm run dev` or `npm run build` on a fresh clone:
 *   npm run download-assets
 *
 * Outputs:
 *   public/pyodide/  — Pyodide JS/WASM + built-in package wheels
 *   public/wheels/   — PyPI-only wheels + index.json
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PYODIDE_NPM = join(ROOT, 'node_modules', 'pyodide');
const PUBLIC_PYODIDE = join(ROOT, 'public', 'pyodide');
const PUBLIC_WHEELS = join(ROOT, 'public', 'wheels');

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full';

// Packages loaded via pyodide.loadPackage() in init()
const LOAD_PACKAGES = [
  'micropip', 'numpy', 'scipy', 'matplotlib', 'pandas', 'xlrd',
  'pyyaml', 'traitlets', 'packaging', 'deprecation', 'requests',
  'six', 'regex',
];

// Starting packages for PyPI wheel resolution (not available in Pyodide)
const PYPI_DIRECT = [
  { name: 'rayoptics', version: '0.9.4' },
  { name: 'opticalglass', version: '1.1.0' },
  { name: 'anytree', version: '2.12.1' },
  { name: 'transforms3d', version: '0.4.2' },
  { name: 'json-tricks', version: '3.17.3' },
  { name: 'openpyxl', version: '3.1.2' },
  { name: 'parsimonious', version: '0.10.0' },
];

// Packages that are stubbed out in the worker (never need to be downloaded)
const STUBBED_PACKAGES = new Set([
  'pyside6', 'pyside6-essentials', 'pyside6-addons', 'shiboken6',
  'psutil', 'zmq', 'pyzmq',
  'tornado',
  // GUI / Qt tooling pulled in transitively by rayoptics
  'qdarkstyle', 'qtconsole', 'qtpy',
  // Jupyter tooling (optional deps of rayoptics)
  'ipykernel', 'ipython', 'ipywidgets', 'ipython-pygments-lexers',
  'jupyter-core', 'jupyter-client', 'jupyterlab-widgets',
  'widgetsnbextension', 'comm', 'debugpy', 'nest-asyncio',
  // Build/dev tooling
  'wheel', 'setuptools', 'pip',
]);

// ─── Utilities ────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Canonical package name: lowercase, all separators → hyphen */
function normalizeName(name) {
  return name.toLowerCase().replace(/[-_.]+/g, '-');
}

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      console.warn(`    retry ${attempt + 1}/${retries - 1} for ${url}`);
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

async function downloadFile(url, dest) {
  const label = dest.replace(ROOT, '').replace(/^\//, '');
  if (existsSync(dest)) {
    console.log(`  [skip]     ${label}`);
    return;
  }
  console.log(`  [download] ${label}`);
  const res = await fetchWithRetry(url);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// ─── Step 1: Copy core Pyodide files from node_modules ───────────────────────

function copyPyodideCoreFiles() {
  console.log('Step 1: Copying Pyodide core files from node_modules/pyodide ...');
  const coreFiles = [
    'pyodide.js',
    'pyodide.asm.js',
    'pyodide.asm.wasm',
    'python_stdlib.zip',
    'pyodide-lock.json',
  ];
  for (const file of coreFiles) {
    const src = join(PYODIDE_NPM, file);
    const dst = join(PUBLIC_PYODIDE, file);
    if (!existsSync(src)) {
      console.warn(`  [warn] ${src} not found`);
      continue;
    }
    const label = `public/pyodide/${file}`;
    if (existsSync(dst)) {
      console.log(`  [skip]     ${label}`);
    } else {
      console.log(`  [copy]     ${label}`);
      copyFileSync(src, dst);
    }
  }
  console.log();
}

// ─── Step 2: Download Pyodide built-in package wheels from CDN ───────────────

function getTransitivePyodideDeps(lockData, packageNames) {
  const pkgs = lockData.packages;
  const visited = new Set();
  const queue = packageNames.map(n => normalizeName(n));

  while (queue.length > 0) {
    const name = queue.shift();
    if (visited.has(name)) continue;

    const entry =
      pkgs[name] ??
      Object.entries(pkgs).find(([k]) => normalizeName(k) === name)?.[1];

    if (!entry) {
      console.warn(`  [warn] "${name}" not found in pyodide-lock.json`);
      continue;
    }
    visited.add(name);

    for (const dep of entry.depends ?? []) {
      const depNorm = normalizeName(dep);
      if (!visited.has(depNorm)) queue.push(depNorm);
    }
  }
  return visited;
}

async function downloadPyodidePackages(lockData) {
  console.log('Step 2: Downloading Pyodide built-in packages from CDN ...');
  const deps = getTransitivePyodideDeps(lockData, LOAD_PACKAGES);
  console.log(`  Resolved ${deps.size} packages (incl. transitive deps)`);

  const pkgs = lockData.packages;
  for (const normName of deps) {
    const entry =
      pkgs[normName] ??
      Object.entries(pkgs).find(([k]) => normalizeName(k) === normName)?.[1];

    if (!entry?.file_name) continue;
    await downloadFile(
      `${PYODIDE_CDN}/${entry.file_name}`,
      join(PUBLIC_PYODIDE, entry.file_name)
    );
  }
  console.log();
}

// ─── Step 3: Download PyPI wheels ────────────────────────────────────────────

function parseRequirement(req) {
  req = req.split('#')[0].trim();
  if (!req) return undefined;

  let marker = '';
  if (req.includes(';')) {
    [req, marker] = req.split(';', 2).map(s => s.trim());
  }

  // Drop platform-specific and extras-only deps
  if (/sys_platform\s*==\s*['"]win/i.test(marker)) return undefined;
  if (/platform_system\s*==\s*['"]Windows/i.test(marker)) return undefined;
  if (/platform_system\s*==\s*['"]Darwin/i.test(marker)) return undefined;
  if (/extra\s*==/.test(marker)) return undefined;

  // Strip extras bracket
  req = req.replace(/\[.*?\]/g, '').trim();

  const nameMatch = req.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)/);
  if (!nameMatch) return undefined;

  const name = nameMatch[1];
  const versionMatch = req.match(/==\s*([A-Za-z0-9._-]+)/);
  const version = versionMatch?.[1];
  return { name, version };
}

async function resolvePypiPackage(name, version) {
  const url = version
    ? `https://pypi.org/pypi/${name}/${version}/json`
    : `https://pypi.org/pypi/${name}/json`;

  const data = await (await fetchWithRetry(url)).json();
  const resolvedVersion = data.info.version;

  const files = data.urls ?? [];
  // Only accept pure-Python wheels — platform-specific wheels won't run in Pyodide
  const wheel =
    files.find(f => f.filename.endsWith('.whl') && f.filename.includes('py3-none-any')) ??
    files.find(f => f.filename.endsWith('.whl') && f.filename.includes('py2.py3-none-any'));

  return {
    resolvedVersion,
    wheelUrl: wheel?.url,
    wheelFilename: wheel?.filename,
    deps: data.info.requires_dist ?? [],
  };
}

async function downloadPypiWheels(pyodidePackageNames) {
  console.log('Step 3: Resolving and downloading PyPI wheels ...');
  const visited = new Set();
  const wheelIndex = {};
  const queue = [...PYPI_DIRECT];

  while (queue.length > 0) {
    const { name, version } = queue.shift();
    const normName = normalizeName(name);

    if (visited.has(normName)) continue;
    visited.add(normName);

    if (STUBBED_PACKAGES.has(normName)) {
      console.log(`  [skip]     ${name} (stubbed in worker)`);
      continue;
    }

    if (pyodidePackageNames.has(normName)) {
      console.log(`  [skip]     ${name} (available in Pyodide built-ins)`);
      continue;
    }

    console.log(`  [resolve]  ${name}${version ? `==${version}` : ''}`);
    try {
      const { resolvedVersion, wheelUrl, wheelFilename, deps } =
        await resolvePypiPackage(name, version);

      if (wheelUrl && wheelFilename) {
        await downloadFile(wheelUrl, join(PUBLIC_WHEELS, wheelFilename));
        wheelIndex[normName] = `/wheels/${wheelFilename}`;
      } else {
        console.warn(`  [warn]     no wheel found for ${name}==${resolvedVersion}`);
      }

      for (const dep of deps) {
        const parsed = parseRequirement(dep);
        if (!parsed) continue;
        const depNorm = normalizeName(parsed.name);
        if (!visited.has(depNorm) && !pyodidePackageNames.has(depNorm)) {
          queue.push({ name: parsed.name, version: parsed.version });
        }
      }
    } catch (err) {
      console.warn(`  [error]    ${name}: ${err.message}`);
    }
  }

  return wheelIndex;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== download-assets: self-hosting Pyodide + PyPI wheels ===\n');

  ensureDir(PUBLIC_PYODIDE);
  ensureDir(PUBLIC_WHEELS);

  copyPyodideCoreFiles();

  const lockData = JSON.parse(readFileSync(join(PYODIDE_NPM, 'pyodide-lock.json'), 'utf-8'));
  const pyodidePackageNames = new Set(
    Object.keys(lockData.packages).map(normalizeName)
  );

  await downloadPyodidePackages(lockData);
  const wheelIndex = await downloadPypiWheels(pyodidePackageNames);

  const indexPath = join(PUBLIC_WHEELS, 'index.json');
  writeFileSync(indexPath, JSON.stringify(wheelIndex, null, 2));

  console.log(`\nWrote public/wheels/index.json (${Object.keys(wheelIndex).length} entries):`);
  for (const [name, path] of Object.entries(wheelIndex)) {
    console.log(`  ${name}: ${path}`);
  }

  console.log('\n=== Done! ===');
  console.log('Run `npm run dev` or `npm run build` to start the app.');
}

main().catch(err => {
  console.error('\nFatal:', err);
  process.exit(1);
});
