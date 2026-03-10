import React, { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Label } from "@/components/micro/Label";
import { componentTokens as cx } from "@/components/ui/modalTokens";

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

describe("Label", () => {
  it("renders a <label> element", () => {
    render(<Label>My label</Label>);
    expect(screen.getByText("My label").tagName).toBe("LABEL");
  });

  it("applies all token classes", () => {
    render(<Label>test</Label>);
    const el = screen.getByText("test");
    expectClasses(
      el,
      "block",
      cx.label.style.fontWeight,
      cx.label.size.margin,
      cx.label.color.textColor,
      cx.label.size.fontSize,
    );
  });

  it("renders children as text content", () => {
    render(<Label>Hello world</Label>);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("forwards htmlFor attribute", () => {
    render(<Label htmlFor="my-input">My label</Label>);
    expect(screen.getByText("My label")).toHaveAttribute("for", "my-input");
  });

  it("merges extra className", () => {
    render(<Label className="extra-class another">test</Label>);
    const el = screen.getByText("test");
    expect(el).toHaveClass("extra-class");
    expect(el).toHaveClass("another");
  });

  it("ref forwarding gives an HTMLLabelElement instance", () => {
    const ref = createRef<HTMLLabelElement>();
    render(<Label ref={ref}>test</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });
});
