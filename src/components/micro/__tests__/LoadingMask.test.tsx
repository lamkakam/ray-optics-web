import React from "react";
import { render, screen } from "@testing-library/react";
import { LoadingMask } from "@/components/micro/LoadingMask";

describe("LoadingMask", () => {
  it("renders with default 'Loading…' message", () => {
    render(<LoadingMask />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders a custom message when message prop is given", () => {
    render(<LoadingMask message="Please wait…" />);
    expect(screen.getByText("Please wait…")).toBeInTheDocument();
  });

  it("has data-testid='loading-mask'", () => {
    render(<LoadingMask />);
    expect(screen.getByTestId("loading-mask")).toBeInTheDocument();
  });

  it("outer element has 'absolute' and 'inset-0' classes", () => {
    render(<LoadingMask />);
    const el = screen.getByTestId("loading-mask");
    expect(el.className).toContain("absolute");
    expect(el.className).toContain("inset-0");
  });
});
