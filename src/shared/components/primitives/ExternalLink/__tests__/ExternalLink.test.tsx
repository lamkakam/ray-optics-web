
import { render, screen } from "@testing-library/react";
import { ExternalLink } from "@/shared/components/primitives/ExternalLink";

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

});
