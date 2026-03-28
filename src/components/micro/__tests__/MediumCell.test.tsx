import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediumCell } from "@/components/micro/MediumCell";

describe("MediumCell", () => {
  it("displays the medium string", () => {
    render(<MediumCell medium="SK16" onOpenModal={() => {}} />);
    expect(screen.getByText("SK16")).toBeInTheDocument();
  });

  it("has correct aria-label", () => {
    render(<MediumCell medium="air" onOpenModal={() => {}} />);
    expect(screen.getByLabelText("Edit medium")).toBeInTheDocument();
  });

  it("calls onOpenModal when clicked", async () => {
    const onOpenModal = jest.fn();
    render(<MediumCell medium="BK7" onOpenModal={onOpenModal} />);

    await userEvent.click(screen.getByLabelText("Edit medium"));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});
