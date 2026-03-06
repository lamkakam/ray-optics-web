import React from "react";
import { render, screen } from "@testing-library/react";
import { FirstOrderChips } from "@/components/micro/FirstOrderChips";

describe("FirstOrderChips", () => {
  it("renders nothing when data is undefined", () => {
    const { container } = render(<FirstOrderChips />);
    expect(container.firstChild).toBeNull();
  });

  it("renders EFL chip when efl is present", () => {
    render(<FirstOrderChips data={{ efl: 100.234 }} />);
    expect(screen.getByText("EFL: 100.23mm")).toBeInTheDocument();
  });

  it("renders f/# chip when fno is present", () => {
    render(<FirstOrderChips data={{ fno: 4.012 }} />);
    expect(screen.getByText("f/4.01")).toBeInTheDocument();
  });

  it("renders multiple chips", () => {
    render(<FirstOrderChips data={{ efl: 100, fno: 4, img_ht: 36.4 }} />);
    expect(screen.getByText("EFL: 100.00mm")).toBeInTheDocument();
    expect(screen.getByText("f/4.00")).toBeInTheDocument();
    expect(screen.getByText("IMG HT: 36.40mm")).toBeInTheDocument();
  });
});
