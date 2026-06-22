export const version = "314.0.0";

export const loadPyodide = jest.fn(async () => {
  return {
    runPythonAsync: async () => undefined,
    loadPackage: async () => undefined,
    globals: new Map(),
  };
});
