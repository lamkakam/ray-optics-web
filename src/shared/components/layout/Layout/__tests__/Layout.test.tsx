import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Layout } from "@/shared/components/layout/Layout";

// Mock useScreenBreakpoint (default: screenSM)
import type { ScreenSize } from "@/shared/hooks/useScreenBreakpoint";
const mockScreenSize = { value: "screenSM" as ScreenSize };
jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: () => mockScreenSize.value,
}));

/** Minimal SideNav harness that preserves the open, breakpoint, and navigation contracts. */
jest.mock("@/shared/components/layout/SideNav", () => ({
  SideNav: ({
    isOpen,
    onClose,
    isLG,
    onNavigate,
  }: {
    isOpen: boolean;
    onClose: () => void;
    isLG: boolean;
    onNavigate?: (href: string, event: React.MouseEvent<HTMLAnchorElement>) => boolean;
  }) =>
    isOpen ? (
      <nav aria-label="Side navigation" data-screen={isLG ? "screenLG" : "screenSM"}>
        <button>Inside navigation</button>
        <button onClick={onClose}>Close navigation</button>
        <a
          href="/settings"
          onClick={(event) => {
            if (onNavigate?.("/settings", event) === false) return;
            onClose();
          }}
        >
          Settings
        </a>
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

  it("forwards accepted and blocked navigation through the side nav", async () => {
    const onNavigate = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<Layout {...defaultProps} onNavigate={onNavigate} />);
    const hamburger = screen.getByRole("button", { name: "Open navigation" });

    await userEvent.click(hamburger);
    await userEvent.click(screen.getByRole("link", { name: "Settings" }));
    expect(onNavigate).toHaveBeenCalledWith("/settings", expect.any(Object));
    expect(screen.getByRole("navigation", { name: "Side navigation" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Settings" }));
    expect(screen.queryByRole("navigation", { name: "Side navigation" })).not.toBeInTheDocument();
  });

  it("closes side nav on pointer interaction with child content outside the nav", async () => {
    render(<Layout {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    fireEvent.pointerDown(screen.getByText("child content"));

    expect(
      screen.queryByRole("navigation", { name: "Side navigation" })
    ).not.toBeInTheDocument();
  });

  it("keeps side nav open on pointer interaction inside the nav", async () => {
    render(<Layout {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    fireEvent.pointerDown(screen.getByRole("button", { name: "Inside navigation" }));

    expect(
      screen.getByRole("navigation", { name: "Side navigation" })
    ).toBeInTheDocument();
  });

  it("ignores a captured pointer event whose target is not a DOM node", async () => {
    const addEventListener = jest.spyOn(document, "addEventListener");
    render(<Layout {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    const listener = addEventListener.mock.calls.find(
      ([type, _handler, capture]) => type === "pointerdown" && capture === true,
    )?.[1];
    expect(listener).toBeDefined();

    expect(() => (listener as (event: PointerEvent) => void)({ target: {} } as PointerEvent)).not.toThrow();
    expect(screen.getByRole("navigation", { name: "Side navigation" })).toBeInTheDocument();

    addEventListener.mockRestore();
  });

  it("installs outside dismissal only while open and removes the captured listener", async () => {
    const addEventListener = jest.spyOn(document, "addEventListener");
    const removeEventListener = jest.spyOn(document, "removeEventListener");
    render(<Layout {...defaultProps} />);
    expect(addEventListener).not.toHaveBeenCalledWith("pointerdown", expect.any(Function), true);

    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(addEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function), true);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(removeEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function), true);

    addEventListener.mockRestore();
    removeEventListener.mockRestore();
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
