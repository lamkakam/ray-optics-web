import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FocusingPanel } from "@/features/lens-editor/components/FocusingPanel";

const fieldOptions = [
  { value: 0, label: "0.00°" },
  { value: 1, label: "14.0°" },
  { value: 2, label: "20.0°" },
];

const defaultProps = {
  chromaticity: "mono" as const,
  metric: "rmsSpot" as const,
  fieldIndex: 0,
  fieldOptions,
  onChromaticityChange: jest.fn(),
  onMetricChange: jest.fn(),
  onFieldIndexChange: jest.fn(),
  onFocus: jest.fn(),
  disabled: false,
};

describe("FocusingPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders chromaticity radio group with correct options", () => {
    render(<FocusingPanel {...defaultProps} />);
    expect(screen.getByLabelText("Monochromatic")).toBeInTheDocument();
    expect(screen.getByLabelText("Polychromatic")).toBeInTheDocument();
  });

  it("renders metric radio group with correct options", () => {
    render(<FocusingPanel {...defaultProps} />);
    expect(screen.getByLabelText("Minimize RMS Spot Radius")).toBeInTheDocument();
    expect(screen.getByLabelText("Minimize Wavefront Error")).toBeInTheDocument();
  });

  it("marks mono as checked when chromaticity=mono", () => {
    render(<FocusingPanel {...defaultProps} chromaticity="mono" />);
    expect(screen.getByLabelText("Monochromatic")).toBeChecked();
    expect(screen.getByLabelText("Polychromatic")).not.toBeChecked();
  });

  it("marks poly as checked when chromaticity=poly", () => {
    render(<FocusingPanel {...defaultProps} chromaticity="poly" />);
    expect(screen.getByLabelText("Polychromatic")).toBeChecked();
    expect(screen.getByLabelText("Monochromatic")).not.toBeChecked();
  });

  it("renders field select with correct options", () => {
    render(<FocusingPanel {...defaultProps} />);
    const select = screen.getByLabelText("Field");
    expect(select).toBeInTheDocument();
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent("0.00°");
    expect(options[1]).toHaveTextContent("14.0°");
    expect(options[2]).toHaveTextContent("20.0°");
  });

  it("renders Focus button", () => {
    render(<FocusingPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Focus" })).toBeInTheDocument();
  });

  it("Focus button calls onFocus on click", async () => {
    const onFocus = jest.fn();
    render(<FocusingPanel {...defaultProps} onFocus={onFocus} />);
    await userEvent.click(screen.getByRole("button", { name: "Focus" }));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it("Focus button is disabled when disabled=true", () => {
    render(<FocusingPanel {...defaultProps} disabled />);
    expect(screen.getByRole("button", { name: "Focus" })).toBeDisabled();
  });

  it("Focus button is enabled when disabled=false", () => {
    render(<FocusingPanel {...defaultProps} disabled={false} />);
    expect(screen.getByRole("button", { name: "Focus" })).not.toBeDisabled();
  });

  it("calls onChromaticityChange when poly radio clicked", async () => {
    const onChromaticityChange = jest.fn();
    render(<FocusingPanel {...defaultProps} onChromaticityChange={onChromaticityChange} />);
    await userEvent.click(screen.getByLabelText("Polychromatic"));
    expect(onChromaticityChange).toHaveBeenCalledWith("poly");
  });

  it("calls onMetricChange when wavefront radio clicked", async () => {
    const onMetricChange = jest.fn();
    render(<FocusingPanel {...defaultProps} onMetricChange={onMetricChange} />);
    await userEvent.click(screen.getByLabelText("Minimize Wavefront Error"));
    expect(onMetricChange).toHaveBeenCalledWith("wavefront");
  });

  it("calls onFieldIndexChange when select changes", async () => {
    const onFieldIndexChange = jest.fn();
    render(<FocusingPanel {...defaultProps} onFieldIndexChange={onFieldIndexChange} />);
    await userEvent.selectOptions(screen.getByLabelText("Field"), "1");
    expect(onFieldIndexChange).toHaveBeenCalledWith(1);
  });
});
