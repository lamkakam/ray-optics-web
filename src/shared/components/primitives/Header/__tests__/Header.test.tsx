import { render, screen } from "@testing-library/react";
import { Header } from "@/shared/components/primitives/Header";

describe("Header", () => {
  it.each([1, 2, 3, 4, 5, 6] as const)("renders <h%i> tag for level=%i", (level) => {
    render(<Header level={level}>Heading</Header>);
    expect(screen.getByText("Heading").tagName).toBe(`H${level}`);
  });

  it("renders children", () => {
    render(<Header level={2}>Hello World</Header>);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});
