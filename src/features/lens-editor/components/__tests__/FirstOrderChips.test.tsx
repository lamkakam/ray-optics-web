import React from "react";
import { render, screen } from "@testing-library/react";
import { FirstOrderChips } from "@/features/lens-editor/components/FirstOrderChips";

describe("FirstOrderChips", () => {
  it("renders nothing when data is undefined", () => {
    const { container } = render(<FirstOrderChips />);
    expect(container.firstChild).toBeNull();
  });

  it("renders EFL chip when efl is present", () => {
    render(<FirstOrderChips data={{ efl: 100.234 }} />);
    expect(screen.getByText("EFL: 100.23mm")).toBeInTheDocument();
  });

  it("renders BFL chip when efl is present", () => {
    render(<FirstOrderChips data={{ bfl: 55.1 }} />);
    expect(screen.getByText("BFL: 55.10mm")).toBeInTheDocument();
  });

  it("renders multiple chips", () => {
    render(<FirstOrderChips data={{ efl: 100, bfl: 16, img_ht: 36.4 }} />);
    expect(screen.getByText("EFL: 100.00mm")).toBeInTheDocument();
    expect(screen.getByText("BFL: 16.00mm")).toBeInTheDocument();
    expect(screen.getByText("IMG HT: 36.40mm")).toBeInTheDocument();
  });
});
