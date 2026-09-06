import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckboxInput } from "@/shared/components/primitives/CheckboxInput";

describe("CheckboxInput", () => {
  const defaultProps = {
    id: "use-model-glass",
    label: "Use model glass",
    checked: false,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exposes the checkbox through its visible label", () => {
    render(<CheckboxInput {...defaultProps} />);

    expect(
      screen.getByRole("checkbox", { name: "Use model glass" })
    ).toBeInTheDocument();
  });

  it("calls onChange with the next checked state", async () => {
    const onChange = jest.fn();
    render(<CheckboxInput {...defaultProps} onChange={onChange} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Use model glass" }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("wraps string labels in the component-owned span", () => {
    render(<CheckboxInput {...defaultProps} />);

    expect(screen.getByText("Use model glass").tagName).toBe("SPAN");
  });

  it("renders JSX labels without the component-owned span wrapper", () => {
    render(
      <CheckboxInput
        {...defaultProps}
        ariaLabel="Schott"
        label={(
          <div data-testid="catalog-label">
            <span data-testid="catalog-dot" />
            <span>Schott</span>
          </div>
        )}
      />
    );

    expect(screen.getByTestId("catalog-dot")).toBeInTheDocument();
    expect(screen.getByTestId("catalog-label").parentElement?.tagName).toBe("LABEL");
    expect(screen.getByRole("checkbox", { name: "Schott" })).toBeInTheDocument();
  });

  it("supports disabled state", () => {
    render(<CheckboxInput {...defaultProps} disabled />);

    const checkbox = screen.getByRole("checkbox", { name: "Use model glass" });
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveClass("cursor-not-allowed");
  });

  it("supports ariaLabel override", () => {
    render(
      <CheckboxInput
        {...defaultProps}
        ariaLabel="Use model glass for numeric entry"
      />
    );

    expect(
      screen.getByRole("checkbox", {
        name: "Use model glass for numeric entry",
      })
    ).toBeInTheDocument();
  });

  it("keeps the native indeterminate property synchronized", () => {
    const { rerender } = render(<CheckboxInput {...defaultProps} indeterminate />);
    const checkbox = screen.getByRole("checkbox", { name: "Use model glass" });

    expect((checkbox as HTMLInputElement).indeterminate).toBe(true);

    rerender(<CheckboxInput {...defaultProps} indeterminate={false} />);
    expect((checkbox as HTMLInputElement).indeterminate).toBe(false);
  });

  it("defaults the native indeterminate property to false", () => {
    render(<CheckboxInput {...defaultProps} />);

    expect((screen.getByRole("checkbox", { name: "Use model glass" }) as HTMLInputElement).indeterminate)
      .toBe(false);
  });

});
