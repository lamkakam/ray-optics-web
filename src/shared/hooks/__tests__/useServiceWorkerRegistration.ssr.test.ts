/**
 * @jest-environment node
 *
 * Verifies that service-worker registration safely resolves when navigator is unavailable on the server.
 */

import { registerServiceWorker } from "../useServiceWorkerRegistration";

describe("registerServiceWorker during server rendering", () => {
  it("resolves without accessing browser-only APIs", async () => {
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it("resolves when the server provides no navigator global", async () => {
    const incomingNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: undefined,
    });

    try {
      await expect(registerServiceWorker()).resolves.toBeUndefined();
    } finally {
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: incomingNavigator,
      });
    }
  });
});
