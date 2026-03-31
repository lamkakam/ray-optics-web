import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Layout } from "@/shared/components/layout/Layout";
import type { AppView } from "@/shared/lib/types/appView";

// Mock useScreenBreakpoint (default: screenSM)
import type { ScreenSize } from "@/shared/hooks/useScreenBreakpoint";
const mockScreenSize = { value: "screenSM" as ScreenSize };
jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: () => mockScreenSize.value,
}));

// Mock SideNav to avoid rendering its internals, but still expose navigation links
jest.mock("@/shared/components/layout/SideNav", () => ({
  SideNav: ({
    isOpen,
    onNavigate,
  }: {
    isOpen: boolean;
    onNavigate: (view: AppView) => void;
  }) =>
    isOpen ? (
      <nav aria-label="Side navigation">
        <button onClick={() => onNavigate("settings")}>Settings</button>
      </nav>
    ) : null,
}));

const defaultProps = {
  currentView: "home" as AppView,
  onNavigate: jest.fn(),
  errorModal: null,
  initOverlayNode: null,
  children: <div>child content</div>,
};

describe("Layout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScreenSize.value = "screenSM";
  });

  it("renders header with 'Ray Optics Web' title", () => {
    render(<Layout {...defaultProps} />);
    expect(screen.getByText("Ray Optics Web")).toBeInTheDocument();
  });

  it("renders hamburger button with aria-label='Open navigation'", () => {
    render(<Layout {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Open navigation" })
    ).toBeInTheDocument();
  });

  it("renders children inside the layout", () => {
    render(<Layout {...defaultProps} />);
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("clicking hamburger opens side nav", async () => {
    render(<Layout {...defaultProps} />);
    expect(
      screen.queryByRole("navigation", { name: "Side navigation" })
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen.getByRole("navigation", { name: "Side navigation" })
    ).toBeInTheDocument();
  });

  it("clicking hamburger again closes side nav", async () => {
    render(<Layout {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen.getByRole("navigation", { name: "Side navigation" })
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen.queryByRole("navigation", { name: "Side navigation" })
    ).not.toBeInTheDocument();
  });

  it("onNavigate is called and side nav closes when a nav link is clicked", async () => {
    const onNavigate = jest.fn();
    render(<Layout {...defaultProps} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onNavigate).toHaveBeenCalledWith("settings");
    expect(
      screen.queryByRole("navigation", { name: "Side navigation" })
    ).not.toBeInTheDocument();
  });

  it("SM layout: outer container has h-full (not h-screen) so layout fills the locked html/body height", () => {
    mockScreenSize.value = "screenSM";
    const { container } = render(<Layout {...defaultProps} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass("h-full");
    expect(outerDiv).not.toHaveClass("h-screen");
  });

  it("LG layout: outer container has h-full (not h-screen) so layout fills the locked html/body height", () => {
    mockScreenSize.value = "screenLG";
    const { container } = render(<Layout {...defaultProps} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass("h-full");
    expect(outerDiv).not.toHaveClass("h-screen");
  });

  it("SM layout: inner container has flex-1 and min-h-0 so SideNav inherits full height", () => {
    mockScreenSize.value = "screenSM";
    const { container } = render(<Layout {...defaultProps} />);
    const outerDiv = container.firstChild as HTMLElement;
    // Second child of outer div is the inner content wrapper (after <header>)
    const innerDiv = outerDiv.children[1] as HTMLElement;
    expect(innerDiv).toHaveClass("flex-1");
    expect(innerDiv).toHaveClass("min-h-0");
  });

  it("renders errorModal node", () => {
    render(
      <Layout {...defaultProps} errorModal={<div role="dialog">error</div>} />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("renders initOverlayNode", () => {
    render(
      <Layout
        {...defaultProps}
        initOverlayNode={<div data-testid="loading-overlay">loading</div>}
      />
    );
    expect(screen.getByTestId("loading-overlay")).toBeInTheDocument();
  });
});
