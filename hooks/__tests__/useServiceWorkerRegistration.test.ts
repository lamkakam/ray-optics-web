import { renderHook } from "@testing-library/react";
import { useServiceWorkerRegistration, registerServiceWorker } from "../useServiceWorkerRegistration";

describe("registerServiceWorker", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  it("calls navigator.serviceWorker.register with the SW path", async () => {
    const mockRegister = jest.fn().mockResolvedValue({});
    Object.defineProperty(global, "navigator", {
      value: { serviceWorker: { register: mockRegister } },
      writable: true,
    });

    await registerServiceWorker();

    expect(mockRegister).toHaveBeenCalledWith("/pyodide-sw.js");
  });

  it("prefixes the SW path with NEXT_PUBLIC_BASE_PATH when set", async () => {
    const mockRegister = jest.fn().mockResolvedValue({});
    Object.defineProperty(global, "navigator", {
      value: { serviceWorker: { register: mockRegister } },
      writable: true,
    });
    process.env.NEXT_PUBLIC_BASE_PATH = "/ray-optics-web";

    await registerServiceWorker();

    expect(mockRegister).toHaveBeenCalledWith("/ray-optics-web/pyodide-sw.js");
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  });

  it("no-ops if serviceWorker is not supported", async () => {
    Object.defineProperty(global, "navigator", {
      value: {},
      writable: true,
    });

    // Should not throw
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it("does not throw if registration fails", async () => {
    const mockRegister = jest.fn().mockRejectedValue(new Error("SW failed"));
    Object.defineProperty(global, "navigator", {
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
      value: { serviceWorker: { register: mockRegister } },
      writable: true,
    });

    renderHook(() => useServiceWorkerRegistration());

    expect(mockRegister).toHaveBeenCalledWith("/pyodide-sw.js");
  });
});
