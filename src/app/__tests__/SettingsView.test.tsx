import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsView } from "@/app/SettingsView";

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

  it("theme select wrapper has a max-width class to prevent oversized dropdown", () => {
    render(<SettingsView {...defaultProps} />);
    const select = screen.getByLabelText("Theme");
    expect(select.parentElement).toHaveClass("max-w-[12em]");
  });
});
