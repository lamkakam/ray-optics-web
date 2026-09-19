"use client";

import type React from "react";
import { useStore } from "zustand";
import { useAnalysisPlotStore } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { ANALYSIS_RAY_COUNT_SETTINGS } from "@/features/analysis/lib/analysisRayCounts";
import type { Theme } from "@/shared/tokens/theme";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { Header } from "@/shared/components/primitives/Header";
import { Select } from "@/shared/components/primitives/Select";

const themeOptions: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 *
 * ## Behaviour
 * - Reads `theme` and `setTheme` from `ThemeProvider`
 * - Adapts the `<select>` change event into the `Theme` union
 * - Renders the Settings heading and theme selector inline in the route file
 * - Shows eight independent persisted analysis ray-count selectors below Theme; counts are per fan axis or grid dimension.
 * - Uses the shared `Select` primitive with bounded width for layout stability
 * - Does not render the Image point selector; image reference selection lives in the Lens Editor drawer's `Image Reference` tab
 */
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const analysisStore = useAnalysisPlotStore();
  const rayCounts = useStore(analysisStore, (state) => state.rayCounts);

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTheme = event.target.value as Theme;
    if (selectedTheme !== theme) {
      setTheme(selectedTheme);
    }
  };

  return (
    <div className="p-6">
      <Header level={2} className="mb-4">
        Settings
      </Header>
      <div className="mb-6">
        <label
          htmlFor="settings-theme-select"
          className="block text-sm font-medium mb-2"
        >
          Theme
        </label>
        <Select
          id="settings-theme-select"
          aria-label="Theme"
          options={themeOptions}
          value={theme}
          onChange={handleThemeChange}
          className="max-w-[12em]"
        />
      </div>
      <section aria-labelledby="analysis-ray-counts-heading">
        <Header level={3} id="analysis-ray-counts-heading" className="mb-4">
          Analysis ray counts
        </Header>
        {ANALYSIS_RAY_COUNT_SETTINGS.map(({ plotType, label, options }) => (
          <div key={plotType} className="mb-4">
            <label
              htmlFor={`settings-rays-${plotType}`}
              className="block text-sm font-medium mb-2"
            >
              {label}
            </label>
            <Select
              id={`settings-rays-${plotType}`}
              aria-label={label}
              options={options.map((n) => ({ value: n, label: `${n} x ${n}` }))}
              value={rayCounts[plotType]}
              onChange={(event) =>
                analysisStore
                  .getState()
                  .setRayCount(plotType, Number(event.target.value))
              }
              className="max-w-[12em]"
            />
          </div>
        ))}
      </section>
    </div>
  );
}
