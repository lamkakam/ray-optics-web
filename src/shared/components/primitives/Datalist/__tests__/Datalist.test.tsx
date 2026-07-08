import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Datalist } from "@/shared/components/primitives/Datalist";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

const OPTIONS = [
  { value: "N-BK7", label: "N-BK7" },
  { value: "N-SF6", label: "N-SF6" },
];

function expectTokenClasses(element: HTMLElement, token: string): void {
  token.split(/\s+/).filter(Boolean).forEach((className) => {
    expect(element).toHaveClass(className);
  });
}

describe("Datalist", () => {
  const responsiveSelectFontSize = "text-base min-[1440px]:text-sm";

  it("associates its text input with a generated datalist and renders options", () => {
    const { container } = render(
      <Datalist aria-label="Glass" options={OPTIONS} value="" onChange={() => undefined} />,
    );
    const input = screen.getByLabelText("Glass");
    const listId = input.getAttribute("list");

    expect(listId).toBeTruthy();
    expect(container.querySelector(`datalist#${listId}`)).toBeInTheDocument();
    expect(container.querySelectorAll("datalist option")).toHaveLength(2);
    expect(container.querySelector('option[value="N-BK7"]')).toHaveTextContent("N-BK7");
  });

  it("forwards input attributes, events, and ref", async () => {
    const onChange = jest.fn();
    const ref = createRef<HTMLInputElement>();
    render(
      <Datalist
        ref={ref}
        id="glass-input"
        aria-label="Glass"
        placeholder="Search glass"
        options={OPTIONS}
        value=""
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText("Glass");
    await userEvent.type(input, "N-BK7");
    expect(input).toHaveAttribute("id", "glass-input");
    expect(input).toHaveAttribute("placeholder", "Search glass");
    expect(onChange).toHaveBeenCalled();
    expect(ref.current).toBe(input);
  });

  it("forwards disabled state", () => {
    render(<Datalist aria-label="Glass" options={OPTIONS} value="" onChange={() => undefined} disabled />);
    expect(screen.getByLabelText("Glass")).toBeDisabled();
  });

  it("generates unique datalist IDs for multiple instances", () => {
    render(
      <>
        <Datalist aria-label="First glass" options={OPTIONS} value="" onChange={() => undefined} />
        <Datalist aria-label="Second glass" options={OPTIONS} value="" onChange={() => undefined} />
      </>,
    );
    expect(screen.getByLabelText("First glass").getAttribute("list"))
      .not.toBe(screen.getByLabelText("Second glass").getAttribute("list"));
  });

  it("uses Select-equivalent default styling and wrapper sizing", () => {
    render(
      <Datalist
        aria-label="Glass"
        className="max-w-xs"
        options={OPTIONS}
        value=""
        onChange={() => undefined}
      />,
    );
    const input = screen.getByLabelText("Glass");
    [
      cx.select.style.borderRadius,
      cx.select.style.borderStyle,
      cx.select.style.outlineStyle,
      cx.select.style.transitionStyle,
      cx.select.style.appearanceReset,
      cx.select.size.defaultWidth,
      cx.select.size.horizontalPadding,
      cx.select.size.verticalPadding,
      responsiveSelectFontSize,
      cx.select.color.focusRingColor,
      cx.select.color.borderColor,
      cx.select.color.bgColor,
      cx.select.color.textColor,
    ].forEach((token) => expectTokenClasses(input, token));
    cx.select.size.customArrowPadding.split(/\s+/).filter(Boolean).forEach((className) => {
      expect(input).not.toHaveClass(className);
    });
    expect(input.parentElement).toHaveClass("w-full", "max-w-xs");
    expect(input.parentElement).not.toHaveClass("relative");
    expect(input.parentElement?.querySelector("svg")).not.toBeInTheDocument();
  });
});
