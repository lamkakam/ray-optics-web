import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberCell } from "@/components/micro/NumberCell";

describe("NumberCell", () => {
  it("renders a number input with the initial value", () => {
    render(<NumberCell value={42} onValueChange={() => {}} />);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveValue(42);
  });

  it("auto-focuses on mount", () => {
    render(<NumberCell value={0} onValueChange={() => {}} autoFocus />);
    expect(screen.getByRole("spinbutton")).toHaveFocus();
  });

  it("calls onValueChange on blur with the new value", async () => {
    const onValueChange = jest.fn();
    render(<NumberCell value={10} onValueChange={onValueChange} />);
    const input = screen.getByRole("spinbutton");

    await userEvent.clear(input);
    await userEvent.type(input, "25.5");
    await userEvent.tab();

    expect(onValueChange).toHaveBeenCalledWith(25.5);
  });

  it("does not call onValueChange if value is empty on blur", async () => {
    const onValueChange = jest.fn();
    render(<NumberCell value={10} onValueChange={onValueChange} />);
    const input = screen.getByRole("spinbutton");

    await userEvent.clear(input);
    await userEvent.tab();

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
