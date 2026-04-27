import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecenterCell } from "@/features/lens-editor/components/DecenterCell";

describe("DecenterCell", () => {
  it("renders a button with aria-label", () => {
    render(<DecenterCell decenter={undefined} onOpenModal={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Edit decenter and tilt" })).toBeInTheDocument();
  });

  it("shows 'None' when decenter is not set", () => {
    render(<DecenterCell decenter={undefined} onOpenModal={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Edit decenter and tilt" })).toHaveTextContent("None");
  });

  it("shows the coordinate system strategy when decenter is set", () => {
    render(
      <DecenterCell
        decenter={{
          coordinateSystemStrategy: "dec and return",
          alpha: 0,
          beta: 0,
          gamma: 0,
          offsetX: 0,
          offsetY: 0,
        }}
        onOpenModal={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Edit decenter and tilt" })).toHaveTextContent("dec and return");
  });

  it("calls onOpenModal when button is clicked", async () => {
    const onOpenModal = jest.fn();
    render(<DecenterCell decenter={undefined} onOpenModal={onOpenModal} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit decenter and tilt" }));
    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});
