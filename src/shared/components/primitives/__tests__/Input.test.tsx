import React, { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/shared/components/primitives/Input";
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

describe("Input", () => {
  it("renders an <input> element", () => {
    render(<Input aria-label="test-input" />);
    expect(screen.getByRole("textbox", { name: "test-input" })).toBeInTheDocument();
  });

  it("applies all token classes", () => {
    render(<Input aria-label="test" />);
    const el = screen.getByRole("textbox");
    expectClasses(
      el,
      cx.input.style.borderRadius,
      cx.input.style.borderStyle,
      cx.input.style.outlineStyle,
      cx.input.style.transitionStyle,
      cx.input.style.opacity,
      cx.input.style.cursor,
      cx.input.size.defaultWidth,
      cx.input.size.focusRingWidth,
      cx.input.color.focusRingColor,
      cx.input.color.borderColor,
      cx.input.color.bgColor,
      cx.input.color.textColor,
      cx.input.size.horizontalPadding,
      cx.input.size.verticalPadding,
      cx.input.size.fontSize,
    );
  });

  it("forwards value", () => {
    render(<Input aria-label="test" value="hello" onChange={() => undefined} />);
    expect(screen.getByRole("textbox")).toHaveValue("hello");
  });

  it("forwards onChange", async () => {
    const onChange = jest.fn();
    render(<Input aria-label="test" defaultValue="" onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox"), "x");
    expect(onChange).toHaveBeenCalled();
  });

  it("forwards id", () => {
    render(<Input aria-label="test" id="my-input" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "my-input");
  });

  it("forwards aria-label", () => {
    render(<Input aria-label="my label" />);
    expect(screen.getByRole("textbox", { name: "my label" })).toBeInTheDocument();
  });

  it("forwards disabled", () => {
    render(<Input aria-label="test" disabled />);
    const el = screen.getByRole("textbox");
    expect(el).toBeDisabled();
    expectClasses(el, cx.input.style.opacity, cx.input.style.cursor);
  });

  it("forwards placeholder", () => {
    render(<Input aria-label="test" placeholder="Enter value" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Enter value");
  });

  it("forwards type", () => {
    render(<Input aria-label="test" type="email" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it("merges extra className", () => {
    render(<Input aria-label="test" className="w-24 mb-2" />);
    const el = screen.getByRole("textbox");
    expect(el).toHaveClass("w-24");
    expect(el).toHaveClass("mb-2");
  });

  it("ref forwarding gives an HTMLInputElement instance", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input aria-label="test" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("forwards onBlur", async () => {
    const onBlur = jest.fn();
    render(<Input aria-label="test" onBlur={onBlur} />);
    const el = screen.getByRole("textbox");
    await userEvent.click(el);
    await userEvent.tab();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("applies default padding classes when variant is default", () => {
    render(<Input aria-label="test" variant="default" />);
    const el = screen.getByRole("textbox");
    expectClasses(
      el,
      cx.input.size.horizontalPadding,
      cx.input.size.verticalPadding,
      cx.input.size.fontSize,
    );
  });

  it("applies compact padding classes when variant is compact", () => {
    render(<Input aria-label="test" variant="compact" />);
    const el = screen.getByRole("textbox");
    expectClasses(
      el,
      cx.input.size.compactHorizontalPadding,
      cx.input.size.compactVerticalPadding,
      cx.input.size.compactFontSize,
    );
  });
});
