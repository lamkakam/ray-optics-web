import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberCell } from "@/components/micro/NumberCell";

describe("NumberCell", () => {
  it("renders a text input with the initial value", () => {
    render(<NumberCell value={42} onValueChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("42");
  });

  it("auto-focuses on mount", () => {
    render(<NumberCell value={0} onValueChange={() => {}} autoFocus />);
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it("calls onValueChange on blur with the new value", async () => {
    const onValueChange = jest.fn();
    render(<NumberCell value={10} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");

    await userEvent.clear(input);
    await userEvent.type(input, "25.5");
    await userEvent.tab();

    expect(onValueChange).toHaveBeenCalledWith(25.5);
  });

  it("reverts to original value when input is empty on blur", async () => {
    const onValueChange = jest.fn();
    render(<NumberCell value={10} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");

    await userEvent.clear(input);
    await userEvent.tab();

    expect(onValueChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("10");
  });

  it("reverts to original value when input is invalid on blur", async () => {
    const onValueChange = jest.fn();
    render(<NumberCell value={42} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");

    await userEvent.clear(input);
    await userEvent.type(input, "abc");
    await userEvent.tab();

    expect(onValueChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("42");
  });

  it("reverts partial-parse input like '120x000A' on blur", async () => {
    const onValueChange = jest.fn();
    render(<NumberCell value={50} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");

    await userEvent.clear(input);
    await userEvent.type(input, "120x000A");
    await userEvent.tab();

    expect(onValueChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("50");
  });

  it("accepts scientific notation like '1.5e-3'", async () => {
    const onValueChange = jest.fn();
    render(<NumberCell value={0} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");

    await userEvent.clear(input);
    await userEvent.type(input, "1.5e-3");
    await userEvent.tab();

    expect(onValueChange).toHaveBeenCalledWith(0.0015);
  });

  it("accepts negative numbers", async () => {
    const onValueChange = jest.fn();
    render(<NumberCell value={0} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");

    await userEvent.clear(input);
    await userEvent.type(input, "-30.5");
    await userEvent.tab();

    expect(onValueChange).toHaveBeenCalledWith(-30.5);
  });
});
