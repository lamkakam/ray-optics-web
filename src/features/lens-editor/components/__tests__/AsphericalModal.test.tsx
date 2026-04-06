import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsphericalModal } from "@/features/lens-editor/components/AsphericalModal";

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mathjax-context">{children}</div>
  ),
  MathJax: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe("AsphericalModal", () => {
  const defaultProps = {
    isOpen: true,
    initialConicConstant: 0,
    initialType: "Conic" as const,
    initialCoefficients: [] as number[],
    initialToricSweepRadiusOfCurvature: 0,
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

  it("renders a backdrop overlay behind the dialog", () => {
    render(<AsphericalModal {...defaultProps} />);
    const backdrop = screen.getByTestId("modal-backdrop");
    expect(backdrop).toBeInTheDocument();
  });

  it("does not call onClose when clicking the backdrop overlay", async () => {
    const onClose = jest.fn();
    render(<AsphericalModal {...defaultProps} onClose={onClose} />);
    const backdrop = screen.getByTestId("modal-backdrop");

    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it("always shows conic constant input", () => {
    render(<AsphericalModal {...defaultProps} />);
    expect(screen.getByLabelText("Conic constant")).toBeInTheDocument();
  });

  it("shows type selector with Conic and EvenAspherical", () => {
    render(<AsphericalModal {...defaultProps} />);
    const select = screen.getByLabelText("Type");
    expect(select).toBeInTheDocument();
  });

  it("shows Radial Polynomial, X Toroid, and Y Toroid in the type selector", () => {
    render(<AsphericalModal {...defaultProps} />);
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(expect.arrayContaining(["Radial Polynomial", "X Toroid", "Y Toroid"]));
  });

  it("does not show coefficient inputs when type is Conic", () => {
    render(<AsphericalModal {...defaultProps} initialType="Conic" />);
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

  it("shows coefficient inputs when type is RadialPolynomial", () => {
    render(
      <AsphericalModal
        {...defaultProps}
        initialType="RadialPolynomial"
        initialCoefficients={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
      />
    );

    expect(screen.getByLabelText("radial-a1")).toBeInTheDocument();
  });

  it("shows coefficient inputs when type is XToroid", () => {
    render(
      <AsphericalModal
        {...defaultProps}
        initialType="XToroid"
        initialCoefficients={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
      />
    );

    expect(screen.getByLabelText("x-toroid-a2")).toBeInTheDocument();
  });

  it("shows coefficient inputs when type is YToroid", () => {
    render(
      <AsphericalModal
        {...defaultProps}
        initialType="YToroid"
        initialCoefficients={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
      />
    );

    expect(screen.getByLabelText("y-toroid-a2")).toBeInTheDocument();
  });

  it("shows toroid sweep radius of curvature input for XToroid with default value 0", () => {
    render(
      <AsphericalModal
        {...defaultProps}
        initialType="XToroid"
        initialCoefficients={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
      />
    );

    expect(screen.getByLabelText("Toroid sweep radius of curvature")).toHaveValue("0");
  });

  it("shows toroid sweep radius of curvature input for YToroid", () => {
    render(
      <AsphericalModal
        {...defaultProps}
        initialType="YToroid"
        initialCoefficients={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
      />
    );

    expect(screen.getByLabelText("Toroid sweep radius of curvature")).toBeInTheDocument();
  });

  it("does not show toroid sweep radius of curvature input for RadialPolynomial", () => {
    render(
      <AsphericalModal
        {...defaultProps}
        initialType="RadialPolynomial"
        initialCoefficients={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
      />
    );

    expect(screen.queryByLabelText("Toroid sweep radius of curvature")).not.toBeInTheDocument();
  });

  it("calls onConfirm with correct data for Conic", async () => {
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
      type: "Conic",
      polynomialCoefficients: [],
      toricSweepRadiusOfCurvature: 0,
    });
  });

  it("accepts typed floating-point conic constant and confirms", async () => {
    const onConfirm = jest.fn();
    render(
      <AsphericalModal
        {...defaultProps}
        onConfirm={onConfirm}
        initialConicConstant={0}
      />
    );

    const input = screen.getByLabelText("Conic constant");
    await userEvent.clear(input);
    await userEvent.type(input, "-0.5");
    await userEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).toHaveBeenCalledWith({
      conicConstant: -0.5,
      type: "Conic",
      polynomialCoefficients: [],
      toricSweepRadiusOfCurvature: 0,
    });
  });

  it("accepts typed floating-point coefficient and confirms", async () => {
    const onConfirm = jest.fn();
    render(
      <AsphericalModal
        {...defaultProps}
        initialType="EvenAspherical"
        initialCoefficients={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
        onConfirm={onConfirm}
      />
    );

    const a2Input = screen.getByLabelText("a2");
    await userEvent.clear(a2Input);
    await userEvent.type(a2Input, "0.001");
    await userEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).toHaveBeenCalledWith({
      conicConstant: 0,
      type: "EvenAspherical",
      polynomialCoefficients: [0.001],
      toricSweepRadiusOfCurvature: 0,
    });
  });

  it("calls onConfirm with correct data for RadialPolynomial", async () => {
    const onConfirm = jest.fn();
    render(
      <AsphericalModal
        {...defaultProps}
        initialType="RadialPolynomial"
        initialConicConstant={-2}
        initialCoefficients={[0.01, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
        onConfirm={onConfirm}
      />
    );

    await userEvent.click(screen.getByText("Confirm"));
    expect(onConfirm).toHaveBeenCalledWith({
      conicConstant: -2,
      type: "RadialPolynomial",
      polynomialCoefficients: [0.01],
      toricSweepRadiusOfCurvature: 0,
    });
  });

  it("calls onConfirm with correct data for XToroid", async () => {
    const onConfirm = jest.fn();
    render(
      <AsphericalModal
        {...defaultProps}
        initialType="XToroid"
        initialConicConstant={-0.5}
        initialCoefficients={[0.01, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]}
        initialToricSweepRadiusOfCurvature={12.5}
        onConfirm={onConfirm}
      />
    );

    await userEvent.click(screen.getByText("Confirm"));
    expect(onConfirm).toHaveBeenCalledWith({
      conicConstant: -0.5,
      type: "XToroid",
      polynomialCoefficients: [0.01, 0.02],
      toricSweepRadiusOfCurvature: 12.5,
    });
  });

  it("converts invalid toroid sweep radius of curvature to 0 on confirm", async () => {
    const onConfirm = jest.fn();
    render(
      <AsphericalModal
        {...defaultProps}
        initialType="YToroid"
        initialCoefficients={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
        initialToricSweepRadiusOfCurvature={8}
        onConfirm={onConfirm}
      />
    );

    const input = screen.getByLabelText("Toroid sweep radius of curvature");
    await userEvent.clear(input);
    await userEvent.type(input, "abc");
    await userEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).toHaveBeenCalledWith({
      conicConstant: 0,
      type: "YToroid",
      polynomialCoefficients: [],
      toricSweepRadiusOfCurvature: 0,
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

  it("does not call onClose when Escape is pressed", async () => {
    const onClose = jest.fn();
    render(<AsphericalModal {...defaultProps} onClose={onClose} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it("does not wrap its content in its own MathJaxContext", () => {
    render(<AsphericalModal {...defaultProps} />);
    expect(screen.queryByTestId("mathjax-context")).not.toBeInTheDocument();
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
      toricSweepRadiusOfCurvature: 0,
    });
  });
});
