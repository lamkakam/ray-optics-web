import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LensLayoutPanel } from "@/components/micro/LensLayoutPanel";

describe("LensLayoutPanel", () => {
  it("renders a loading skeleton when imageBase64 is undefined", () => {
    render(<LensLayoutPanel onRefresh={jest.fn()} />);
    expect(screen.getByText("Loading lens layout...")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the lens layout image when imageBase64 is provided", () => {
    render(<LensLayoutPanel imageBase64="abc123" onRefresh={jest.fn()} />);
    const img = screen.getByRole("img", { name: "Lens layout diagram" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "data:image/png;base64,abc123");
  });

  it("calls onRefresh when the refresh button is clicked", async () => {
    const onRefresh = jest.fn();
    render(<LensLayoutPanel imageBase64="abc123" onRefresh={onRefresh} />);
    const btn = screen.getByRole("button", { name: "Refresh lens layout" });
    await userEvent.click(btn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("disables the refresh button when loading is true", () => {
    render(<LensLayoutPanel imageBase64="abc123" loading onRefresh={jest.fn()} />);
    const btn = screen.getByRole("button", { name: "Refresh lens layout" });
    expect(btn).toBeDisabled();
  });

  it("shows a loading overlay when loading is true and an image exists", () => {
    render(<LensLayoutPanel imageBase64="abc123" loading onRefresh={jest.fn()} />);
    expect(screen.getByText("Updating...")).toBeInTheDocument();
  });
});
