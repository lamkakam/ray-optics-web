import React from "react";
import { render, screen } from "@testing-library/react";
import { LensLayoutPanel } from "@/components/composite/LensLayoutPanel";

describe("LensLayoutPanel", () => {
  it("root div has overflow-hidden to prevent content bleeding over BottomDrawer on short viewports", () => {
    const { container } = render(<LensLayoutPanel />);
    expect(container.firstChild).toHaveClass("overflow-hidden");
  });

  it("renders a placeholder when imageBase64 is undefined and not loading", () => {
    render(<LensLayoutPanel />);
    expect(
      screen.getByText(
        "Configure the System Specs & Lens Prescription below, or choose an example system, then click \u201cUpdate System\u201d to view the lens layout."
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows loading message when imageBase64 is undefined and loading is true", () => {
    render(<LensLayoutPanel loading />);
    expect(screen.getByText("Loading lens layout...")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the lens layout image when imageBase64 is provided", () => {
    render(<LensLayoutPanel imageBase64="abc123" />);
    const img = screen.getByRole("img", { name: "Lens layout diagram" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "data:image/png;base64,abc123");
  });

  it("shows a loading overlay when loading is true and an image exists", () => {
    render(<LensLayoutPanel imageBase64="abc123" loading />);
    expect(screen.getByText("Updating...")).toBeInTheDocument();
  });
});
