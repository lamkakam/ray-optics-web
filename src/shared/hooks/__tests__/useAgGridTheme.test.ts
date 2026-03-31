import { renderHook } from "@testing-library/react";
import { useAgGridTheme } from "../useAgGridTheme";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(),
}));

jest.mock("ag-grid-community", () => {
  const withPart = jest.fn((part: unknown) => ({ theme: "quartz", part }));
  const themeQuartz = { withPart };
  const colorSchemeLight = "colorSchemeLight";
  const colorSchemeDark = "colorSchemeDark";
  return { themeQuartz, colorSchemeLight, colorSchemeDark };
});

import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { themeQuartz, colorSchemeDark, colorSchemeLight } from "ag-grid-community";

describe("useAgGridTheme", () => {
  it("returns light theme when theme is light", () => {
    (useTheme as jest.Mock).mockReturnValue({ theme: "light" });

    const { result } = renderHook(() => useAgGridTheme());

    expect(themeQuartz.withPart).toHaveBeenCalledWith(colorSchemeLight);
    expect(result.current).toEqual({ theme: "quartz", part: colorSchemeLight });
  });

  it("returns dark theme when theme is dark", () => {
    (useTheme as jest.Mock).mockReturnValue({ theme: "dark" });

    const { result } = renderHook(() => useAgGridTheme());

    expect(themeQuartz.withPart).toHaveBeenCalledWith(colorSchemeDark);
    expect(result.current).toEqual({ theme: "quartz", part: colorSchemeDark });
  });
});
