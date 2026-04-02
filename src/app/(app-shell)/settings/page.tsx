"use client";

import React from "react";
import type { Theme } from "@/shared/tokens/theme";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { SettingsView } from "@/app/pages/SettingsView";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTheme = event.target.value as Theme;
    if (selectedTheme !== theme) {
      setTheme(selectedTheme);
    }
  };

  return (
    <SettingsView
      theme={theme}
      onThemeChange={handleThemeChange}
    />
  );
}
