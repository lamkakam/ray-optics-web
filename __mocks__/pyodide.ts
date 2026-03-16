export async function loadPyodide() {
  return {
    runPythonAsync: async () => undefined,
    loadPackage: async () => undefined,
    globals: new Map(),
    FS: {
      mkdirTree: () => undefined,
      writeFile: () => undefined,
    },
  };
}
