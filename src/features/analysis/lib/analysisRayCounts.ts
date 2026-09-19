/** Ordered application settings: counts are samples per fan axis or grid dimension. */
export const ANALYSIS_RAY_COUNT_SETTINGS = [
  {
    plotType: "rayFan",
    label: "Ray Fan",
    options: [21, 32, 64, 128],
    defaultValue: 21,
  },
  {
    plotType: "opdFan",
    label: "OPD Fan",
    options: [21, 32, 64, 128],
    defaultValue: 21,
  },
  {
    plotType: "spotDiagram",
    label: "Spot Diagram",
    options: [21, 32, 64, 128],
    defaultValue: 21,
  },
  {
    plotType: "strehlVsWavelength",
    label: "Strehl vs Wavelength",
    options: [21, 32, 64, 128],
    defaultValue: 21,
  },
  {
    plotType: "wavefrontMap",
    label: "Wavefront Map",
    options: [64, 128, 256],
    defaultValue: 128,
  },
  {
    plotType: "geoPSF",
    label: "Geometric PSF",
    options: [32, 64, 128, 256],
    defaultValue: 128,
  },
  {
    plotType: "diffractionPSF",
    label: "Diffraction PSF",
    options: [64, 128, 256],
    defaultValue: 128,
  },
  {
    plotType: "diffractionMTF",
    label: "Diffraction MTF",
    options: [32, 64, 128, 256],
    defaultValue: 128,
  },
] as const;

/** Plot types with independently configurable sampling. */
export type ConfigurableAnalysisPlot =
  (typeof ANALYSIS_RAY_COUNT_SETTINGS)[number]["plotType"];
/** App-wide preferences, separate from optical-model and optimization configuration. */
export type AnalysisRayCounts = Readonly<
  Record<ConfigurableAnalysisPlot, number>
>;

/** Factory defaults preserve the existing analysis sampling resolutions. */
export const DEFAULT_ANALYSIS_RAY_COUNTS = Object.fromEntries(
  ANALYSIS_RAY_COUNT_SETTINGS.map(({ plotType, defaultValue }) => [
    plotType,
    defaultValue,
  ]),
) as AnalysisRayCounts;

/** Storage contains only the eight preferences, without transient analysis data. */
const STORAGE_KEY = "ray-optics-web-analysis-ray-counts";

/** Accepts only an integer offered by the selected plot's dropdown. */
export function isAnalysisRayCount(
  plotType: ConfigurableAnalysisPlot,
  value: unknown,
): value is number {
  return ANALYSIS_RAY_COUNT_SETTINGS.some(
    (setting) =>
      setting.plotType === plotType &&
      (setting.options as readonly unknown[]).includes(value),
  );
}

/** Restores each valid entry independently; inaccessible or malformed storage uses defaults. */
export function restoreAnalysisRayCounts(): AnalysisRayCounts {
  const counts = { ...DEFAULT_ANALYSIS_RAY_COUNTS };
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}",
    );
    if (typeof stored !== "object" || stored === null || Array.isArray(stored))
      return counts;
    for (const { plotType } of ANALYSIS_RAY_COUNT_SETTINGS) {
      const value = (stored as Record<string, unknown>)[plotType];
      if (isAnalysisRayCount(plotType, value)) counts[plotType] = value;
    }
  } catch {
    // Storage may be unavailable during rendering or in restricted browsers.
  }
  return counts;
}

/** Saves preferences when possible; storage errors never prevent session updates. */
export function persistAnalysisRayCounts(counts: AnalysisRayCounts): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // The in-memory store remains usable if storage is disabled or full.
  }
}
