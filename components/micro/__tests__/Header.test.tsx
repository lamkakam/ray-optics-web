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
    render(<Header level={level}>Heading</Header>);
    expect(screen.getByText("Heading").tagName).toBe(`H${level}`);
  });

  it.each([1, 2, 3, 4, 5, 6] as const)(
    "level=%i applies fontWeight and textColor tokens",
    (level) => {
      render(<Header level={level}>Heading {level}</Header>);
      const el = screen.getByText(`Heading ${level}`);
      expectClasses(el, cx.header.style.fontWeight, cx.header.color.textColor);
    },
  );

  it.each([
    [1, cx.header.size.h1FontSize],
    [2, cx.header.size.h2FontSize],
    [3, cx.header.size.h3FontSize],
    [4, cx.header.size.h4FontSize],
    [5, cx.header.size.h5FontSize],
    [6, cx.header.size.h6FontSize],
  ] as const)("level=%i applies %s fontSize", (level, fontSize) => {
    render(<Header level={level}>Size {level}</Header>);
    const el = screen.getByText(`Size ${level}`);
    expectClasses(el, fontSize);
  });

  it("merges extra className prop", () => {
    render(<Header level={1} className="extra-class another">test</Header>);
    const el = screen.getByText("test");
    expect(el).toHaveClass("extra-class");
    expect(el).toHaveClass("another");
  });

  it("renders children", () => {
    render(<Header level={2}>Hello World</Header>);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});
