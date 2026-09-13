import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { SideNav } from "@/shared/components/layout/SideNav";

let mockSelectedSegment: string | null = null;

jest.mock("next/navigation", () => ({
  useSelectedLayoutSegment: () => mockSelectedSegment,
}));

jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    readonly href: string;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe("SideNav", () => {
  beforeEach(() => {
    mockSelectedSegment = null;
  });

  it("renders route links for all app destinations", () => {
    render(<SideNav isOpen={true} isLG={false} onClose={jest.fn()} />);

    expect(screen.getByRole("link", { name: "Lens Editor" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: "Example Systems" }),
    ).toHaveAttribute("href", "/example-systems");
    expect(screen.getByRole("link", { name: "Optimization" })).toHaveAttribute(
      "href",
      "/optimization",
    );
    expect(screen.getByRole("link", { name: "Glass Map" })).toHaveAttribute(
      "href",
      "/glass-map",
    );
    expect(
      screen.getByRole("link", { name: "Import Custom Glass" }),
    ).toHaveAttribute("href", "/import-custom-glass");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy-policy");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about",
    );
  });

  it("orders glass routes before settings", () => {
    render(<SideNav isOpen={true} isLG={false} onClose={jest.fn()} />);

    const labels = screen.getAllByRole("link").map((link) => link.textContent);
    expect(
      labels.slice(labels.indexOf("Glass Map"), labels.indexOf("Settings") + 1),
    ).toEqual(["Glass Map", "Import Custom Glass", "Settings"]);
  });

  it("marks the root route as active when no segment is selected", () => {
    render(<SideNav isOpen={true} isLG={false} onClose={jest.fn()} />);

    expect(screen.getByRole("link", { name: "Lens Editor" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Glass Map" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks a nested route as active from the selected segment", () => {
    mockSelectedSegment = "glass-map";

    render(<SideNav isOpen={true} isLG={false} onClose={jest.fn()} />);

    expect(screen.getByRole("link", { name: "Glass Map" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Lens Editor" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks the example systems route as active from the selected segment", () => {
    mockSelectedSegment = "example-systems";

    render(<SideNav isOpen={true} isLG={false} onClose={jest.fn()} />);

    expect(
      screen.getByRole("link", { name: "Example Systems" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Lens Editor" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("makes the closed nav hidden and inert", () => {
    const { container } = render(
      <SideNav isOpen={false} isLG={false} onClose={jest.fn()} />,
    );
    const nav = container.querySelector('nav[aria-label="Side navigation"]');

    expect(nav).toHaveAttribute("aria-hidden", "true");
    expect(nav).toHaveAttribute("inert");
  });

  it("applies the complete open and large-screen layout classes", () => {
    const { container } = render(
      <SideNav isOpen={true} isLG={true} onClose={jest.fn()} />,
    );
    const nav = container.querySelector('nav[aria-label="Side navigation"]');

    expect(nav).toHaveClass(
      "absolute",
      "top-0",
      "left-0",
      "h-full",
      "z-40",
      "w-[33vw]",
      "translate-x-0",
      "transition-transform",
    );
  });

  it("uses the small-screen width and off-screen transform when closed", () => {
    const { container } = render(
      <SideNav isOpen={false} isLG={false} onClose={jest.fn()} />,
    );
    const nav = container.querySelector('nav[aria-label="Side navigation"]');

    expect(nav).toHaveClass("w-[50vw]", "-translate-x-full");
  });

  it("closes after accepted navigation and keeps open after blocked navigation", () => {
    const onClose = jest.fn();
    const onNavigate = jest
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const { rerender } = render(
      <SideNav
        isOpen={true}
        isLG={false}
        onClose={onClose}
        onNavigate={onNavigate}
      />,
    );
    const settings = screen.getByRole("link", { name: "Settings" });

    fireEvent.click(settings);
    expect(onNavigate).toHaveBeenCalledWith("/settings", expect.any(Object));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(settings);
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<SideNav isOpen={true} isLG={false} onClose={onClose} />);
    fireEvent.click(screen.getByRole("link", { name: "About" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("forwards the close button action", () => {
    const onClose = jest.fn();
    render(<SideNav isOpen={true} isLG={false} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
