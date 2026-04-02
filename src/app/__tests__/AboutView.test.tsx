import React from "react";
import { render, screen } from "@testing-library/react";
import { AboutView } from "@/app/AboutView";

describe("AboutView", () => {
  it("renders heading 'About'", () => {
    render(<AboutView />);
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
  });

  it("contains 'Ray Optics Web' text", () => {
    render(<AboutView />);
    expect(screen.getAllByText(/Ray Optics Web/i).length).toBeGreaterThan(0);
  });
});
