import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/settings/page";

const mockSetTheme = jest.fn();

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
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

  it("does not update the theme when the active theme is selected", async () => {
    render(<SettingsPage />);
    await userEvent.selectOptions(screen.getByLabelText("Theme"), "light");
    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it("does not render the Image point selector", () => {
    render(<SettingsPage />);
    expect(screen.queryByLabelText("Image point")).not.toBeInTheDocument();
  });
});
