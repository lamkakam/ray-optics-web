import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsphericalCell } from "@/components/micro/AsphericalCell";

describe("AsphericalCell", () => {
  it("renders a button showing '—' when no aspherical data", () => {
    render(<AsphericalCell isAspherical={false} onOpenModal={() => {}} />);
    const btn = screen.getByRole("button", { name: "Edit aspherical parameters" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("—");
  });

  it("renders a button showing 'Set' when aspherical data exists", () => {
    render(<AsphericalCell isAspherical={true} onOpenModal={() => {}} />);
    expect(screen.getByRole("button", { name: "Edit aspherical parameters" })).toHaveTextContent("Set");
  });

  it("calls onOpenModal when clicked", async () => {
    const onOpenModal = jest.fn();
    render(<AsphericalCell isAspherical={false} onOpenModal={onOpenModal} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit aspherical parameters" }));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});
