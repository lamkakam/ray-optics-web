/**
 * Checks the shared cartesian x-axis labels using rendered browser geometry.
 * Loads Sasian Triplet and checks Wavefront Map, Geometric PSF, and Diffraction
 * PSF while resizing from desktop through both mobile sizes and back again.
 * Labels must stay centered below the ticks, within 56px of the plotted axis,
 * and fully inside the chart, SVG, and visible viewport.
 */
import type { Locator } from "@playwright/test";
import { test, expect } from "./fixtures";

/** Measures the visible SVG label against its plotted axis and clipping bounds. */
async function expectXAxisLabelNearPlot(chart: Locator): Promise<void> {
  const label = chart
    .locator("svg > text")
    .filter({ hasText: /^x(?: \(.+\))?$/ });
  await expect(label).toBeVisible();
  await label.scrollIntoViewIfNeeded();

  await expect(async () => {
    const geometry = await label.evaluate((element) => {
      const svg = element.closest("svg");
      const chartElement = svg?.parentElement;
      const axis = svg?.querySelector(":scope > line");
      const ticks = svg?.querySelectorAll(":scope > g > text");
      if (!svg || !chartElement || !axis || !ticks || ticks.length < 5) {
        throw new Error("Expected rendered cartesian axes and tick labels");
      }

      const labelBox = element.getBoundingClientRect();
      const axisBox = axis.getBoundingClientRect();
      const svgBox = svg.getBoundingClientRect();
      const chartBox = chartElement.getBoundingClientRect();
      const tickBottom = Math.max(
        ...Array.from(ticks)
          .slice(0, 5)
          .map((tick) => tick.getBoundingClientRect().bottom),
      );

      return {
        axisWidth: axisBox.width,
        centerOffset: Math.abs(
          labelBox.x + labelBox.width / 2 - (axisBox.x + axisBox.width / 2),
        ),
        tickGap: labelBox.top - tickBottom,
        axisGap: labelBox.bottom - axisBox.bottom,
        clippingMargins: [
          labelBox.left - Math.max(chartBox.left, svgBox.left, 0),
          Math.min(chartBox.right, svgBox.right, window.innerWidth) -
            labelBox.right,
          labelBox.top - Math.max(chartBox.top, svgBox.top, 0),
          Math.min(chartBox.bottom, svgBox.bottom, window.innerHeight) -
            labelBox.bottom,
        ],
      };
    });

    expect(geometry.axisWidth).toBeGreaterThan(0);
    expect(geometry.centerOffset).toBeLessThanOrEqual(1);
    expect(geometry.tickGap).toBeGreaterThan(0);
    expect(geometry.axisGap).toBeLessThanOrEqual(56);
    for (const margin of geometry.clippingMargins) {
      expect(margin).toBeGreaterThanOrEqual(0);
    }
  }).toPass({ timeout: 5_000 });
}

test("cartesian x-axis labels follow the plot when resized between desktop and mobile", async ({
  pyodidePage: page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Example Systems" }).click();
  await page
    .getByRole("button", { name: "Sasian Triplet", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Load Example System" })
    .getByRole("button", { name: "Load", exact: true })
    .click();
  await page.waitForURL("**/");

  for (const plotName of [
    "Wavefront Map",
    "Geometric PSF",
    "Diffraction PSF",
  ]) {
    await page
      .getByRole("combobox", { name: "Plot type" })
      .selectOption({ label: plotName });
    const chart = page.getByRole("img", {
      name: `${plotName} plot`,
      exact: true,
    });
    await expect(chart).toBeVisible({ timeout: 60_000 });
    let previousWidth: number | undefined;

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
      { width: 490, height: 862 },
      { width: 1440, height: 900 },
    ]) {
      await test.step(`${plotName} at ${viewport.width}×${viewport.height}`, async () => {
        await page.setViewportSize(viewport);
        await expect(chart).toBeVisible({ timeout: 60_000 });
        if (previousWidth !== undefined) {
          await expect
            .poll(async () => (await chart.boundingBox())?.width)
            .not.toBe(previousWidth);
        }
        await expectXAxisLabelNearPlot(chart);
        previousWidth = (await chart.boundingBox())?.width;
      });
    }
  }
});
