import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Label } from "@/shared/components/primitives/Label";

describe("Label", () => {
  it("renders a <label> element", () => {
    render(<Label>My label</Label>);
    expect(screen.getByText("My label").tagName).toBe("LABEL");
  });

  it("renders children as text content", () => {
    render(<Label>Hello world</Label>);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("forwards htmlFor attribute", () => {
    render(<Label htmlFor="my-input">My label</Label>);
    expect(screen.getByText("My label")).toHaveAttribute("for", "my-input");
  });

  it("ref forwarding gives an HTMLLabelElement instance", () => {
    const ref = createRef<HTMLLabelElement>();
    render(<Label ref={ref}>test</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });
});
