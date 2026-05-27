import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/settings/page";

const mockSetTheme = jest.fn();
const mockSetOpdAimPoint = jest.fn();

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

jest.mock("@/shared/components/providers/OpdAimPointProvider", () => ({
  useOpdAimPoint: () => ({ opdAimPoint: "chief_ray", setOpdAimPoint: mockSetOpdAimPoint }),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders heading 'Settings'", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders Theme select with correct value", () => {
    render(<SettingsPage />);
    const select = screen.getByLabelText("Theme") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("light");
  });

  it("updates the theme on change", async () => {
    render(<SettingsPage />);
    await userEvent.selectOptions(screen.getByLabelText("Theme"), "dark");
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("theme select wrapper has a max-width class to prevent oversized dropdown", () => {
    render(<SettingsPage />);
    const select = screen.getByLabelText("Theme");
    expect(select.parentElement).toHaveClass("max-w-[12em]");
  });

  it("renders OPD aim point select with chief ray as the default", () => {
    render(<SettingsPage />);
    const select = screen.getByLabelText("OPD aim point") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("chief_ray");
  });

  it("updates the OPD aim point on change", async () => {
    render(<SettingsPage />);
    await userEvent.selectOptions(screen.getByLabelText("OPD aim point"), "centroid");
    expect(mockSetOpdAimPoint).toHaveBeenCalledWith("centroid");
  });
});
