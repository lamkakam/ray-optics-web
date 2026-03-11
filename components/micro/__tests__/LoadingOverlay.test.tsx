import React from "react";
import { render, screen } from "@testing-library/react";
import { LoadingOverlay } from "@/components/micro/LoadingOverlay";

describe("LoadingOverlay", () => {
  it("renders the title text", () => {
    render(<LoadingOverlay title="Initializing" contents="Please wait…" />);
    expect(screen.getByText("Initializing")).toBeInTheDocument();
  });

  it("renders contents as a string", () => {
    render(<LoadingOverlay title="Title" contents="Loading packages…" />);
    expect(screen.getByText("Loading packages…")).toBeInTheDocument();
  });

  it("renders contents as a ReactNode", () => {
    render(
      <LoadingOverlay
        title="Title"
        contents={<span data-testid="node-content">Node content</span>}
      />
    );
    expect(screen.getByTestId("node-content")).toBeInTheDocument();
  });

  it("outer container has fixed and inset-0 classes", () => {
    const { container } = render(
      <LoadingOverlay title="Title" contents="Content" />
    );
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toMatch(/\bfixed\b/);
    expect(outer.className).toMatch(/\binset-0\b/);
  });

  it("spinner SVG is present and has aria-hidden=true", () => {
    render(<LoadingOverlay title="Title" contents="Content" />);
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
