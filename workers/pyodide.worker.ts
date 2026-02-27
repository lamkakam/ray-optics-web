import { expose } from "comlink";
import { loadPyodide } from "pyodide";

let pyodide: Awaited<ReturnType<typeof loadPyodide>> | null = null;

export async function init(): Promise<void> {
  if (pyodide) return;
  try {
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
    });
    await pyodide.loadPackage(["micropip", "numpy", "scipy", "matplotlib", "pandas"]);

    await pyodide.runPythonAsync(`
    import sys, types
    for m in ['PySide6','PySide6.QtWidgets','PySide6.QtCore',
              'PySide6.QtGui','psutil','zmq','pyzmq',
              'tornado','tornado.ioloop']:
      sys.modules[m] = types.ModuleType(m)
    `);

    // Install rayoptics without its dependencies because it requires desktop-only 
    // packages like PySide6, psutil, pyzmq, etc., which don't work in WebAssembly
    await pyodide.runPythonAsync(`
    import micropip
    await micropip.install("rayoptics", deps=False)
    `);

    await pyodide.runPythonAsync(`
    import micropip
    await micropip.install(['attrs','anytree','transforms3d','traitlets','json5','packaging'])
    `);

    await pyodide.runPythonAsync(`import json\nimport uuid\n_models = {}`);
  } catch (err) {
    pyodide = null;
    throw err;
  }
}

export async function runPython(code: string): Promise<unknown> {
  if (!pyodide) {
    throw new Error("Pyodide not initialized. Call init() first.");
  }
  return pyodide.runPythonAsync(code);
}

function requirePyodide(): (code: string) => Promise<unknown> {
  if (!pyodide) throw new Error("Pyodide not initialized. Call init() first.");
  return pyodide.runPythonAsync.bind(pyodide);
}

expose({
  init,
  runPython,
});