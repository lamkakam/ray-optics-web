import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetButton } from "@/components/micro/SetButton";

describe("SetButton", () => {
  it("renders a button with the given aria-label", () => {
    render(<SetButton isSet={false} onClick={() => {}} aria-label="Edit something" />);
    expect(screen.getByRole("button", { name: "Edit something" })).toBeInTheDocument();
  });

  it("shows 'Set' when isSet=true (default label)", () => {
    render(<SetButton isSet={true} onClick={() => {}} aria-label="Edit something" />);
    expect(screen.getByRole("button", { name: "Edit something" })).toHaveTextContent("Set");
  });

  it("shows '—' when isSet=false (default label)", () => {
    render(<SetButton isSet={false} onClick={() => {}} aria-label="Edit something" />);
    expect(screen.getByRole("button", { name: "Edit something" })).toHaveTextContent("—");
  });

  it("calls onClick when clicked", async () => {
    const onClick = jest.fn();
    render(<SetButton isSet={false} onClick={onClick} aria-label="Edit something" />);
    await userEvent.click(screen.getByRole("button", { name: "Edit something" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects custom setLabel / unsetLabel props", () => {
    const { rerender } = render(
      <SetButton isSet={true} onClick={() => {}} aria-label="Edit something" setLabel="Active" unsetLabel="None" />
    );
    expect(screen.getByRole("button")).toHaveTextContent("Active");
    rerender(
      <SetButton isSet={false} onClick={() => {}} aria-label="Edit something" setLabel="Active" unsetLabel="None" />
    );
    expect(screen.getByRole("button")).toHaveTextContent("None");
  });
});
