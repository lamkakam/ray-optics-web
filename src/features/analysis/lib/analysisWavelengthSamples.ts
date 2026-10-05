/** Ordered application settings: counts are uniformly spaced wavelength samples across each plot's analysis range. */
export const ANALYSIS_WAVELENGTH_SAMPLE_SETTINGS = [
  {
    plotType: "strehlVsWavelength",
    label: "Strehl vs Wavelength",
    options: [50, 100, 200, 400],
    defaultValue: 100,
  },
  {
    plotType: "chromaticFocalShift",
    label: "Chromatic Focal Shift",
    options: [50, 100, 200],
    defaultValue: 50,
  },
] as const;

/** Plot types with an independently configurable wavelength sample count. */
export type WavelengthSampledPlot =
  (typeof ANALYSIS_WAVELENGTH_SAMPLE_SETTINGS)[number]["plotType"];
/** App-wide wavelength sample preferences, separate from ray counts and optical-model configuration. */
export type AnalysisWavelengthSampleCounts = Readonly<
  Record<WavelengthSampledPlot, number>
>;

/** Factory defaults: 100 Strehl samples and 50 chromatic-focal-shift samples. */
export const DEFAULT_ANALYSIS_WAVELENGTH_SAMPLE_COUNTS = Object.fromEntries(
  ANALYSIS_WAVELENGTH_SAMPLE_SETTINGS.map(({ plotType, defaultValue }) => [
    plotType,
    defaultValue,
  ]),
) as AnalysisWavelengthSampleCounts;

/** Storage contains only the wavelength sample preferences. */
const STORAGE_KEY = "ray-optics-web-analysis-wavelength-samples";

/** Accepts only an integer offered by the selected plot's dropdown. */
export function isAnalysisWavelengthSampleCount(
  plotType: WavelengthSampledPlot,
  value: unknown,
): value is number {
  return ANALYSIS_WAVELENGTH_SAMPLE_SETTINGS.some(
    (setting) =>
      setting.plotType === plotType &&
      (setting.options as readonly unknown[]).includes(value),
  );
}

/** Restores each valid entry independently; inaccessible or malformed storage uses defaults. */
export function restoreAnalysisWavelengthSampleCounts(): AnalysisWavelengthSampleCounts {
  const counts = { ...DEFAULT_ANALYSIS_WAVELENGTH_SAMPLE_COUNTS };
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    if (typeof stored !== "object" || stored === null || Array.isArray(stored))
      return counts;
    for (const { plotType } of ANALYSIS_WAVELENGTH_SAMPLE_SETTINGS) {
      const value = (stored as Record<string, unknown>)[plotType];
      if (isAnalysisWavelengthSampleCount(plotType, value))
        counts[plotType] = value;
    }
  } catch {
    // Storage may be unavailable during rendering or in restricted browsers.
  }
  return counts;
}

/** Saves preferences when possible; storage errors never prevent session updates. */
export function persistAnalysisWavelengthSampleCounts(
  counts: AnalysisWavelengthSampleCounts,
): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // The in-memory store remains usable if storage is disabled or full.
  }
}
