import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptimizationActionBar } from "@/features/optimization/components/OptimizationActionBar/OptimizationActionBar";

describe("OptimizationActionBar", () => {
  it("applies sm sizing to both action buttons", () => {
    render(
      <OptimizationActionBar
        canOptimize
        canApplyToEditor
        canDiscard
        isOptimizing={false}
        onOptimize={jest.fn()}
        onApplyToEditor={jest.fn()}
        onDiscard={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Optimize" })).toHaveClass(
      "px-3",
      "py-1.5",
      "text-sm",
    );
    expect(screen.getByRole("button", { name: "Apply to Editor" })).toHaveClass(
      "px-3",
      "py-1.5",
      "text-sm",
    );
  });

  it("renders action buttons and forwards clicks", async () => {
    const user = userEvent.setup();
    const onOptimize = jest.fn();
    const onApplyToEditor = jest.fn();
    const onDiscard = jest.fn();

    render(
      <OptimizationActionBar
        canOptimize
        canApplyToEditor
        canDiscard
        isOptimizing={false}
        onOptimize={onOptimize}
        onApplyToEditor={onApplyToEditor}
        onDiscard={onDiscard}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Optimize" }));
    await user.click(screen.getByRole("button", { name: "Apply to Editor" }));
    await user.click(screen.getByRole("button", { name: "Discard" }));

    expect(onOptimize).toHaveBeenCalledTimes(1);
    expect(onApplyToEditor).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("disables each button independently", () => {
    render(
      <OptimizationActionBar
        canOptimize={false}
        canApplyToEditor={false}
        canDiscard={false}
        isOptimizing={false}
        onOptimize={jest.fn()}
        onApplyToEditor={jest.fn()}
        onDiscard={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Optimize" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Apply to Editor" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();
  });
});
