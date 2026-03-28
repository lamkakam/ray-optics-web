import { test as base, type Page } from "@playwright/test";
import { waitForPyodide } from "./utils";

type WorkerFixtures = {
  pyodidePage: Page;
};

export const test = base.extend<{}, WorkerFixtures>({
  pyodidePage: [
    async ({ browser }, use) => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      const page = await context.newPage();
      await page.goto("/");
      await waitForPyodide(page);
      await use(page);
      await context.close();
    },
    { scope: "worker", timeout: 180_000 },
  ],
});

export { expect } from "@playwright/test";
