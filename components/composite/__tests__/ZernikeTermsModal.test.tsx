import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ZernikeTermsModal } from "@/components/composite/ZernikeTermsModal";
import type { ZernikeData } from "@/lib/zernikeData";
import { NUM_NOLL_TERMS, NUM_FRINGE_TERMS } from "@/lib/zernikeData";
import type { SelectOption } from "@/components/micro/Select";

jest.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: jest.fn() }),
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
    render(<ZernikeTermsModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a dialog when isOpen is true", async () => {
    render(<ZernikeTermsModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders the title 'Zernike Terms'", async () => {
    render(<ZernikeTermsModal {...defaultProps} />);
    expect(screen.getByText("Zernike Terms")).toBeInTheDocument();
  });

  it("renders Field and Wavelength dropdowns with labels", async () => {
    render(<ZernikeTermsModal {...defaultProps} />);
    expect(screen.getByLabelText("Field")).toBeInTheDocument();
    expect(screen.getByLabelText("Wavelength")).toBeInTheDocument();
  });

  it("calls onFetchData(0, 0, 'noll') on open", async () => {
    const onFetchData = createMockFetchData();
    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 0, "noll");
    });
  });

  it("renders table column headers (Noll ordering by default)", async () => {
    const onFetchData = createMockFetchData();
    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(onFetchData).toHaveBeenCalled());
    expect(screen.getByRole("columnheader", { name: "Noll j" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Notation" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Classical Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Non-normalized Term" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "RMS Normalized Term (waves)" })).toBeInTheDocument();
  });

  it("renders 56 data rows in the table", async () => {
    const onFetchData = createMockFetchData();
    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(onFetchData).toHaveBeenCalled());
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // 1 header row + 56 data rows
    expect(rows.length).toBe(NUM_NOLL_TERMS + 1);
  });

  it("shows P-V WFE, RMS WFE, and Strehl ratio in summary", async () => {
    const onFetchData = createMockFetchData();
    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(onFetchData).toHaveBeenCalled());
    expect(screen.getByText(/P-V WFE/)).toBeInTheDocument();
    expect(screen.getByText(/RMS WFE/)).toBeInTheDocument();
    expect(screen.getByText(/Strehl Ratio/)).toBeInTheDocument();
    expect(screen.getByText(/0\.1842/)).toBeInTheDocument();
    expect(screen.getByText(/0\.0523/)).toBeInTheDocument();
    expect(screen.getByText(/0\.8912/)).toBeInTheDocument();
  });

  it("dropdown changes call onFetchData with new indices and current ordering", async () => {
    const onFetchData = createMockFetchData();
    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(onFetchData).toHaveBeenCalledWith(0, 0, "noll"));

    const fieldSelect = screen.getByLabelText("Field");
    await userEvent.selectOptions(fieldSelect, "2");
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(2, 0, "noll");
    });
  });

  it("wavelength dropdown change calls onFetchData with new wavelength index and current ordering", async () => {
    const onFetchData = createMockFetchData();
    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(onFetchData).toHaveBeenCalledWith(0, 0, "noll"));

    const wvlSelect = screen.getByLabelText("Wavelength");
    await userEvent.selectOptions(wvlSelect, "2");
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 2, "noll");
    });
  });

  it("shows loading indicator while fetching", async () => {
    // Create a promise that never resolves during test
    const onFetchData = jest.fn().mockReturnValue(new Promise(() => {}));
    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
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

    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);

    // Resolve the first fetch so data is populated
    resolveFirst(mockZernikeData);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    // Trigger a re-fetch via dropdown change
    const fieldSelect = screen.getByLabelText("Field");
    await userEvent.selectOptions(fieldSelect, "1");

    // Table stays visible and loading mask appears
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByTestId("loading-mask")).toBeInTheDocument();
  });

  it("loading mask is absent when not loading with data", async () => {
    const onFetchData = createMockFetchData();
    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    expect(screen.queryByTestId("loading-mask")).not.toBeInTheDocument();
  });

  it("Ok button calls onClose", async () => {
    const onClose = jest.fn();
    const onFetchData = createMockFetchData();
    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} onClose={onClose} />);
    await waitFor(() => expect(onFetchData).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: "Ok" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("re-open resets indices to 0 and fetches again", async () => {
    const onFetchData = createMockFetchData();
    const { rerender } = render(
      <ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={false} />
    );
    expect(onFetchData).not.toHaveBeenCalled();

    // Open the modal
    rerender(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={true} />);
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 0, "noll");
    });

    // Close and reopen
    onFetchData.mockClear();
    rerender(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={false} />);
    rerender(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={true} />);
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 0, "noll");
    });
  });

  it("renders Ordering dropdown with label", async () => {
    render(<ZernikeTermsModal {...defaultProps} />);
    expect(screen.getByLabelText("Ordering")).toBeInTheDocument();
  });

  it("selecting Fringe ordering calls onFetchData with fringe", async () => {
    const onFetchData = createMockFetchData();
    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(onFetchData).toHaveBeenCalledWith(0, 0, "noll"));

    const orderingSelect = screen.getByLabelText("Ordering");
    await userEvent.selectOptions(orderingSelect, "fringe");
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 0, "fringe");
    });
  });

  it("when Fringe ordering selected, table header shows 'Fringe j'", async () => {
    const fringeData: ZernikeData = {
      ...mockZernikeData,
      coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.001),
      rms_normalized_coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.0005),
      num_terms: NUM_FRINGE_TERMS,
    };
    // First call returns noll-sized data (on open), subsequent calls return fringe-sized data
    const onFetchData = jest.fn()
      .mockResolvedValueOnce(mockZernikeData)
      .mockResolvedValue(fringeData);
    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const orderingSelect = screen.getByLabelText("Ordering");
    await userEvent.selectOptions(orderingSelect, "fringe");
    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: "Fringe j" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("columnheader", { name: "Noll j" })).not.toBeInTheDocument();
  });

  it("when Fringe ordering selected, table has NUM_FRINGE_TERMS rows", async () => {
    const fringeData: ZernikeData = {
      ...mockZernikeData,
      coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.001),
      rms_normalized_coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.0005),
      num_terms: NUM_FRINGE_TERMS,
    };
    // First call returns noll-sized data (on open), subsequent calls return fringe-sized data
    const onFetchData = jest.fn()
      .mockResolvedValueOnce(mockZernikeData)
      .mockResolvedValue(fringeData);
    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const orderingSelect = screen.getByLabelText("Ordering");
    await userEvent.selectOptions(orderingSelect, "fringe");
    await waitFor(() => expect(onFetchData).toHaveBeenCalledWith(0, 0, "fringe"));

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // 1 header row + NUM_FRINGE_TERMS data rows
    expect(rows.length).toBe(NUM_FRINGE_TERMS + 1);
  });

  it("does not crash when switching back to Noll while stale Fringe data (37 coefficients) is still in state", async () => {
    const fringeData: ZernikeData = {
      ...mockZernikeData,
      coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.001),
      rms_normalized_coefficients: Array.from({ length: NUM_FRINGE_TERMS }, (_, i) => (i + 1) * 0.0005),
      num_terms: NUM_FRINGE_TERMS,
    };
    // Open with Noll data, switch to Fringe (returns fringe data), then switch back to Noll
    // but block the third fetch so stale Fringe data remains while numTerms=56
    const onFetchData = jest.fn()
      .mockResolvedValueOnce(mockZernikeData)  // initial open
      .mockResolvedValueOnce(fringeData)        // switch to Fringe
      .mockReturnValue(new Promise(() => {}));  // switch back to Noll — never resolves

    render(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const orderingSelect = screen.getByLabelText("Ordering");
    await userEvent.selectOptions(orderingSelect, "fringe");
    await waitFor(() => expect(screen.getByRole("columnheader", { name: "Fringe j" })).toBeInTheDocument());

    // Switch back to Noll — stale Fringe data (37 coefficients) stays, numTerms becomes 56
    await userEvent.selectOptions(orderingSelect, "noll");

    // Must not throw; table still renders (with stale data clamped to 37 rows) + loading mask
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByTestId("loading-mask")).toBeInTheDocument();
  });

  it("re-open resets ordering to noll", async () => {
    const onFetchData = createMockFetchData();
    const { rerender } = render(
      <ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={true} />
    );
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    // Switch to Fringe
    const orderingSelect = screen.getByLabelText("Ordering");
    await userEvent.selectOptions(orderingSelect, "fringe");
    await waitFor(() => expect(onFetchData).toHaveBeenCalledWith(0, 0, "fringe"));

    // Close and reopen
    onFetchData.mockClear();
    rerender(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={false} />);
    rerender(<ZernikeTermsModal {...defaultProps} onFetchData={onFetchData} isOpen={true} />);
    await waitFor(() => {
      expect(onFetchData).toHaveBeenCalledWith(0, 0, "noll");
    });
  });
});
