import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorModal } from "@/components/micro/ErrorModal";

describe("ErrorModal", () => {
  it("does not render when isOpen is false", () => {
    render(<ErrorModal isOpen={false} onClose={jest.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog when isOpen is true", () => {
    render(<ErrorModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("displays a generic error message without details", () => {
    render(<ErrorModal isOpen={true} onClose={jest.fn()} />);
    expect(
      screen.getByText(
        "The input parameters are invalid. Please check your specifications and prescription."
      )
    ).toBeInTheDocument();
  });

  it("calls onClose when OK button is clicked", async () => {
    const onClose = jest.fn();
    render(<ErrorModal isOpen={true} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
