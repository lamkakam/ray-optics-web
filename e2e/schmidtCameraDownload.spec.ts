import fs from "fs";
import os from "os";
import path from "path";
import { test, expect } from "./fixtures";
import { dismissAnyOpenDialog } from "./utils";

test("load Schmidt Camera example and download config JSON", async ({
  pyodidePage: page,
}) => {
  await dismissAnyOpenDialog(page);

  // 1. Select the Schmidt Camera example system
  await page
    .locator('select[aria-label="Example system"]')
    .selectOption("8: Schmidt Camera 200mm f/5");

  // 2. Confirm overwrite dialog
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  await dialog.getByRole("button", { name: "Load" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 10_000 });

  // 3. Navigate to Prescription tab (where Download Config lives)
  await page.getByRole("tab", { name: "Prescription" }).click();

  // 4. Intercept the file download triggered by "Download Config"
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator('button[aria-label="Download Config"]').click(),
  ]);

  // 5. Save to a temp file and parse as JSON
  const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
  await download.saveAs(tmpPath);
  const content = fs.readFileSync(tmpPath, "utf-8");
  const parsed = JSON.parse(content); // throws if invalid JSON

  // 6. Assert expected top-level keys and non-empty surfaces array
  expect(parsed).toHaveProperty("setAutoAperture");
  expect(parsed).toHaveProperty("specs");
  expect(parsed).toHaveProperty("surfaces");
  expect(parsed).toHaveProperty("object");
  expect(parsed).toHaveProperty("image");
  expect(Array.isArray(parsed.surfaces)).toBe(true);
  expect(parsed.surfaces.length).toBeGreaterThan(0);
});
