import { expect, test, type ConsoleMessage } from "@playwright/test";
import { waitForPyodide } from "./utils";

const CLASSIC_WORKER_ERROR = "Classic web workers are not supported";

test("starts Pyodide as a module worker in development", async ({ page }) => {
  const runtimeErrors: string[] = [];
  const workers: string[] = [];

  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error: Error) => runtimeErrors.push(error.message));
  page.on("worker", (worker) => workers.push(worker.url()));

  const response = await page.goto("/");
  await waitForPyodide(page);

  expect(response?.headers()["cross-origin-opener-policy"]).toBe(
    "same-origin",
  );
  expect(response?.headers()["cross-origin-embedder-policy"]).toBe(
    "require-corp",
  );
  expect(await page.evaluate(() => window.crossOriginIsolated)).toBe(true);
  expect(workers.some((url) => url.includes("pyodide_worker_ts"))).toBe(true);
  expect(runtimeErrors.join("\n")).not.toContain(CLASSIC_WORKER_ERROR);
  expect(runtimeErrors).toEqual([]);
});
