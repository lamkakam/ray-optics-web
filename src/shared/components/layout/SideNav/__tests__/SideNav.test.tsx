import React from "react";
import { render, screen } from "@testing-library/react";
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
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { readonly href: string }) {
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

    expect(screen.getByRole("link", { name: "Lens Editor" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Example Systems" })).toHaveAttribute("href", "/example-systems");
    expect(screen.getByRole("link", { name: "Glass Map" })).toHaveAttribute("href", "/glass-map");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy-policy");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  });

  it("marks the root route as active when no segment is selected", () => {
    render(<SideNav isOpen={true} isLG={false} onClose={jest.fn()} />);

    expect(screen.getByRole("link", { name: "Lens Editor" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Glass Map" })).not.toHaveAttribute("aria-current");
  });

  it("marks a nested route as active from the selected segment", () => {
    mockSelectedSegment = "glass-map";

    render(<SideNav isOpen={true} isLG={false} onClose={jest.fn()} />);

    expect(screen.getByRole("link", { name: "Glass Map" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Lens Editor" })).not.toHaveAttribute("aria-current");
  });

  it("marks the example systems route as active from the selected segment", () => {
    mockSelectedSegment = "example-systems";

    render(<SideNav isOpen={true} isLG={false} onClose={jest.fn()} />);

    expect(screen.getByRole("link", { name: "Example Systems" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Lens Editor" })).not.toHaveAttribute("aria-current");
  });

  it("makes the closed nav hidden and inert", () => {
    const { container } = render(<SideNav isOpen={false} isLG={false} onClose={jest.fn()} />);
    const nav = container.querySelector('nav[aria-label="Side navigation"]');

    expect(nav).toHaveAttribute("aria-hidden", "true");
    expect(nav).toHaveAttribute("inert");
  });
});
