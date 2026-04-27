import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import { BottomDrawerContainer } from "@/features/optimization/components/BottomDrawerContainer";
import { OptimizationStoreContext } from "@/features/optimization/providers/OptimizationStoreProvider";
import { createOptimizationSlice, type OptimizationState } from "@/features/optimization/stores/optimizationStore";
import type { WeightRow } from "@/features/optimization/lib/optimizationViewModels";

jest.mock("@/shared/components/layout/BottomDrawer", () => ({
  BottomDrawer: ({
    tabs,
    activeTabId,
    onTabChange,
  }: {
    readonly tabs: ReadonlyArray<{ readonly id: string; readonly label: string; readonly content: React.ReactNode }>;
    readonly activeTabId: string;
    readonly onTabChange: (tabId: string) => void;
  }) => (
    <div data-testid="mock-bottom-drawer" data-active-tab-id={activeTabId}>
      {tabs.map((tab) => (
        <section key={tab.id}>
          <button type="button" onClick={() => onTabChange(tab.id)}>
            {tab.label}
          </button>
          {tab.content}
        </section>
      ))}
    </div>
  ),
}));

jest.mock("@/features/optimization/components/OptimizationAlgorithmTab", () => ({
  OptimizationAlgorithmTab: ({
    onChangeOptimizer,
  }: {
    readonly onChangeOptimizer: (patch: { readonly kind?: "least_squares" | "differential_evolution"; readonly method?: "trf" | "lm" }) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onChangeOptimizer({ kind: "differential_evolution" })}>
        Differential Evolution
      </button>
      <button type="button" onClick={() => onChangeOptimizer({ method: "lm" })}>
        Levenberg-Marquardt
      </button>
    </div>
  ),
}));

jest.mock("@/features/optimization/components/OptimizationWeightsGrid", () => ({
  OptimizationWeightsGrid: ({
    rows,
    onUpdateWeight,
  }: {
    readonly rows: ReadonlyArray<WeightRow>;
    readonly onUpdateWeight: (index: number, value: number) => void;
  }) => (
    <button type="button" onClick={() => onUpdateWeight(rows[0]?.index ?? 0, 7)}>
      Update {rows[0]?.id}
    </button>
  ),
}));

jest.mock("@/features/optimization/components/OptimizationLensPrescriptionGrid", () => ({
  OptimizationLensPrescriptionGrid: ({
    onOpenRadiusModal,
    onOpenThicknessModal,
  }: {
    readonly onOpenRadiusModal: (surfaceIndex: number) => void;
    readonly onOpenThicknessModal: (surfaceIndex: number) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenRadiusModal(1)}>
        Open Radius
      </button>
      <button type="button" onClick={() => onOpenThicknessModal(2)}>
        Open Thickness
      </button>
    </div>
  ),
}));

jest.mock("@/features/optimization/components/OptimizationOperandsTab", () => ({
  OptimizationOperandsTab: ({
    onAddOperand,
  }: {
    readonly onAddOperand: () => void;
  }) => (
    <button type="button" onClick={onAddOperand}>
      Add Operand
    </button>
  ),
}));

function renderBottomDrawerContainer(store = createStore<OptimizationState>(createOptimizationSlice)) {
  store.setState({
    fieldWeights: [1],
    wavelengthWeights: [1, 1],
  });

  render(
    <OptimizationStoreContext.Provider value={store}>
      <BottomDrawerContainer
        layout={{ isLG: true }}
        fields={{ rows: [{ id: "field-row", index: 0, label: "0 deg", weight: 1 }] }}
        wavelengths={{ rows: [{ id: "wavelength-row", index: 1, label: "587 nm", weight: 1 }] }}
        prescription={{
          rows: [],
          onOpenMediumModal: jest.fn(),
          onOpenAsphericalModal: jest.fn(),
          onOpenDecenterModal: jest.fn(),
          onOpenDiffractionGratingModal: jest.fn(),
        }}
      />
    </OptimizationStoreContext.Provider>,
  );

  return store;
}

describe("BottomDrawerContainer", () => {
  it("owns optimization-store-backed tab, optimizer, weight, prescription, and operand handlers", async () => {
    const user = userEvent.setup();
    const store = renderBottomDrawerContainer();

    await user.click(screen.getByRole("button", { name: "Fields" }));
    expect(store.getState().activeTabId).toBe("fields");

    await user.click(screen.getByRole("button", { name: "Differential Evolution" }));
    expect(store.getState().optimizer.kind).toBe("differential_evolution");

    await user.click(screen.getByRole("button", { name: "Update field-row" }));
    expect(store.getState().fieldWeights[0]).toBe(7);

    await user.click(screen.getByRole("button", { name: "Update wavelength-row" }));
    expect(store.getState().wavelengthWeights[1]).toBe(7);

    await user.click(screen.getByRole("button", { name: "Open Radius" }));
    expect(store.getState().radiusModal).toMatchObject({ open: true, surfaceIndex: 1 });

    await user.click(screen.getByRole("button", { name: "Open Thickness" }));
    expect(store.getState().thicknessModal).toMatchObject({ open: true, surfaceIndex: 2 });

    const initialOperandCount = store.getState().operands.length;
    await user.click(screen.getByRole("button", { name: "Add Operand" }));
    expect(store.getState().operands).toHaveLength(initialOperandCount + 1);
  });
});
