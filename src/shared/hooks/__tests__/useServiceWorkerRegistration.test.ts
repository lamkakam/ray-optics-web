import { renderHook } from "@testing-library/react";
import { useServiceWorkerRegistration, registerServiceWorker } from "../useServiceWorkerRegistration";

const incomingBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
const incomingNavigator = global.navigator;

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_BASE_PATH;
});

afterEach(() => {
  if (incomingBasePath === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = incomingBasePath;
  }

  Object.defineProperty(global, "navigator", {
    configurable: true,
    value: incomingNavigator,
    writable: true,
  });
});

describe("registerServiceWorker", () => {
  it("calls navigator.serviceWorker.register with the SW path", async () => {
    const mockRegister = jest.fn().mockResolvedValue({});
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: { serviceWorker: { register: mockRegister } },
      writable: true,
    });

    await registerServiceWorker();

    expect(mockRegister).toHaveBeenCalledWith("/pyodide-sw.js", {
      updateViaCache: "none",
    });
  });

  it("prefixes the SW path with NEXT_PUBLIC_BASE_PATH when set", async () => {
    const mockRegister = jest.fn().mockResolvedValue({});
    process.env.NEXT_PUBLIC_BASE_PATH = "/ray-optics-web";
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: { serviceWorker: { register: mockRegister } },
      writable: true,
    });

    await registerServiceWorker();

    expect(mockRegister).toHaveBeenCalledWith("/ray-optics-web/pyodide-sw.js", {
      updateViaCache: "none",
    });
  });

  it("no-ops if serviceWorker is not supported", async () => {
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: {},
      writable: true,
    });

    // Should not throw
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it("does not throw if registration fails", async () => {
    const mockRegister = jest.fn().mockRejectedValue(new Error("SW failed"));
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: { serviceWorker: { register: mockRegister } },
      writable: true,
    });

    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });
});

describe("useServiceWorkerRegistration", () => {
  it("calls registerServiceWorker on mount", () => {
    const mockRegister = jest.fn().mockResolvedValue({});
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: { serviceWorker: { register: mockRegister } },
      writable: true,
    });

    renderHook(() => useServiceWorkerRegistration());

    expect(mockRegister).toHaveBeenCalledWith("/pyodide-sw.js", {
      updateViaCache: "none",
    });
  });
});
