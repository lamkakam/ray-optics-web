"use client";

import { useMemo } from "react";
import { themeQuartz, colorSchemeDark, colorSchemeLight } from "ag-grid-community";
import { useTheme } from "@/components/ThemeProvider";

export function useAgGridTheme() {
  const { theme } = useTheme();
  return useMemo(
    () =>
      theme === "dark"
        ? themeQuartz.withPart(colorSchemeDark)
        : themeQuartz.withPart(colorSchemeLight),
    [theme],
  );
}
