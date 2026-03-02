import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SurfaceLabelCell } from "@/components/micro/SurfaceLabelCell";

describe("SurfaceLabelCell", () => {
  it("renders a select with Default and Stop options", () => {
    render(<SurfaceLabelCell value="Default" onValueChange={() => {}} />);
    const select = screen.getByLabelText("Surface label");
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("Default");
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText("Stop")).toBeInTheDocument();
  });

  it("displays the current value", () => {
    render(<SurfaceLabelCell value="Stop" onValueChange={() => {}} />);
    expect(screen.getByLabelText("Surface label")).toHaveValue("Stop");
  });

  it("calls onValueChange when selection changes", async () => {
    const onValueChange = jest.fn();
    render(<SurfaceLabelCell value="Default" onValueChange={onValueChange} />);

    await userEvent.selectOptions(screen.getByLabelText("Surface label"), "Stop");
    expect(onValueChange).toHaveBeenCalledWith("Stop");
  });
});
