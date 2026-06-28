import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/settings/page";

const mockSetTheme = jest.fn();
const mockSetImagePoint = jest.fn();

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

jest.mock("@/shared/components/providers/ImagePointProvider", () => ({
  useImagePoint: () => ({ imagePoint: "chief_ray", setImagePoint: mockSetImagePoint }),
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

  it("renders Image point select with chief ray as the default", () => {
    render(<SettingsPage />);
    const select = screen.getByLabelText("Image point") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("chief_ray");
  });

  it("updates the Image point on change", async () => {
    render(<SettingsPage />);
    await userEvent.selectOptions(screen.getByLabelText("Image point"), "centroid");
    expect(mockSetImagePoint).toHaveBeenCalledWith("centroid");
  });
});
