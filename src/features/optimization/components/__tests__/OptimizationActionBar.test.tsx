import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptimizationActionBar } from "@/features/optimization/components/OptimizationActionBar";

describe("OptimizationActionBar", () => {
  it("renders action buttons and forwards clicks", async () => {
    const user = userEvent.setup();
    const onOptimize = jest.fn();
    const onApplyToEditor = jest.fn();

    render(
      <OptimizationActionBar
        canOptimize
        canApplyToEditor
        isOptimizing={false}
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
        onOptimize={jest.fn()}
        onApplyToEditor={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Optimize" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apply to Editor" })).toBeDisabled();
  });
});
