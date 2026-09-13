import { execFileSync } from "node:child_process";

/**
 * Exercises the production executor against local Pyodide/WASM in a separate Node
 * process, avoiding Jest's Pyodide mock and requiring no package downloads.
 * Only script construction and unrelated worker imports are stubbed. Weakrefs
 * detect retained Python objects with automatic GC disabled, including cycles
 * and exception tracebacks; initialized globals must remain usable.
 */
it("reclaims request cycles and exception roots in real Pyodide", () => {
  const output = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { loadPyodide } from 'pyodide';
const runtime = await loadPyodide({ indexURL: './node_modules/pyodide/' });
let script = '';
const exports = {};
const code = ts.transpileModule(fs.readFileSync('src/workers/pyodide.worker.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
vm.runInNewContext(code, {
  exports, console, process,
  require: (name) => name === 'comlink' ? { expose: () => {}, releaseProxy: Symbol() }
    : name === 'pyodide' ? { version: runtime.version }
    : name.endsWith('/pythonScript') ? { buildScript: () => script } : {}
});
exports._setPyodideForTesting(runtime);
runtime.runPython('import gc, weakref, json, sys; gc.disable(); refs = []; sentinel = object()');
const request = [
  'class Payload: pass',
  'payload = Payload()',
  'payload.self = payload',
  'refs.append(weakref.ref(payload))',
  'def _build_opm(): return payload',
  'refs.append(weakref.ref(_build_opm))',
];
const survivors = [];
let errors = 0;
for (const fails of [false, true]) {
  script = [...request, fails ? 'raise ValueError("original failure")' : '"{}"'].join('\\n');
  for (let i = 0; i < 3; i++) {
    try { await exports.getFirstOrderData({}); }
    catch (error) {
      if (!fails || !error.message.includes('original failure')) throw error;
      errors++;
    }
    survivors.push(runtime.runPython('sum(r() is not None for r in refs)'));
  }
}
console.log(JSON.stringify({
  survivors, errors,
  roots: JSON.parse(runtime.runPython('json.dumps([name for name in ("last_exc", "last_type", "last_value", "last_traceback") if hasattr(sys, name)])')),
  preserved: runtime.runPython('sentinel is not None'),
}));
  `,
    ],
    { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 },
  );

  expect(JSON.parse(output.trim())).toEqual({
    survivors: [0, 0, 0, 0, 0, 0],
    errors: 3,
    roots: [],
    preserved: true,
  });
}, 35_000);
