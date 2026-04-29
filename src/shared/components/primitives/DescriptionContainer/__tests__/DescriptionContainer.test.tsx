import { render, screen } from "@testing-library/react";
import { DescriptionContainer } from "@/shared/components/primitives/DescriptionContainer";

describe("DescriptionContainer", () => {
  it("renders a styled description panel from shared tokens", () => {
    render(
      <DescriptionContainer>
        <p>Description</p>
      </DescriptionContainer>,
    );

    const panel = screen.getByTestId("description-container");
    expect(panel).toHaveClass("border-gray-200");
    expect(panel).toHaveClass("dark:border-gray-700");
    expect(panel).toHaveClass("bg-gray-100");
    expect(panel).toHaveClass("dark:bg-gray-800");
    expect(panel).toHaveClass("text-gray-700");
    expect(panel).toHaveClass("dark:text-gray-300");
  });
});
