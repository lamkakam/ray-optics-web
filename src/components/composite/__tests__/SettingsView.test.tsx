import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsView } from "@/components/composite/SettingsView";

describe("SettingsView", () => {
  const defaultProps = {
    theme: "light" as const,
    onThemeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders heading 'Settings'", () => {
    render(<SettingsView {...defaultProps} />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders Theme select with correct value", () => {
    render(<SettingsView {...defaultProps} />);
    const select = screen.getByLabelText("Theme") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("light");
  });

  it("calls onThemeChange on change", async () => {
    const onThemeChange = jest.fn();
    render(<SettingsView theme="light" onThemeChange={onThemeChange} />);
    await userEvent.selectOptions(screen.getByLabelText("Theme"), "dark");
    expect(onThemeChange).toHaveBeenCalledTimes(1);
  });
});
