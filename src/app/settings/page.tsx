"use client";

import React from "react";
import type { Theme } from "@/shared/tokens/theme";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { type OpdAimPoint, useOpdAimPoint } from "@/shared/components/providers/OpdAimPointProvider";
import { Header } from "@/shared/components/primitives/Header";
import { Select } from "@/shared/components/primitives/Select";

const themeOptions: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const opdAimPointOptions: { value: OpdAimPoint; label: string }[] = [
  { value: "chief_ray", label: "Chief ray" },
  { value: "centroid", label: "Centroid" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { opdAimPoint, setOpdAimPoint } = useOpdAimPoint();

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTheme = event.target.value as Theme;
    if (selectedTheme !== theme) {
      setTheme(selectedTheme);
    }
  };

  const handleOpdAimPointChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOpdAimPoint = event.target.value as OpdAimPoint;
    if (selectedOpdAimPoint !== opdAimPoint) {
      setOpdAimPoint(selectedOpdAimPoint);
    }
  };

  return (
    <div className="p-6">
      <Header level={2} className="mb-4">Settings</Header>
      <div className="mb-6">
        <label htmlFor="settings-theme-select" className="block text-sm font-medium mb-2">
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
      <div className="mb-6">
        <label htmlFor="settings-opd-aim-point-select" className="block text-sm font-medium mb-2">
          OPD aim point
        </label>
        <Select
          id="settings-opd-aim-point-select"
          aria-label="OPD aim point"
          options={opdAimPointOptions}
          value={opdAimPoint}
          onChange={handleOpdAimPointChange}
          className="max-w-[12em]"
        />
      </div>
    </div>
  );
}
