import React from "react";
import { render, screen } from "@testing-library/react";
import { InlineLink } from "@/shared/components/primitives/InlineLink";

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

describe("InlineLink", () => {
  it("renders a link with the provided href", () => {
    render(<InlineLink href="/glass-map">View in glass map</InlineLink>);

    expect(screen.getByRole("link", { name: "View in glass map" })).toHaveAttribute("href", "/glass-map");
  });

  it("forwards aria-label and className", () => {
    render(
      <InlineLink href="/" aria-label="Back to lens editor" className="custom-class">
        Back
      </InlineLink>,
    );

    expect(screen.getByRole("link", { name: "Back to lens editor" })).toHaveClass("custom-class");
  });
});
