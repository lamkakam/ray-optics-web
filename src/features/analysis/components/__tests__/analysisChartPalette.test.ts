import { ANALYSIS_HEATMAP_COLOR_PALETTE } from "@/features/analysis/components/analysisChartPalette";

const EXPECTED_VIRIDIS_PALETTE = [
  "#5b2a86",
  "#5a3d9a",
  "#4f4aa8",
  "#4557b2",
  "#3f63b8",
  "#2d708e",
  "#25858e",
  "#1e9b8a",
  "#2ab07f",
  "#52c569",
  "#86d549",
] as const;

const DARK_THEME_BACKGROUND = "#111827";

function parseHexChannel(hexColor: string, offset: number): number {
  return Number.parseInt(hexColor.slice(offset, offset + 2), 16) / 255;
}

function toLinearRgb(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(hexColor: string): number {
  const red = toLinearRgb(parseHexChannel(hexColor, 1));
  const green = toLinearRgb(parseHexChannel(hexColor, 3));
  const blue = toLinearRgb(parseHexChannel(hexColor, 5));

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getContrastRatio(firstColor: string, secondColor: string): number {
  const firstLuminance = getRelativeLuminance(firstColor);
  const secondLuminance = getRelativeLuminance(secondColor);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe("analysisChartPalette", () => {
  it("uses the shared 11-step viridis palette", () => {
    expect(ANALYSIS_HEATMAP_COLOR_PALETTE).toEqual(EXPECTED_VIRIDIS_PALETTE);
  });

  it("progresses from darker to lighter colors without duplicates", () => {
    expect(new Set(ANALYSIS_HEATMAP_COLOR_PALETTE).size).toBe(ANALYSIS_HEATMAP_COLOR_PALETTE.length);

    for (let index = 1; index < ANALYSIS_HEATMAP_COLOR_PALETTE.length; index += 1) {
      const previousLuminance = getRelativeLuminance(ANALYSIS_HEATMAP_COLOR_PALETTE[index - 1]);
      const currentLuminance = getRelativeLuminance(ANALYSIS_HEATMAP_COLOR_PALETTE[index]);

      expect(currentLuminance).toBeGreaterThan(previousLuminance);
    }
  });

  it("keeps every stop readable against the dark theme background", () => {
    for (const color of ANALYSIS_HEATMAP_COLOR_PALETTE) {
      expect(getContrastRatio(color, DARK_THEME_BACKGROUND)).toBeGreaterThanOrEqual(1.75);
    }
  });
});
