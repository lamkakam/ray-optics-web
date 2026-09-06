import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

describe("Paragraph", () => {
  it("renders a <p> element", () => {
    render(<Paragraph>content</Paragraph>);
    expect(screen.getByText("content").tagName).toBe("P");
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
