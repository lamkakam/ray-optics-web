import "@testing-library/jest-dom";

// Mock ResizeObserver (not available in jsdom, required by @visx/responsive)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock importScripts (only available in Web Workers, not in jsdom)
(global as unknown as Record<string, unknown>).importScripts = jest.fn();

// Mock loadPyodide global (normally injected by importScripts in a Web Worker context)
(global as unknown as Record<string, unknown>).loadPyodide = async () => ({
  runPythonAsync: jest.fn().mockResolvedValue(undefined),
  loadPackage: jest.fn().mockResolvedValue(undefined),
  globals: new Map(),
  FS: {
    mkdirTree: jest.fn(),
    writeFile: jest.fn(),
  },
});

// Mock window.matchMedia for jsdom (not implemented by default)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});
