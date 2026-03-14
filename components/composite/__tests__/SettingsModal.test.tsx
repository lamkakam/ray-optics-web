import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsModal } from "@/components/composite/SettingsModal";

describe("SettingsModal", () => {
  it("does not render when isOpen=false", () => {
    render(<SettingsModal isOpen={false} theme="light" onThemeChange={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when isOpen=true", () => {
    render(<SettingsModal isOpen={true} theme="light" onThemeChange={() => {}} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders title 'Settings'", () => {
    render(<SettingsModal isOpen={true} theme="light" onThemeChange={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders a theme select with Light/Dark options", () => {
    render(<SettingsModal isOpen={true} theme="light" onThemeChange={() => {}} onClose={() => {}} />);
    const select = screen.getByRole("combobox", { name: "Theme" });
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Dark" })).toBeInTheDocument();
  });

  it("select shows current theme value", () => {
    render(<SettingsModal isOpen={true} theme="dark" onThemeChange={() => {}} onClose={() => {}} />);
    const select = screen.getByRole("combobox", { name: "Theme" });
    expect(select).toHaveValue("dark");
  });

  it("changing select calls onThemeChange", async () => {
    const onThemeChange = jest.fn();
    render(<SettingsModal isOpen={true} theme="light" onThemeChange={onThemeChange} onClose={() => {}} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Theme" }), "dark");
    expect(onThemeChange).toHaveBeenCalledTimes(1);
  });

  it("'Ok' button calls onClose", async () => {
    const onClose = jest.fn();
    render(<SettingsModal isOpen={true} theme="light" onThemeChange={() => {}} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Ok" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
