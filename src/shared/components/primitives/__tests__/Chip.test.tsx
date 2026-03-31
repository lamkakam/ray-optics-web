import React from "react";
import { render, screen } from "@testing-library/react";
import { Chip } from "@/shared/components/primitives/Chip";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

function splitClasses(str: string): string[] {
  return str.trim().split(/\s+/).filter(Boolean);
}
function expectClasses(element: HTMLElement, ...tokenStrings: string[]) {
  tokenStrings.forEach((token) => {
    splitClasses(token).forEach((cls) => expect(element).toHaveClass(cls));
  });
}

describe("Chip", () => {
  it("renders children", () => {
    render(<Chip>Hello</Chip>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders a span element", () => {
    render(<Chip>Hello</Chip>);
    expect(screen.getByText("Hello").tagName).toBe("SPAN");
  });

  it("applies all chip token classes", () => {
    render(<Chip>Hello</Chip>);
    const el = screen.getByText("Hello");
    expectClasses(
      el,
      cx.chip.style.borderRadius,
      cx.chip.style.borderStyle,
      cx.chip.color.borderColor,
      cx.chip.color.bgColor,
      cx.chip.color.textColor,
      cx.chip.size.horizontalPadding,
      cx.chip.size.verticalPadding,
      cx.chip.size.fontSize,
    );
  });

  it("accepts React.ReactNode children", () => {
    render(
      <Chip>
        <strong>Bold</strong>
      </Chip>,
    );
    expect(screen.getByText("Bold").tagName).toBe("STRONG");
  });
});
