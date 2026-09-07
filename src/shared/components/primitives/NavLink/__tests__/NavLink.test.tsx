import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavLink } from "@/shared/components/primitives/NavLink";

jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { readonly href: string }) {
    return (
      <a
        href={href}
        onClick={(event) => {
          event.preventDefault();
          onClick?.(event);
        }}
        {...props}
      >
        {children}
      </a>
    );
  };
});

describe("NavLink", () => {
  it("renders an <a> element with role link", () => {
    render(<NavLink active={false} href="/settings">Settings</NavLink>);
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("active state has aria-current='page'", () => {
    render(
      <NavLink active={true} href="/settings" aria-current="page">
        Settings
      </NavLink>
    );
    const link = screen.getByRole("link", { name: "Settings" });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("inactive state does not have aria-current", () => {
    render(<NavLink active={false} href="/settings">Settings</NavLink>);
    const link = screen.getByRole("link", { name: "Settings" });
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("click calls onClick", async () => {
    const handleClick = jest.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
      expect(event.defaultPrevented).toBe(true);
    });
    render(<NavLink active={false} href="/settings" onClick={handleClick}>Settings</NavLink>);
    const link = screen.getByRole("link", { name: "Settings" });
    await userEvent.click(link);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("forwards aria-label", () => {
    render(
      <NavLink active={false} href="/settings" aria-label="Custom Label">
        Settings
      </NavLink>
    );
    expect(screen.getByRole("link", { name: "Custom Label" })).toBeInTheDocument();
  });

  it("visually distinguishes the active and inactive states", () => {
    const { rerender } = render(<NavLink active={true} href="/settings">Settings</NavLink>);
    const link = screen.getByRole("link", { name: "Settings" });
    expect(link).toHaveClass("bg-blue-50", "text-blue-700");

    rerender(<NavLink active={false} href="/settings">Settings</NavLink>);
    expect(link).toHaveClass("text-gray-700", "hover:bg-gray-100");
    expect(link).not.toHaveClass("bg-blue-50");
  });

  it("forwards href to the rendered link", () => {
    render(<NavLink active={false} href="/settings">Settings</NavLink>);
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

});
