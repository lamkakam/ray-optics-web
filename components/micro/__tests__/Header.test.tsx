import React from "react";
import { render, screen } from "@testing-library/react";
import { Header } from "@/components/micro/Header";
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

describe("Header", () => {
  it.each([1, 2, 3, 4, 5, 6] as const)("renders <h%i> tag for level=%i", (level) => {
    render(<Header level={level} variant="page">Heading</Header>);
    expect(screen.getByText("Heading").tagName).toBe(`H${level}`);
  });

  it("'page' variant applies font-semibold and textColor tokens", () => {
    render(<Header level={1} variant="page">Page Title</Header>);
    const el = screen.getByText("Page Title");
    expectClasses(el, cx.header.style.fontWeight, cx.header.color.textColor);
  });

  it("'section' variant applies mb-2 text-sm font-semibold and textColor tokens", () => {
    render(<Header level={3} variant="section">Section</Header>);
    const el = screen.getByText("Section");
    expectClasses(
      el,
      cx.header.size.sectionMargin,
      cx.header.size.sectionFontSize,
      cx.header.style.fontWeight,
      cx.header.color.textColor,
    );
  });

  it("'modal' variant applies text-lg font-semibold pb-3 mb-4 and textColor tokens", () => {
    render(<Header level={2} variant="modal">Modal Title</Header>);
    const el = screen.getByText("Modal Title");
    expectClasses(
      el,
      cx.header.size.modalFontSize,
      cx.header.style.fontWeight,
      cx.header.size.modalPadding,
      cx.header.size.modalMargin,
      cx.header.color.textColor,
    );
  });

  it("merges extra className prop", () => {
    render(<Header level={1} variant="page" className="extra-class another">test</Header>);
    const el = screen.getByText("test");
    expect(el).toHaveClass("extra-class");
    expect(el).toHaveClass("another");
  });

  it("renders children", () => {
    render(<Header level={2} variant="modal">Hello World</Header>);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});
