import React from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore, type StoreApi } from "zustand";
import { ZernikeTermsModal } from "@/features/lens-editor/components/ZernikeTermsModal";
import { SpecsConfiguratorStoreContext } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import {
  createSpecsConfiguratorSlice,
  type SpecsConfiguratorState,
} from "@/features/lens-editor/stores/specsConfiguratorStore";
import type { ZernikeData } from "@/features/lens-editor/types/zernikeData";
import { NUM_NOLL_TERMS, NUM_FRINGE_TERMS } from "@/features/lens-editor/lib/zernikeData";
import type { SelectOption } from "@/shared/components/primitives/Select";
import type { OpticalSpecs } from "@/shared/lib/types/opticalModel";

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mathjax-context">{children}</div>
  ),
  MathJax: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
}));

jest.mock("@/shared/components/primitives/Chip", () => ({
  Chip: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="chip-mock">{children}</span>
  ),
}));

const mockZernikeData: ZernikeData = {
  coefficients: Array.from({ length: NUM_NOLL_TERMS }, (_, i) => (i + 1) * 0.001),
  rms_normalized_coefficients: Array.from({ length: NUM_NOLL_TERMS }, (_, i) => (i + 1) * 0.0005),
  rms_wfe: 0.0523,
  pv_wfe: 0.1842,
  strehl_ratio: 0.8912,
  num_terms: NUM_NOLL_TERMS,
  field_index: 0,
  wavelength_nm: 587.0,
};

const fieldOptions: SelectOption[] = [
  { value: 0, label: "0.00°" },
  { value: 1, label: "14.0°" },
  { value: 2, label: "20.0°" },
];

const wavelengthOptions: SelectOption[] = [
  { value: 0, label: "656.3 nm" },
  { value: 1, label: "587.0 nm" },
  { value: 2, label: "486.1 nm" },
];

const committedSpecs: OpticalSpecs = {
  pupil: { space: "object", type: "epd", value: 10 },
  field: { space: "object", type: "angle", maxField: 20, fields: [0, 0.7, 1], isRelative: true },
  wavelengths: { weights: [[656.3, 1], [587.0, 2], [486.1, 1]], referenceIndex: 1 },
};

const createSpecsStore = (specs: OpticalSpecs = committedSpecs): StoreApi<SpecsConfiguratorState> => {
  const store = createStore<SpecsConfiguratorState>(createSpecsConfiguratorSlice);
  store.getState().setCommittedSpecs(specs);
  return store;
};

const renderWithSpecsStore = (
  ui: React.ReactElement,
  store: StoreApi<SpecsConfiguratorState> = createSpecsStore(),
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <SpecsConfiguratorStoreContext.Provider value={store}>
      {children}
    </SpecsConfiguratorStoreContext.Provider>
  );
  return render(ui, { wrapper: Wrapper });
};

const createMockFetchData = (data: ZernikeData = mockZernikeData) => {
  return jest.fn().mockResolvedValue(data);
};

const defaultProps = {
  isOpen: true,
  fieldOptions,
  wavelengthOptions,
  onFetchData: createMockFetchData(),
  onClose: jest.fn(),
};

describe("ZernikeTermsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog when isOpen is true", async () => {
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => {});
  });

  it("renders the title 'Zernike Terms'", async () => {
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} />);
    expect(screen.getByText("Zernike Terms")).toBeInTheDocument();
    await act(async () => {});
  });

  it("renders Half-Field and Wavelength dropdowns with labels", async () => {
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} />);
    expect(screen.getByLabelText("Half-Field")).toBeInTheDocument();
    expect(screen.getByLabelText("Wavelength")).toBeInTheDocument();
    await act(async () => {});
  });

  it("calls onFetchData with the committed reference wavelength on open", async () => {
    const onFetchData = createMockFetchData();
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 1, "fringe");
    });
    await act(async () => {}); // flush pending .then() state updates
  });

  it("initially displays the committed reference wavelength option", async () => {
    const onFetchData = createMockFetchData();
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    expect(screen.getByLabelText("Wavelength")).toHaveDisplayValue("587.0 nm");
    await act(async () => {});
  });

  it("renders table column headers (Fringe ordering by default)", async () => {
    const onFetchData = createMockFetchData();
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    expect(screen.getByRole("columnheader", { name: "Fringe j" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Notation" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Classical Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Non-normalized Term" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "RMS Normalized Term (waves)" })).toBeInTheDocument();
  });

  it("renders NUM_FRINGE_TERMS data rows in the table (fringe by default)", async () => {
    const onFetchData = createMockFetchData();
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // 1 header row + NUM_FRINGE_TERMS data rows
    expect(rows.length).toBe(NUM_FRINGE_TERMS + 1);
  });

  it("shows P-V WFE, RMS WFE, and Strehl ratio in summary", async () => {
    const onFetchData = createMockFetchData();
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    const chips = screen.getAllByTestId("chip-mock");
    expect(chips).toHaveLength(3);
    expect(chips[0]).toHaveTextContent("P-V WFE: 0.1842 waves");
    expect(chips[1]).toHaveTextContent("RMS WFE: 0.0523 waves");
    expect(chips[2]).toHaveTextContent("Strehl Ratio: 0.8912");
  });

  it("dropdown changes call onFetchData with new indices and current ordering", async () => {
    const onFetchData = createMockFetchData();
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const fieldSelect = screen.getByLabelText("Half-Field");
    await userEvent.selectOptions(fieldSelect, "2");
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(2, 1, "fringe");
    });
    await act(async () => {});
  });

  it("wavelength dropdown change calls onFetchData with new wavelength index and current ordering", async () => {
    const onFetchData = createMockFetchData();
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const wvlSelect = screen.getByLabelText("Wavelength");
    await userEvent.selectOptions(wvlSelect, "2");
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 2, "fringe");
    });
    await act(async () => {});
  });

  it("shows loading indicator while fetching", async () => {
    // Create a promise that never resolves during test
    const onFetchData = jest.fn().mockReturnValue(new Promise(() => {}));
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => {
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });
    // Initial load: no table yet
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows loading mask over table when re-fetching", async () => {
    // First fetch resolves, then second never resolves
    let resolveFirst!: (value: ZernikeData) => void;
    const firstFetch = new Promise<ZernikeData>((res) => { resolveFirst = res; });
    const onFetchData = jest.fn()
      .mockReturnValueOnce(firstFetch)
      .mockReturnValue(new Promise(() => {})); // never resolves

    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);

    // Resolve the first fetch so data is populated
    await act(async () => {
      resolveFirst(mockZernikeData);
    });
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    // Trigger a re-fetch via dropdown change
    const fieldSelect = screen.getByLabelText("Half-Field");
    await userEvent.selectOptions(fieldSelect, "1");

    // Table stays visible and loading mask appears
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByTestId("loading-mask")).toBeInTheDocument();
  });

  it("loading mask is absent when not loading with data", async () => {
    const onFetchData = createMockFetchData();
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    expect(screen.queryByTestId("loading-mask")).not.toBeInTheDocument();
  });

  it("Ok button calls onClose", async () => {
    const onClose = jest.fn();
    const onFetchData = createMockFetchData();
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} onClose={onClose} />);
    await waitFor(() => expect(onFetchData).toHaveBeenCalled());
    await act(async () => {});
    await userEvent.click(screen.getByRole("button", { name: "Ok" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("re-open resets indices to field 0 and the committed reference wavelength", async () => {
    const onFetchData = createMockFetchData();
    const { rerender } = renderWithSpecsStore(
      <ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={false} />,
    );
    expect(onFetchData).not.toHaveBeenCalled();

    // Open the modal
    rerender(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={true} />);
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 1, "fringe");
    });

    // Close and reopen
    onFetchData.mockClear();
    rerender(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={false} />);
    rerender(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={true} />);
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 1, "fringe");
    });
    await act(async () => {});
  });

  it("re-open re-reads the latest committed reference wavelength", async () => {
    const onFetchData = createMockFetchData();
    const specsStore = createSpecsStore();
    const { rerender } = renderWithSpecsStore(
      <ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={true} />,
      specsStore,
    );
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 1, "fringe");
    });

    const nextSpecs: OpticalSpecs = {
      ...committedSpecs,
      wavelengths: { ...committedSpecs.wavelengths, referenceIndex: 2 },
    };
    act(() => {
      specsStore.getState().setCommittedSpecs(nextSpecs);
    });

    onFetchData.mockClear();
    rerender(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={false} />);
    rerender(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={true} />);

    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 2, "fringe");
    });
    expect(screen.getByLabelText("Wavelength")).toHaveDisplayValue("486.1 nm");
    await act(async () => {});
  });

  it("renders Ordering dropdown with label", async () => {
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} />);
    expect(screen.getByLabelText("Ordering")).toBeInTheDocument();
    await act(async () => {});
  });

  it("selecting Noll ordering calls onFetchData with noll", async () => {
    const onFetchData = createMockFetchData();
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(onFetchData).toHaveBeenCalledWith(0, 1, "fringe"));

    const orderingSelect = screen.getByLabelText("Ordering");
    await userEvent.selectOptions(orderingSelect, "noll");
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 1, "noll");
    });
    await act(async () => {});
  });

  it("when Noll ordering selected, table header shows 'Noll j'", async () => {
    const fringeData: ZernikeData = {
      ...mockZernikeData,
      coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.001),
      rms_normalized_coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.0005),
      num_terms: NUM_FRINGE_TERMS,
    };
    // First call returns fringe-sized data (on open), subsequent calls return noll-sized data
    const onFetchData = jest.fn()
      .mockResolvedValueOnce(fringeData)
      .mockResolvedValue(mockZernikeData);
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const orderingSelect = screen.getByLabelText("Ordering");
    await userEvent.selectOptions(orderingSelect, "noll");
    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: "Noll j" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("columnheader", { name: "Fringe j" })).not.toBeInTheDocument();
  });

  it("when Noll ordering selected, table has NUM_NOLL_TERMS rows", async () => {
    const fringeData: ZernikeData = {
      ...mockZernikeData,
      coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.001),
      rms_normalized_coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.0005),
      num_terms: NUM_FRINGE_TERMS,
    };
    // First call returns fringe-sized data (on open), subsequent calls return noll-sized data
    const onFetchData = jest.fn()
      .mockResolvedValueOnce(fringeData)
      .mockResolvedValue(mockZernikeData);
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const orderingSelect = screen.getByLabelText("Ordering");
    await userEvent.selectOptions(orderingSelect, "noll");
    await waitFor(() => expect(onFetchData).toHaveBeenCalledWith(0, 1, "noll"));

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // 1 header row + NUM_NOLL_TERMS data rows
    expect(rows.length).toBe(NUM_NOLL_TERMS + 1);
  });

  it("does not crash when switching back to Fringe while stale Noll data (56 coefficients) is still in state", async () => {
    const fringeData: ZernikeData = {
      ...mockZernikeData,
      coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.001),
      rms_normalized_coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.0005),
      num_terms: NUM_FRINGE_TERMS,
    };
    // Open with Fringe data, switch to Noll (returns noll data), then switch back to Fringe
    // but block the third fetch so stale Noll data remains while numTerms=37
    const onFetchData = jest.fn()
      .mockResolvedValueOnce(fringeData)        // initial open
      .mockResolvedValueOnce(mockZernikeData)   // switch to Noll
      .mockReturnValue(new Promise(() => {}));   // switch back to Fringe — never resolves

    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const orderingSelect = screen.getByLabelText("Ordering");
    await userEvent.selectOptions(orderingSelect, "noll");
    await waitFor(() => expect(screen.getByRole("columnheader", { name: "Noll j" })).toBeInTheDocument());

    // Switch back to Fringe — stale Noll data (56 coefficients) stays, numTerms becomes 37
    await userEvent.selectOptions(orderingSelect, "fringe");

    // Must not throw; table still renders (with stale data clamped to 37 rows) + loading mask
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByTestId("loading-mask")).toBeInTheDocument();
  });

  it("after switching to Noll, row 5 notation reflects Noll j=5 (n=2,m=-2), not Fringe j=5 (n=2,m=2)", async () => {
    const fringeData: ZernikeData = {
      ...mockZernikeData,
      coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.001),
      rms_normalized_coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.0005),
      num_terms: NUM_FRINGE_TERMS,
    };
    const onFetchData = jest.fn()
      .mockResolvedValueOnce(fringeData)
      .mockResolvedValue(mockZernikeData);

    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const orderingSelect = screen.getByLabelText("Ordering");
    await userEvent.selectOptions(orderingSelect, "noll");
    await waitFor(() => expect(onFetchData).toHaveBeenCalledWith(0, 1, "noll"));

    // Noll j=5 → n=2, m=-2 → \(Z_{2}^{-2}\)
    // Fringe j=5 → n=2, m=2 → \(Z_{2}^{2}\)
    const table = screen.getByRole("table");
    const dataRows = within(table).getAllByRole("row").slice(1);
    expect(dataRows[4].textContent).toContain("\\(Z_{2}^{-2}\\)");
  });

  it("table scroll container uses a bounded viewport-relative height cap", async () => {
    const onFetchData = createMockFetchData();
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    const scrollContainer = screen.getByTestId("zernike-table-scroll");
    expect(scrollContainer.className).toContain("max-h-[clamp(5rem,calc(90dvh-26rem),32rem)]");
    expect(scrollContainer.className).toContain("overflow-y-auto");
    expect(scrollContainer.className).not.toContain("60vh");
    expect(scrollContainer.className).not.toContain("20rem");
    expect(scrollContainer.className).toContain("90dvh");
  });

  it("does not wrap its content in its own MathJaxContext", async () => {
    renderWithSpecsStore(<ZernikeTermsModal {...defaultProps} />);
    await act(async () => {});
    expect(screen.queryByTestId("mathjax-context")).not.toBeInTheDocument();
  });

  it("re-open resets ordering to fringe", async () => {
    const onFetchData = createMockFetchData();
    const { rerender } = renderWithSpecsStore(
      <ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={true} />,
    );
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    // Switch to Noll
    const orderingSelect = screen.getByLabelText("Ordering");
    await userEvent.selectOptions(orderingSelect, "noll");
    await waitFor(() => expect(onFetchData).toHaveBeenCalledWith(0, 1, "noll"));

    // Close and reopen
    onFetchData.mockClear();
    rerender(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={false} />);
    rerender(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={true} />);
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 1, "fringe");
    });
    await act(async () => {});
  });
});
