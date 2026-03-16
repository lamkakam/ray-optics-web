import path from "path";
import { test, expect } from "./fixtures";
import { dismissAnyOpenDialog } from "./utils";

test("import invalid JSON shows error modal, dismissed by OK", async ({
  pyodidePage: page,
}) => {
  await dismissAnyOpenDialog(page);

  // 1. Navigate to Prescription tab and upload the invalid JSON file
  await page.getByRole("tab", { name: "Prescription" }).click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.locator('button[aria-label="Load Config"]').click(),
  ]);
  await fileChooser.setFiles(
    path.join(__dirname, "jsons", "invalid-lens-config.json")
  );

  // 2. Expect the Error modal to appear
  const errorModal = page.getByRole("dialog", { name: "Error" });
  await errorModal.waitFor({ state: "visible", timeout: 5_000 });

  // 3. Dismiss the modal by clicking OK
  await errorModal.getByRole("button", { name: "OK" }).click();
  await errorModal.waitFor({ state: "hidden", timeout: 5_000 });
});
