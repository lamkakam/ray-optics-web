"use client";

import React from "react";
import type { Theme } from "@/lib/theme";
import { Header } from "@/components/micro/Header";
import { Select } from "@/components/micro/Select";

interface SettingsViewProps {
  readonly theme: Theme;
  readonly onThemeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const themeOptions: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function SettingsView({ theme, onThemeChange }: SettingsViewProps) {
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
          onChange={onThemeChange}
          className="max-w-[12em]"
        />
      </div>
    </div>
  );
}
