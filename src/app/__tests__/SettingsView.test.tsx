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
    ["Chromatic Focal Shift", [15, 21, 32, 64], 15],
    ["Wavefront Map", [64, 128, 256], 128],
    ["Geometric PSF", [32, 64, 128, 256], 128],
    ["Diffraction PSF", [64, 128, 256], 128],
    ["Diffraction MTF", [32, 64, 128, 256], 128],
  ] as const;

  beforeEach(() => localStorage.clear());

  it("shows all nine labeled dropdowns with ordered options and defaults", () => {
    render(<SettingsWithStore />);
    expect(
      screen.getByRole("heading", { name: "Analysis ray counts" }),
    ).toBeInTheDocument();
    const section = within(
      screen.getByRole("region", { name: "Analysis ray counts" }),
    );
    for (const [name, options, defaultValue] of settings) {
      const select = section.getByRole("combobox", { name });
      expect(section.getByLabelText(name)).toBe(select);
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

describe("analysis wavelength sample count settings", () => {
  const settings = [
    ["Strehl vs Wavelength", [50, 100, 200, 400], 100],
    ["Chromatic Focal Shift", [50, 100, 200], 50],
  ] as const;

  beforeEach(() => localStorage.clear());

  it("shows a labeled section with ordered sample-count options and defaults", () => {
    render(<SettingsWithStore />);
    const section = within(
      screen.getByRole("region", { name: "Analysis wavelength sample counts" }),
    );
    expect(
      section.getByRole("heading", {
        name: "Analysis wavelength sample counts",
      }),
    ).toBeInTheDocument();
    expect(section.getAllByRole("combobox")).toHaveLength(settings.length);
    for (const [label, options, defaultValue] of settings) {
      const select = section.getByRole("combobox", {
        name: `${label} wavelength samples`,
      });
      expect(section.getByText(label)).toBeInTheDocument();
      expect(select).toHaveValue(String(defaultValue));
      expect(
        within(select)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(options.map((n) => `${n} samples`));
    }
  });

  it("updates independently of ray counts and restores selections in a fresh provider", async () => {
    const view = render(<SettingsWithStore />);
    await userEvent.selectOptions(
      screen.getByRole("combobox", {
        name: "Strehl vs Wavelength wavelength samples",
      }),
      "400",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", {
        name: "Chromatic Focal Shift wavelength samples",
      }),
      "200",
    );
    expect(
      screen.getByRole("combobox", { name: "Strehl vs Wavelength" }),
    ).toHaveValue("21");
    view.unmount();
    render(<SettingsWithStore />);
    expect(
      screen.getByRole("combobox", {
        name: "Strehl vs Wavelength wavelength samples",
      }),
    ).toHaveValue("400");
    expect(
      screen.getByRole("combobox", {
        name: "Chromatic Focal Shift wavelength samples",
      }),
    ).toHaveValue("200");
  });
});
