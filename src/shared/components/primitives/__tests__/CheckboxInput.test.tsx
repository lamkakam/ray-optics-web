import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckboxInput } from "@/shared/components/primitives/CheckboxInput";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

function splitClasses(str: string): string[] {
  return str.trim().split(/\s+/).filter(Boolean);
}

function expectClasses(element: HTMLElement, ...tokenStrings: string[]) {
  tokenStrings.forEach((token) => {
    splitClasses(token).forEach((cls) => {
      expect(element).toHaveClass(cls);
    });
  });
}

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

  it("applies compact shared classes to the wrapper and input", () => {
    render(<CheckboxInput {...defaultProps} />);

    const checkbox = screen.getByRole("checkbox", { name: "Use model glass" });
    const wrapper = checkbox.closest("label");

    expect(wrapper).not.toBeNull();
    expectClasses(
      wrapper as HTMLElement,
      cx.checkbox.color.hoverBgColor,
      cx.checkbox.color.labelTextColor,
      cx.checkbox.size.gap,
      cx.checkbox.size.wrapperPaddingX,
      cx.checkbox.size.wrapperPaddingY,
      cx.checkbox.style.wrapperBorderRadius,
      cx.checkbox.style.transition,
      cx.checkbox.style.cursor,
    );
    expectClasses(
      checkbox,
      cx.checkbox.color.borderColor,
      cx.checkbox.color.checkedColor,
      cx.checkbox.color.focusRingColor,
      cx.checkbox.size.boxHeight,
      cx.checkbox.size.boxWidth,
      cx.checkbox.size.focusRingWidth,
      cx.checkbox.style.shrink,
      cx.checkbox.style.borderRadius,
    );
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

    expect(screen.getByRole("checkbox", { name: "Use model glass" })).toBeDisabled();
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
});
