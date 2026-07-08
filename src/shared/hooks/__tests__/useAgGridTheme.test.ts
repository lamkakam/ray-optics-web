import { renderHook } from "@testing-library/react";
import { useAgGridTheme } from "../useAgGridTheme";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(),
}));

jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: jest.fn(),
}));

jest.mock("ag-grid-community", () => {
  const withParams = jest.fn((params: unknown) => ({ theme: "quartz", params }));
  const withPart = jest.fn((part: unknown) => ({ theme: "quartz", part, withParams }));
  const themeQuartz = { withPart };
  const colorSchemeLight = "colorSchemeLight";
  const colorSchemeDark = "colorSchemeDark";
  return { themeQuartz, colorSchemeLight, colorSchemeDark };
});

import { useTheme } from "@/shared/components/providers/ThemeProvider";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { themeQuartz, colorSchemeDark, colorSchemeLight } from "ag-grid-community";

describe("useAgGridTheme", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useScreenBreakpoint as jest.Mock).mockReturnValue("screenLG");
  });

  it("returns light theme when theme is light", () => {
    (useTheme as jest.Mock).mockReturnValue({ theme: "light" });

    const { result } = renderHook(() => useAgGridTheme());

    expect(themeQuartz.withPart).toHaveBeenCalledWith(colorSchemeLight);
    expect(result.current).toMatchObject({ theme: "quartz", part: colorSchemeLight });
  });

  it("returns dark theme when theme is dark", () => {
    (useTheme as jest.Mock).mockReturnValue({ theme: "dark" });

    const { result } = renderHook(() => useAgGridTheme());

    expect(themeQuartz.withPart).toHaveBeenCalledWith(colorSchemeDark);
    expect(result.current).toMatchObject({ theme: "quartz", part: colorSchemeDark });
  });

  it("applies 16px font size params on small screens", () => {
    (useTheme as jest.Mock).mockReturnValue({ theme: "light" });
    (useScreenBreakpoint as jest.Mock).mockReturnValue("screenSM");

    const { result } = renderHook(() => useAgGridTheme());

    const themedGrid = (themeQuartz.withPart as jest.Mock).mock.results[0].value;
    expect(themedGrid.withParams).toHaveBeenCalledWith({ fontSize: 16 });
    expect(result.current).toEqual({ theme: "quartz", params: { fontSize: 16 } });
  });

  it("does not apply font size params on large screens", () => {
    (useTheme as jest.Mock).mockReturnValue({ theme: "light" });

    renderHook(() => useAgGridTheme());

    const themedGrid = (themeQuartz.withPart as jest.Mock).mock.results[0].value;
    expect(themedGrid.withParams).not.toHaveBeenCalled();
  });
});
