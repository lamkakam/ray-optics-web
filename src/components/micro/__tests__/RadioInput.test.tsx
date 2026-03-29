import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioInput } from "@/components/micro/RadioInput";

type Fruit = "apple" | "banana" | "cherry";

const OPTIONS: ReadonlyArray<{ value: Fruit; label: string }> = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

const defaultProps = {
  name: "fruit",
  label: "Choose a fruit",
  options: OPTIONS,
  value: "apple" as Fruit,
  onChange: jest.fn(),
};

describe("RadioInput", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the legend text", () => {
    render(<RadioInput {...defaultProps} />);
    expect(screen.getByText("Choose a fruit")).toBeInTheDocument();
  });

  it("renders all option labels", () => {
    render(<RadioInput {...defaultProps} />);
    expect(screen.getByLabelText("Apple")).toBeInTheDocument();
    expect(screen.getByLabelText("Banana")).toBeInTheDocument();
    expect(screen.getByLabelText("Cherry")).toBeInTheDocument();
  });

  it("marks the correct option as checked based on value", () => {
    render(<RadioInput {...defaultProps} value="banana" />);
    expect(screen.getByLabelText("Apple")).not.toBeChecked();
    expect(screen.getByLabelText("Banana")).toBeChecked();
    expect(screen.getByLabelText("Cherry")).not.toBeChecked();
  });

  it("calls onChange with the selected value on user click", async () => {
    const onChange = jest.fn();
    render(<RadioInput {...defaultProps} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Cherry"));
    expect(onChange).toHaveBeenCalledWith("cherry");
  });

  it("applies disabled to all inputs when disabled=true", () => {
    render(<RadioInput {...defaultProps} disabled />);
    const radios = screen.getAllByRole("radio");
    radios.forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });

  it("inputs are enabled by default", () => {
    render(<RadioInput {...defaultProps} />);
    const radios = screen.getAllByRole("radio");
    radios.forEach((radio) => {
      expect(radio).not.toBeDisabled();
    });
  });

  it("uses the name prop for input name attribute", () => {
    render(<RadioInput {...defaultProps} name="my-group" />);
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    radios.forEach((radio) => {
      expect(radio.name).toBe("my-group");
    });
  });

  it("renders labelNode as visual content when provided, keeping label as aria-label", () => {
    const options: ReadonlyArray<{ value: Fruit; label: string; labelNode?: React.ReactNode }> = [
      { value: "apple", label: "Apple", labelNode: <span data-testid="custom-apple">🍎 Custom</span> },
      { value: "banana", label: "Banana" },
    ];
    render(<RadioInput {...defaultProps} options={options} />);
    expect(screen.getByTestId("custom-apple")).toBeInTheDocument();
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Apple" })).toBeInTheDocument();
  });
});
