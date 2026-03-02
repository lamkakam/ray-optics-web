import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsphericalCell } from "@/components/micro/AsphericalCell";

describe("AsphericalCell", () => {
  it("renders a read-only checkbox that is unchecked when no aspherical data", () => {
    render(<AsphericalCell isAspherical={false} onOpenModal={() => {}} />);
    const checkbox = screen.getByLabelText("Edit aspherical parameters");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it("renders a checked checkbox when aspherical data exists", () => {
    render(<AsphericalCell isAspherical={true} onOpenModal={() => {}} />);
    expect(screen.getByLabelText("Edit aspherical parameters")).toBeChecked();
  });

  it("calls onOpenModal when clicked", async () => {
    const onOpenModal = jest.fn();
    render(<AsphericalCell isAspherical={false} onOpenModal={onOpenModal} />);

    await userEvent.click(screen.getByLabelText("Edit aspherical parameters"));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});
