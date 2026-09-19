import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/settings/page";
import { AnalysisPlotStoreProvider } from "@/features/analysis/providers/AnalysisPlotStoreProvider";

function SettingsWithStore() {
  return (
    <AnalysisPlotStoreProvider>
      <SettingsPage />
    </AnalysisPlotStoreProvider>
  );
}

const mockSetTheme = jest.fn();

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("renders heading 'Settings'", () => {
    render(<SettingsWithStore />);
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("renders Theme select with correct value", () => {
    render(<SettingsWithStore />);
    const select = screen.getByLabelText("Theme") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("light");
  });

  it("updates the theme on change", async () => {
    render(<SettingsWithStore />);
    await userEvent.selectOptions(screen.getByLabelText("Theme"), "dark");
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("does not update the theme when the active theme is selected", async () => {
    render(<SettingsWithStore />);
    await userEvent.selectOptions(screen.getByLabelText("Theme"), "light");
    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("does not render the Image point selector", () => {
    render(<SettingsWithStore />);
    expect(screen.queryByLabelText("Image point")).not.toBeInTheDocument();
  });
});

describe("analysis ray count settings", () => {
  const settings = [
    ["Ray Fan", [21, 32, 64, 128], 21],
    ["OPD Fan", [21, 32, 64, 128], 21],
    ["Spot Diagram", [21, 32, 64, 128], 21],
    ["Strehl vs Wavelength", [21, 32, 64, 128], 21],
    ["Wavefront Map", [64, 128, 256], 128],
    ["Geometric PSF", [32, 64, 128, 256], 128],
    ["Diffraction PSF", [64, 128, 256], 128],
    ["Diffraction MTF", [32, 64, 128, 256], 128],
  ] as const;

  beforeEach(() => localStorage.clear());

  it("shows all eight labeled dropdowns with ordered options and defaults", () => {
    render(<SettingsWithStore />);
    expect(
      screen.getByRole("heading", { name: "Analysis ray counts" }),
    ).toBeInTheDocument();
    for (const [name, options, defaultValue] of settings) {
      const select = screen.getByRole("combobox", { name });
      expect(screen.getByLabelText(name)).toBe(select);
      expect(select).toHaveValue(String(defaultValue));
      expect(
        within(select)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(options.map((n) => `${n} x ${n}`));
    }
  });

  it("updates independently and restores selections in a fresh provider", async () => {
    const view = render(<SettingsWithStore />);
    for (const [name] of settings) {
      await userEvent.selectOptions(
        screen.getByRole("combobox", { name }),
        "64",
      );
      expect(screen.getByRole("combobox", { name })).toHaveValue("64");
    }
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Ray Fan" }),
      "32",
    );
    view.unmount();
    render(<SettingsWithStore />);
    for (const [name] of settings) {
      expect(screen.getByRole("combobox", { name })).toHaveValue(
        name === "Ray Fan" ? "32" : "64",
      );
    }
  });
});
