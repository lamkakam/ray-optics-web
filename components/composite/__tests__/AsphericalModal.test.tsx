import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsphericalModal } from "@/components/composite/AsphericalModal";

describe("AsphericalModal", () => {
  const defaultProps = {
    isOpen: true,
    initialConicConstant: 0,
    initialType: "Conical" as const,
    initialCoefficients: [] as number[],
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    onRemove: jest.fn(),
  };

  it("does not render when isOpen is false", () => {
    render(<AsphericalModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog when isOpen is true", () => {
    render(<AsphericalModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("always shows conic constant input", () => {
    render(<AsphericalModal {...defaultProps} />);
    expect(screen.getByLabelText("Conic constant")).toBeInTheDocument();
  });

  it("shows type selector with Conical and EvenAspherical", () => {
    render(<AsphericalModal {...defaultProps} />);
    const select = screen.getByLabelText("Type");
    expect(select).toBeInTheDocument();
  });

  it("does not show coefficient inputs when type is Conical", () => {
    render(<AsphericalModal {...defaultProps} initialType="Conical" />);
    expect(screen.queryByLabelText("a2")).not.toBeInTheDocument();
  });

  it("shows 10 coefficient inputs when type is EvenAspherical", () => {
    render(
      <AsphericalModal
        {...defaultProps}
        initialType="EvenAspherical"
        initialCoefficients={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
      />
    );
    for (const label of ["a2", "a4", "a6", "a8", "a10", "a12", "a14", "a16", "a18", "a20"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("shows coefficient inputs when switching to EvenAspherical", async () => {
    render(<AsphericalModal {...defaultProps} />);
    await userEvent.selectOptions(screen.getByLabelText("Type"), "EvenAspherical");
    expect(screen.getByLabelText("a2")).toBeInTheDocument();
  });

  it("calls onConfirm with correct data for Conical", async () => {
    const onConfirm = jest.fn();
    render(
      <AsphericalModal
        {...defaultProps}
        onConfirm={onConfirm}
        initialConicConstant={-1.5}
      />
    );

    await userEvent.click(screen.getByText("Confirm"));
    expect(onConfirm).toHaveBeenCalledWith({
      conicConstant: -1.5,
      type: "Conical",
      polynomialCoefficients: [],
    });
  });

  it("calls onRemove when Remove button is clicked", async () => {
    const onRemove = jest.fn();
    render(<AsphericalModal {...defaultProps} onRemove={onRemove} />);

    await userEvent.click(screen.getByText("Remove Aspherical"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = jest.fn();
    render(<AsphericalModal {...defaultProps} onClose={onClose} />);

    await userEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = jest.fn();
    render(<AsphericalModal {...defaultProps} onClose={onClose} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("truncates trailing zeros from coefficients on confirm", async () => {
    const onConfirm = jest.fn();
    render(
      <AsphericalModal
        {...defaultProps}
        initialType="EvenAspherical"
        initialCoefficients={[0.001, 0.002, 0, 0, 0, 0, 0, 0, 0, 0]}
        onConfirm={onConfirm}
      />
    );

    await userEvent.click(screen.getByText("Confirm"));
    expect(onConfirm).toHaveBeenCalledWith({
      conicConstant: 0,
      type: "EvenAspherical",
      polynomialCoefficients: [0.001, 0.002],
    });
  });
});
