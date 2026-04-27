import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsphericalCell } from "@/features/lens-editor/components/AsphericalCell";

describe("AsphericalCell", () => {
  it("renders a button showing 'None' when no aspherical data", () => {
    render(<AsphericalCell aspherical={undefined} onOpenModal={() => {}} />);
    const btn = screen.getByRole("button", { name: "Edit aspherical parameters" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("None");
  });

  it("renders a button showing the Conic label for conic aspherical data", () => {
    render(<AsphericalCell aspherical={{ kind: "Conic", conicConstant: -1 }} onOpenModal={() => {}} />);
    expect(screen.getByRole("button", { name: "Edit aspherical parameters" })).toHaveTextContent("Conic");
  });

  it("renders a button showing a non-conic aspherical label", () => {
    render(
      <AsphericalCell
        aspherical={{ kind: "EvenAspherical", conicConstant: -1, polynomialCoefficients: [0.1] }}
        onOpenModal={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Edit aspherical parameters" })).toHaveTextContent("Even Aspherical");
  });

  it("calls onOpenModal when clicked", async () => {
    const onOpenModal = jest.fn();
    render(<AsphericalCell aspherical={undefined} onOpenModal={onOpenModal} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit aspherical parameters" }));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});
