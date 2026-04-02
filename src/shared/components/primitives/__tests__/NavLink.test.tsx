import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavLink } from "@/shared/components/primitives/NavLink";

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
    const handleClick = jest.fn();
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

  it("applies extra className", () => {
    render(
      <NavLink active={false} href="/settings" className="extra-class">
        Settings
      </NavLink>
    );
    expect(screen.getByRole("link")).toHaveClass("extra-class");
  });

  it("forwards href to the rendered link", () => {
    render(<NavLink active={false} href="/settings">Settings</NavLink>);
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });
});
