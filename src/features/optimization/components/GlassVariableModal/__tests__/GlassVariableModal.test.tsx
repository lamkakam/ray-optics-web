import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CATALOG_NAMES,
  type AllGlassCatalogsData,
  type CatalogGlassData,
} from "@/features/glass-map/types/glassMap";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import { GlassVariableModal } from "@/features/optimization/components/GlassVariableModal/GlassVariableModal";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

function glass(nd: number, vd: number): CatalogGlassData {
  return {
    refractiveIndexD: nd,
    refractiveIndexE: nd + 0.002,
    abbeNumberD: vd,
    abbeNumberE: vd - 0.2,
    partialDispersions: { P_fe: 0.4, P_Fd: 0.6, P_gF: 0.5 },
    dispersionCoeffKind: "Sellmeier3T",
    dispersionCoeffs: [1, 2, 3, 4, 5, 6],
  };
}

const catalogs: AllGlassCatalogsData = {
  CDGM: { "H-ZK1": glass(1.5, 60) },
  Hikari: { "J-BK7A": glass(1.516, 64) },
  Hoya: { BSC7: glass(1.517, 64.2) },
  Ohara: { "S-BSL7": glass(1.5163, 64.1) },
  Schott: {
    "N-BK7": glass(1.5168, 64.17),
    "N-LAK9": glass(1.691, 54.7),
  },
  Sumita: { "K-BK7": glass(1.517, 64.1) },
  Special: {
    air: glass(1, 0),
    REFL: glass(1, 0),
    CaF2: glass(1.4338, 95.2),
    "Fused Silica": glass(1.4585, 67.8),
    Water: glass(1.333, 55.8),
    D263TECO: glass(1.523, 55),
    "Unsupported Special": glass(1.6, 40),
  },
  Custom: {
    CUSTOM_A: glass(1.62, 42),
  },
};

const model: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "N-BK7",
      manufacturer: "Schott",
      semiDiameter: 10,
    },
  ],
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20, fields: [0], isRelative: true },
    wavelengths: { weights: [[587.562, 1]], referenceIndex: 0 },
  },
};

describe("GlassVariableModal", () => {
  it("shows the selection plus nine-column candidate grid only in Variable mode", async () => {
    const user = userEvent.setup();

    render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{ surfaceIndex: 1, mode: "constant" }}
        catalogs={catalogs}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("ag-grid-mock")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Glass mode"), "variable");

    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");
    expect([...headers].map((header) => header.textContent)).toEqual([
      "",
      "Catalog",
      "Label",
      "nd",
      "vd",
      "ne",
      "ve",
      "Pg,F",
      "PF,e",
      "PF,d",
    ]);
  });

  it("gives the normal-layout candidate grid a definite viewport height", () => {
    render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{
          surfaceIndex: 1,
          mode: "variable",
          candidates: [{ catalog: "Schott", name: "N-BK7" }],
        }}
        catalogs={catalogs}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const grid = screen.getByTestId("ag-grid-mock");
    expect(grid.parentElement).toHaveClass("ag-grid-touch-scroll", "h-[280px]");
    expect(grid).toHaveAttribute("data-dom-layout", "normal");
  });

  it("makes only candidate data columns sortable and filterable without blank filters", () => {
    render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{
          surfaceIndex: 1,
          mode: "variable",
          candidates: [{ catalog: "Schott", name: "N-BK7" }],
        }}
        catalogs={catalogs}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");
    const expectedTextFilterOptions = "contains,notContains,equals,notEqual,startsWith,endsWith";
    const expectedNumberFilterOptions = "equals,notEqual,greaterThan,greaterThanOrEqual,lessThan,lessThanOrEqual,inRange";

    expect(headers[0]).toHaveAttribute("data-sortable", "false");
    expect(headers[0]).toHaveAttribute("data-filter", "false");
    expect(headers[0]).toHaveAttribute("data-un-sort-icon", "false");
    expect(headers[0]).not.toHaveAttribute("data-filter-options");
    for (const header of [...headers].slice(1)) {
      expect(header).toHaveAttribute("data-sortable", "true");
      expect(header).toHaveAttribute("data-filter", "true");
      expect(header).toHaveAttribute("data-un-sort-icon", "true");
    }
    for (const header of [...headers].slice(1, 3)) {
      expect(header).toHaveAttribute("data-filter-options", expectedTextFilterOptions);
    }
    for (const header of [...headers].slice(3)) {
      expect(header).toHaveAttribute("data-filter-options", expectedNumberFilterOptions);
      expect(header.getAttribute("data-filter-options")?.split(",")).not.toEqual(
        expect.arrayContaining(["blank", "notBlank"]),
      );
    }
  });

  it("maps and formats all seven optical values to six decimal places", () => {
    render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{
          surfaceIndex: 1,
          mode: "variable",
          candidates: [{ catalog: "Schott", name: "N-BK7" }],
        }}
        catalogs={catalogs}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const nBk7Row = screen.getByRole("checkbox", { name: "Select Schott N-BK7" }).closest("tr");
    expect(nBk7Row).not.toBeNull();
    expect([...nBk7Row!.querySelectorAll("td")].map((cell) => cell.textContent)).toEqual([
      "",
      "Schott",
      "N-BK7",
      "1.516800",
      "64.170000",
      "1.518800",
      "63.970000",
      "0.500000",
      "0.400000",
      "0.600000",
    ]);
  });

  it("keeps global, catalog, and individual row selection synchronized", async () => {
    const user = userEvent.setup();

    render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{
          surfaceIndex: 1,
          mode: "variable",
          candidates: [{ catalog: "Schott", name: "N-BK7" }],
        }}
        catalogs={catalogs}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const grid = screen.getByTestId("ag-grid-mock");
    const selectionHeader = grid.querySelector("thead th");
    expect(selectionHeader).not.toBeNull();
    const globalCheckbox = within(selectionHeader as HTMLElement).getByRole("checkbox");

    await user.click(globalCheckbox);

    for (const catalog of CATALOG_NAMES) {
      expect(screen.getByRole("checkbox", { name: `Select all ${catalog} candidates` })).toBeChecked();
    }
    for (const rowCheckbox of within(grid).getAllByRole("checkbox").slice(1)) {
      expect(rowCheckbox).toBeChecked();
    }

    await user.click(screen.getByRole("checkbox", { name: "Select all Hoya candidates" }));

    expect(screen.getByRole("checkbox", { name: "Select Hoya BSC7" })).not.toBeChecked();
    expect(globalCheckbox).not.toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: "Select Hoya BSC7" }));

    expect(screen.getByRole("checkbox", { name: "Select all Hoya candidates" })).toBeChecked();
    await waitFor(() => expect(globalCheckbox).toBeChecked());

    await user.click(screen.getByRole("checkbox", { name: "Select Schott N-LAK9" }));

    expect(screen.getByRole("checkbox", { name: "Select all Schott candidates" })).toBePartiallyChecked();
    expect(globalCheckbox).not.toBeChecked();

    await user.click(globalCheckbox);
    await user.click(globalCheckbox);

    for (const catalog of CATALOG_NAMES) {
      expect(screen.getByRole("checkbox", { name: `Select all ${catalog} candidates` })).not.toBeChecked();
    }
    for (const rowCheckbox of within(grid).getAllByRole("checkbox").slice(1)) {
      expect(rowCheckbox).not.toBeChecked();
    }
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });

  it("preserves selected identities and canonical confirm order across sort and filter changes", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();

    render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{
          surfaceIndex: 1,
          mode: "variable",
          candidates: [
            { catalog: "Schott", name: "N-LAK9" },
            { catalog: "CDGM", name: "H-ZK1" },
            { catalog: "Hoya", name: "BSC7" },
          ],
        }}
        catalogs={catalogs}
        onSetMode={onSetMode}
        onClose={jest.fn()}
      />,
    );

    const grid = screen.getByTestId("ag-grid-mock");
    act(() => {
      grid.dispatchEvent(new CustomEvent("mockSortChanged", {
        bubbles: true,
        detail: {
          columnState: [
            { colId: "vd", sort: "asc" },
            { colId: "label", sort: "desc", sortIndex: 1 },
          ],
        },
      }));
      grid.dispatchEvent(new CustomEvent("mockFilterChanged", {
        bubbles: true,
        detail: {
          filterModel: {
            catalog: { filterType: "text", type: "contains", filter: "o" },
            nd: { filterType: "number", type: "greaterThan", filter: 1.5 },
          },
        },
      }));
    });

    expect(screen.getByRole("checkbox", { name: "Select Schott N-LAK9" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select CDGM H-ZK1" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Hoya BSC7" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSetMode).toHaveBeenCalledWith(1, {
      mode: "variable",
      candidates: [
        { catalog: "CDGM", name: "H-ZK1" },
        { catalog: "Hoya", name: "BSC7" },
        { catalog: "Schott", name: "N-LAK9" },
      ],
    });
  });

  it("selects every live glass from the incumbent catalog on the first Variable switch", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();

    render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{ surfaceIndex: 1, mode: "constant" }}
        catalogs={catalogs}
        onSetMode={onSetMode}
        onClose={jest.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Glass mode"), "variable");

    expect(screen.getByRole("checkbox", { name: "Select all Schott candidates" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select all Hoya candidates" })).not.toBeChecked();
    expect(screen.getAllByRole("checkbox", { name: /Select Schott / })).toHaveLength(2);
    for (const checkbox of screen.getAllByRole("checkbox", { name: /Select Schott / })) {
      expect(checkbox).toBeChecked();
    }

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSetMode).toHaveBeenCalledWith(1, {
      mode: "variable",
      candidates: [
        { catalog: "Schott", name: "N-BK7" },
        { catalog: "Schott", name: "N-LAK9" },
      ],
    });
  });

  it("supports tri-state catalog bulk selection and individual candidate selection", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();

    render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{
          surfaceIndex: 1,
          mode: "variable",
          candidates: [{ catalog: "Schott", name: "N-BK7" }],
        }}
        catalogs={catalogs}
        onSetMode={onSetMode}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Select all Schott candidates" })).toBePartiallyChecked();

    await user.click(screen.getByRole("checkbox", { name: "Select Hoya BSC7" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Schott N-LAK9" }));

    expect(screen.getByRole("checkbox", { name: "Select all Schott candidates" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSetMode).toHaveBeenCalledWith(1, {
      mode: "variable",
      candidates: [
        { catalog: "Hoya", name: "BSC7" },
        { catalog: "Schott", name: "N-BK7" },
        { catalog: "Schott", name: "N-LAK9" },
      ],
    });
  });

  it("renders all eight catalog bulk controls and only the four eligible Special candidates", () => {
    render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={1}
        selectedMode={{
          surfaceIndex: 1,
          mode: "variable",
          candidates: [{ catalog: "Schott", name: "N-BK7" }],
        }}
        catalogs={catalogs}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getAllByRole("checkbox", { name: /Select all .* candidates/ })).toHaveLength(8);
    expect(screen.getByRole("checkbox", { name: "Select Special CaF2" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Special D263TECO" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Select Special air" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Select Special REFL" })).not.toBeInTheDocument();
    expect(screen.queryByText("Unsupported Special")).not.toBeInTheDocument();
  });

  it("starts air and numeric ModelGlass rows with an empty pool and requires a selection", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <GlassVariableModal
        isOpen
        optimizationModel={model}
        surfaceIndex={0}
        selectedMode={{ surfaceIndex: 0, mode: "constant" }}
        catalogs={catalogs}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Glass mode"), "variable");

    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByText("Select at least one glass candidate.")).toBeInTheDocument();

    rerender(
      <GlassVariableModal
        isOpen
        optimizationModel={{
          ...model,
          surfaces: [{ ...model.surfaces[0], medium: "1.6", manufacturer: "40" }],
        }}
        surfaceIndex={1}
        selectedMode={{ surfaceIndex: 1, mode: "constant" }}
        catalogs={catalogs}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Glass mode"), "variable");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });

  it("uses an explicit Custom manufacturer when its name collides with Special", async () => {
    const user = userEvent.setup();
    render(
      <GlassVariableModal
        isOpen
        optimizationModel={{
          ...model,
          surfaces: [{ ...model.surfaces[0], medium: "CaF2", manufacturer: "Custom" }],
        }}
        surfaceIndex={1}
        selectedMode={{ surfaceIndex: 1, mode: "constant" }}
        catalogs={{
          ...catalogs,
          Custom: {
            ...catalogs.Custom,
            CaF2: glass(1.5, 50),
          },
        }}
        onSetMode={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Glass mode"), "variable");

    expect(screen.getByRole("checkbox", { name: "Select all Custom candidates" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select all Special candidates" })).not.toBeChecked();
  });

  it("marks unavailable persisted Custom candidates so they can be removed", async () => {
    const user = userEvent.setup();
    const onSetMode = jest.fn();

    render(
      <GlassVariableModal
        isOpen
        optimizationModel={{
          ...model,
          surfaces: [{ ...model.surfaces[0], medium: "CUSTOM_A", manufacturer: "Custom" }],
        }}
        surfaceIndex={1}
        selectedMode={{
          surfaceIndex: 1,
          mode: "variable",
          candidates: [
            { catalog: "Custom", name: "DELETED_CUSTOM" },
            { catalog: "Custom", name: "CUSTOM_A" },
          ],
        }}
        catalogs={catalogs}
        onSetMode={onSetMode}
        onClose={jest.fn()}
      />,
    );

    const grid = screen.getByTestId("ag-grid-mock");
    expect(within(grid).getByText("DELETED_CUSTOM (Unavailable)")).toBeInTheDocument();
    const staleCheckbox = screen.getByRole("checkbox", { name: "Select Custom DELETED_CUSTOM" });
    expect(staleCheckbox).toBeChecked();
    const staleRow = staleCheckbox.closest("tr");
    expect(staleRow).not.toBeNull();
    expect([...staleRow!.querySelectorAll("td")].map((cell) => cell.textContent)).toEqual([
      "",
      "Custom",
      "DELETED_CUSTOM (Unavailable)",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    await user.click(staleCheckbox);
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSetMode).toHaveBeenCalledWith(1, {
      mode: "variable",
      candidates: [{ catalog: "Custom", name: "CUSTOM_A" }],
    });
  });
});
