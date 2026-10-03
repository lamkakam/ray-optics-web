import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptimizationDiscardConfirmModal } from "@/features/optimization/components/OptimizationDiscardConfirmModal";

describe("OptimizationDiscardConfirmModal", () => {
  it("renders nothing while closed", () => {
    render(
      <OptimizationDiscardConfirmModal
        isOpen={false}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Discard" }),
    ).not.toBeInTheDocument();
  });

  it("forwards Cancel and Discard clicks", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    render(
      <OptimizationDiscardConfirmModal
        isOpen
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByText(
        "This will discard the optimized lens prescription and restore the prescription from the Lens Editor. Continue?",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Discard" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
