"use client";

import React from "react";
import type { Theme } from "@/shared/tokens/theme";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { type ImagePoint, useImagePoint } from "@/shared/components/providers/ImagePointProvider";
import { Header } from "@/shared/components/primitives/Header";
import { Select } from "@/shared/components/primitives/Select";

const themeOptions: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const imagePointOptions: { value: ImagePoint; label: string }[] = [
  { value: "chief_ray", label: "Chief ray" },
  { value: "centroid", label: "Centroid" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { imagePoint, setImagePoint } = useImagePoint();

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTheme = event.target.value as Theme;
    if (selectedTheme !== theme) {
      setTheme(selectedTheme);
    }
  };

  const handleImagePointChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedImagePoint = event.target.value as ImagePoint;
    if (selectedImagePoint !== imagePoint) {
      setImagePoint(selectedImagePoint);
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
        <label htmlFor="settings-image-point-select" className="block text-sm font-medium mb-2">
          Image point
        </label>
        <Select
          id="settings-image-point-select"
          aria-label="Image point"
          options={imagePointOptions}
          value={imagePoint}
          onChange={handleImagePointChange}
          className="max-w-[12em]"
        />
      </div>
    </div>
  );
}
