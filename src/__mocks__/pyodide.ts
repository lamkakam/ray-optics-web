export const version = "314.0.0";

export const loadPyodide = jest.fn(async () => {
  return {
    runPython: () => ({ destroy: () => undefined }),
    runPythonAsync: async () => undefined,
    ffi: { PyProxy: { [Symbol.hasInstance]: () => false } },
    loadPackage: async () => undefined,
    globals: new Map(),
  };
});
