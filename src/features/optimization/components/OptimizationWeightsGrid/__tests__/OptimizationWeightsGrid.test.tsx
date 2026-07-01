import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OptimizationWeightsGrid } from "@/features/optimization/components/OptimizationWeightsGrid";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

describe("OptimizationWeightsGrid", () => {
  it("commits a pending weight edit before an outside action is handled", async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    const onUpdateWeight = jest.fn();

    render(
      <div>
        <OptimizationWeightsGrid
          rows={[{ id: "weight-0", index: 0, label: "0.7", weight: 1 }]}
          valueColumnWidth={120}
          onUpdateWeight={onUpdateWeight}
        />
        <button type="button" onClick={onAction}>
          Consume weights
        </button>
      </div>
    );

    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), "4.5");
    await user.click(screen.getByRole("button", { name: "Consume weights" }));

    expect(onUpdateWeight).toHaveBeenCalledWith(0, 4.5);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
