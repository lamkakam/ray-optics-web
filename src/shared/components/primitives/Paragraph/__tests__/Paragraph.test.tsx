import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
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

describe("Paragraph", () => {
  it("renders a <p> element", () => {
    render(<Paragraph>content</Paragraph>);
    expect(screen.getByText("content").tagName).toBe("P");
  });

  it("default variant body applies bodyTextColor and text-sm", () => {
    render(<Paragraph>body text</Paragraph>);
    const el = screen.getByText("body text");
    expectClasses(el, cx.text.color.bodyTextColor, "text-sm");
  });

  it("variant caption applies captionMargin + captionTextColor + captionFontSize", () => {
    render(<Paragraph variant="caption">caption text</Paragraph>);
    const el = screen.getByText("caption text");
    expectClasses(
      el,
      cx.text.size.captionMargin,
      cx.text.color.captionTextColor,
      cx.text.size.captionFontSize,
    );
  });

  it("variant errorMessage applies errorTextColor + captionFontSize", () => {
    render(<Paragraph variant="errorMessage">error text</Paragraph>);
    const el = screen.getByText("error text");
    expectClasses(
      el,
      cx.text.color.errorTextColor,
      cx.text.size.captionFontSize,
    );
  });

  it("variant subheading applies label fontWeight + textColor + fontSize", () => {
    render(<Paragraph variant="subheading">subheading text</Paragraph>);
    const el = screen.getByText("subheading text");
    expectClasses(
      el,
      cx.label.style.fontWeight,
      cx.label.color.textColor,
      cx.label.size.fontSize,
    );
  });

  it("merges extra className", () => {
    render(<Paragraph className="mb-6 custom">text</Paragraph>);
    const el = screen.getByText("text");
    expect(el).toHaveClass("mb-6");
    expect(el).toHaveClass("custom");
  });

  it("ref forwarding gives an HTMLParagraphElement instance", () => {
    const ref = createRef<HTMLParagraphElement>();
    render(<Paragraph ref={ref}>text</Paragraph>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });

  it("renders children", () => {
    render(<Paragraph>Hello world</Paragraph>);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });
});
