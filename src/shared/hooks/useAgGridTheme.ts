"use client";
/** Responsive light/dark AG Grid theming shared by editable grids. */

import { useMemo } from "react";
import { themeQuartz, colorSchemeDark, colorSchemeLight } from "ag-grid-community";
import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";

/**
 * Derive the correct AG Grid theme object from the app's current light/dark theme setting and responsive breakpoint, so AG Grid tables automatically match the rest of the UI.
 *
 * @remarks
 * ## Behavior
 *
 * 1. Reads the current theme string (`"dark"` or `"light"`) from `useTheme()` (provided by `ThemeProvider`).
 * 2. Reads the current breakpoint (`"screenSM"` or `"screenLG"`) from `useScreenBreakpoint()`.
 * 3. Applies the matching AG Grid color scheme via `.withPart()`.
 * 4. On `screenSM`, applies `.withParams({ fontSize: 16 })` so grid text inputs/select editors render at 16 px on small screens.
 * 5. Returns a memoised theme object — recomputed only when `theme` or `screenSize` changes.
 *
 * ## Edge Cases / Error Handling
 *
 * - Any value of `theme` that is not `"dark"` falls through to the light scheme (safe default).
 * - The memoised value is stable across re-renders when `theme` and `screenSize` do not change, preventing unnecessary AG Grid re-renders.
 *
 * The theme automatically responds to light/dark mode changes from `ThemeProvider`.
 */
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
