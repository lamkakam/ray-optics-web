import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Layout } from "@/shared/components/layout/Layout";

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
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <nav aria-label="Side navigation">
        <button onClick={onClose}>Close navigation</button>
      </nav>
    ) : null,
}));

const defaultProps = {
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

  it("side nav closes when its close handler is triggered", async () => {
    render(<Layout {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    await userEvent.click(screen.getByRole("button", { name: "Close navigation" }));
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
});
