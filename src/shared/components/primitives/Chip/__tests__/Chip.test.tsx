import { render, screen } from "@testing-library/react";
import { Chip } from "@/shared/components/primitives/Chip";

describe("Chip", () => {
  it("renders children", () => {
    render(<Chip>Hello</Chip>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders a span element", () => {
    render(<Chip>Hello</Chip>);
    expect(screen.getByText("Hello").tagName).toBe("SPAN");
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
