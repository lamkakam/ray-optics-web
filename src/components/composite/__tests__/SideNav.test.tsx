import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SideNav } from "@/components/composite/SideNav";
import type { AppView } from "@/lib/appView";

describe("SideNav", () => {
  const defaultProps = {
    isOpen: true,
    isLG: false,
    currentView: "home" as AppView,
    onClose: jest.fn(),
    onNavigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when closed", () => {
    const { container } = render(<SideNav {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows nav with items when open", () => {
    render(<SideNav {...defaultProps} />);
    expect(screen.getByRole("navigation", { name: "Side navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lens Editor" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
  });

  it("close button calls onClose", async () => {
    const onClose = jest.fn();
    render(<SideNav {...defaultProps} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Lens Editor item calls onNavigate with 'home'", async () => {
    const onNavigate = jest.fn();
    render(<SideNav {...defaultProps} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("link", { name: "Lens Editor" }));
    expect(onNavigate).toHaveBeenCalledWith("home");
  });

  it("Settings item calls onNavigate with 'settings'", async () => {
    const onNavigate = jest.fn();
    render(<SideNav {...defaultProps} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("link", { name: "Settings" }));
    expect(onNavigate).toHaveBeenCalledWith("settings");
  });

  it("Privacy Policy item calls onNavigate with 'privacy-policy'", async () => {
    const onNavigate = jest.fn();
    render(<SideNav {...defaultProps} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("link", { name: "Privacy Policy" }));
    expect(onNavigate).toHaveBeenCalledWith("privacy-policy");
  });

  it("About item calls onNavigate with 'about'", async () => {
    const onNavigate = jest.fn();
    render(<SideNav {...defaultProps} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("link", { name: "About" }));
    expect(onNavigate).toHaveBeenCalledWith("about");
  });

  it("has w-[33vw] on LG", () => {
    render(<SideNav {...defaultProps} isLG={true} />);
    const nav = screen.getByRole("navigation", { name: "Side navigation" });
    expect(nav).toHaveClass("w-[33vw]");
  });

  it("has w-[50vw] on SM", () => {
    render(<SideNav {...defaultProps} isLG={false} />);
    const nav = screen.getByRole("navigation", { name: "Side navigation" });
    expect(nav).toHaveClass("w-[50vw]");
  });

  it("active item has aria-current='page'", () => {
    render(<SideNav {...defaultProps} currentView="settings" />);
    const settingsLink = screen.getByRole("link", { name: "Settings" });
    expect(settingsLink).toHaveAttribute("aria-current", "page");
  });

  it("inactive items do not have aria-current", () => {
    render(<SideNav {...defaultProps} currentView="settings" />);
    const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });
    expect(privacyLink).not.toHaveAttribute("aria-current");
  });
});
