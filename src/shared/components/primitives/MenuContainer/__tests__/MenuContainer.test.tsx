import { render, screen } from "@testing-library/react";
import { MenuContainer } from "@/shared/components/primitives/MenuContainer";

describe("MenuContainer", () => {
  it("renders a semantic menu with fixed-height scrolling styles", () => {
    render(
      <MenuContainer aria-label="Example systems">
        <li>Example item</li>
      </MenuContainer>,
    );

    const menu = screen.getByRole("list", { name: "Example systems" });
    expect(menu.tagName).toBe("MENU");
    expect(menu).toHaveClass("max-h-[min(32rem,calc(100dvh-12rem))]");
    expect(menu).toHaveClass("overflow-y-auto");
  });

  it("uses shared surface, border, and text tokens", () => {
    render(<MenuContainer aria-label="Examples" />);

    const menu = screen.getByRole("list", { name: "Examples" });
    expect(menu).toHaveClass("border-gray-200");
    expect(menu).toHaveClass("dark:border-gray-700");
    expect(menu).toHaveClass("bg-gray-100");
    expect(menu).toHaveClass("dark:bg-gray-800");
    expect(menu).toHaveClass("text-gray-700");
    expect(menu).toHaveClass("dark:text-gray-300");
  });
});
