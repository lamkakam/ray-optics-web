"use client";

import React from "react";
import type { Theme } from "@/shared/tokens/theme";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { Header } from "@/shared/components/primitives/Header";
import { Select } from "@/shared/components/primitives/Select";

const themeOptions: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTheme = event.target.value as Theme;
    if (selectedTheme !== theme) {
      setTheme(selectedTheme);
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
    </div>
  );
}
