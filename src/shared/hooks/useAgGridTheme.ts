"use client";

import { useMemo } from "react";
import { themeQuartz, colorSchemeDark, colorSchemeLight } from "ag-grid-community";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";

export function useAgGridTheme() {
  const { theme } = useTheme();
  const screenSize = useScreenBreakpoint();

  return useMemo(
    () => {
      const themedGrid = theme === "dark"
        ? themeQuartz.withPart(colorSchemeDark)
        : themeQuartz.withPart(colorSchemeLight);

      return screenSize === "screenSM"
        ? themedGrid.withParams({ fontSize: 16 })
        : themedGrid;
    },
    [screenSize, theme],
  );
}
