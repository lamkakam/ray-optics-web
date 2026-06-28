import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptimizationActionBar } from "@/features/optimization/components/OptimizationActionBar/OptimizationActionBar";

describe("OptimizationActionBar", () => {
  it("applies sm sizing to both action buttons", () => {
    render(
      <OptimizationActionBar
        canOptimize
        canApplyToEditor
        isOptimizing={false}
        buttonSize="sm"
        onOptimize={jest.fn()}
        onApplyToEditor={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Optimize" })).toHaveClass("px-3", "py-1.5", "text-sm");
    expect(screen.getByRole("button", { name: "Apply to Editor" })).toHaveClass("px-3", "py-1.5", "text-sm");
  });

  it("applies xs sizing to both action buttons", () => {
    render(
      <OptimizationActionBar
        canOptimize
        canApplyToEditor
        isOptimizing={false}
        buttonSize="xs"
        onOptimize={jest.fn()}
        onApplyToEditor={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Optimize" })).toHaveClass("px-2", "py-1", "text-xs");
    expect(screen.getByRole("button", { name: "Apply to Editor" })).toHaveClass("px-2", "py-1", "text-xs");
  });

  it("renders action buttons and forwards clicks", async () => {
    const user = userEvent.setup();
    const onOptimize = jest.fn();
    const onApplyToEditor = jest.fn();

    render(
      <OptimizationActionBar
        canOptimize
        canApplyToEditor
        isOptimizing={false}
        buttonSize="sm"
        onOptimize={onOptimize}
        onApplyToEditor={onApplyToEditor}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Optimize" }));
    await user.click(screen.getByRole("button", { name: "Apply to Editor" }));

    expect(onOptimize).toHaveBeenCalledTimes(1);
    expect(onApplyToEditor).toHaveBeenCalledTimes(1);
  });

  it("disables each button independently", () => {
    render(
      <OptimizationActionBar
        canOptimize={false}
        canApplyToEditor={false}
        isOptimizing={false}
        buttonSize="sm"
        onOptimize={jest.fn()}
        onApplyToEditor={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Optimize" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apply to Editor" })).toBeDisabled();
  });
});
