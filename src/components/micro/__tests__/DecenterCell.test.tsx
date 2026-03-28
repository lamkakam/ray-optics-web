import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecenterCell } from "@/components/micro/DecenterCell";

describe("DecenterCell", () => {
  it("renders a button with aria-label", () => {
    render(<DecenterCell isDecenterSet={false} onOpenModal={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Edit decenter and tilt" })).toBeInTheDocument();
  });

  it("shows '—' when decenter is not set", () => {
    render(<DecenterCell isDecenterSet={false} onOpenModal={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Edit decenter and tilt" })).toHaveTextContent("—");
  });

  it("shows 'Set' when decenter is set", () => {
    render(<DecenterCell isDecenterSet={true} onOpenModal={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Edit decenter and tilt" })).toHaveTextContent("Set");
  });

  it("calls onOpenModal when button is clicked", async () => {
    const onOpenModal = jest.fn();
    render(<DecenterCell isDecenterSet={false} onOpenModal={onOpenModal} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit decenter and tilt" }));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});
