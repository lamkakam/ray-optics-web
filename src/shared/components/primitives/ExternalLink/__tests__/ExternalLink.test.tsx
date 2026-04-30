import React from "react";
import { render, screen } from "@testing-library/react";
import { ExternalLink } from "@/shared/components/primitives/ExternalLink";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

describe("ExternalLink", () => {
  it("renders an accessible link with the provided href", () => {
    render(
      <ExternalLink href="https://example.com/source" aria-label="Open source material">
        Source
      </ExternalLink>,
    );

    expect(screen.getByRole("link", { name: "Open source material" })).toHaveAttribute(
      "href",
      "https://example.com/source",
    );
  });

  it("always opens in a new tab with safe rel attributes", () => {
    render(
      <ExternalLink href="https://example.com/source" aria-label="Open source material">
        Source
      </ExternalLink>,
    );

    const link = screen.getByRole("link", { name: "Open source material" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("applies tokenized underline and theme-aware color styling", () => {
    render(
      <ExternalLink href="https://example.com/source" aria-label="Open source material">
        Source
      </ExternalLink>,
    );

    const link = screen.getByRole("link", { name: "Open source material" });
    expect(link).toHaveClass(cx.externalLink.size.fontSize);
    expect(link).toHaveClass(cx.externalLink.style.fontWeight);
    expect(link).toHaveClass(cx.externalLink.style.underline);
    expect(link).toHaveClass(cx.externalLink.style.underlineOffset);
    expect(link).toHaveClass(cx.externalLink.color.textColor);
    expect(link).toHaveClass(cx.externalLink.color.hoverTextColor);
    expect(link).toHaveClass(cx.externalLink.color.decorationColor);
  });

  it("applies the description font-size token for the description variant", () => {
    render(
      <ExternalLink
        href="https://example.com/source"
        aria-label="Open source material"
        variant="description"
      >
        Source
      </ExternalLink>,
    );

    const link = screen.getByRole("link", { name: "Open source material" });
    expect(link).toHaveClass(cx.externalLink.size.descriptionFontSize);
    expect(link).not.toHaveClass(cx.externalLink.size.fontSize);
  });

  it("merges a consumer className", () => {
    render(
      <ExternalLink
        href="https://example.com/source"
        aria-label="Open source material"
        className="block text-lg"
      >
        Source
      </ExternalLink>,
    );

    const link = screen.getByRole("link", { name: "Open source material" });
    expect(link).toHaveClass("block");
    expect(link).toHaveClass("text-lg");
    expect(link).not.toHaveClass(cx.externalLink.size.fontSize);
  });

  it("allows consumer font-size classes to override the description variant token", () => {
    render(
      <ExternalLink
        href="https://example.com/source"
        aria-label="Open source material"
        variant="description"
        className="text-lg"
      >
        Source
      </ExternalLink>,
    );

    const link = screen.getByRole("link", { name: "Open source material" });
    expect(link).toHaveClass("text-lg");
    expect(link).not.toHaveClass(cx.externalLink.size.descriptionFontSize);
  });
});
