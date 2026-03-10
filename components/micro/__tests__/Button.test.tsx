import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/micro/Button";
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

describe("Button", () => {
  it("renders children", () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("defaults type to button", () => {
    render(<Button variant="primary">OK</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("forwards type override", () => {
    render(<Button variant="primary" type="submit">Submit</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("variant primary applies correct token classes", () => {
    render(<Button variant="primary">P</Button>);
    const btn = screen.getByRole("button");
    expectClasses(btn,
      cx.button.style.borderRadius,
      cx.button.style.fontWeight,
      "transition",
      cx.button.style.cursor,
      cx.button.color.primaryBgColor,
      cx.button.color.primaryTextColor,
      cx.button.size.md,
      cx.button.style.opacity,
    );
  });

  it("variant secondary applies correct token classes and border", () => {
    render(<Button variant="secondary">S</Button>);
    const btn = screen.getByRole("button");
    expectClasses(btn,
      cx.button.style.borderRadius,
      cx.button.style.fontWeight,
      "transition",
      cx.button.style.cursor,
      cx.button.color.secondaryBorderColor,
      cx.button.color.secondaryBgColor,
      cx.button.color.secondaryTextColor,
      cx.button.color.secondaryHoverBgColor,
      cx.button.size.md,
      cx.button.style.opacity,
    );
    expect(btn).toHaveClass("border");
  });

  it("variant toggle applies correct token classes and border", () => {
    render(<Button variant="toggle">T</Button>);
    const btn = screen.getByRole("button");
    expectClasses(btn,
      cx.button.style.borderRadius,
      cx.button.style.fontWeight,
      "transition",
      cx.button.style.cursor,
      cx.button.color.toggleBorderColor,
      cx.button.color.toggleBgColor,
      cx.button.color.toggleTextColor,
      cx.button.color.toggleHoverBgColor,
      cx.button.size.md,
      cx.button.style.opacity,
    );
    expect(btn).toHaveClass("border");
  });

  it("variant danger applies correct token classes", () => {
    render(<Button variant="danger">D</Button>);
    const btn = screen.getByRole("button");
    expectClasses(btn,
      cx.button.style.borderRadius,
      cx.button.style.fontWeight,
      "transition",
      cx.button.style.cursor,
      cx.button.color.dangerBgColor,
      cx.button.color.dangerTextColor,
      cx.button.size.md,
      cx.button.style.opacity,
    );
  });

  it("variant floating applies correct token classes", () => {
    render(<Button variant="floating">↻</Button>);
    const btn = screen.getByRole("button");
    expectClasses(btn,
      cx.button.style.floating,
      cx.button.style.floatingHorizontalMargin,
      cx.button.style.floatingVerticalMargin,
      cx.button.style.cursor,
      cx.button.color.floatingBorderColor,
      cx.button.color.floatingBgColor,
      cx.button.color.floatingTextColor,
      cx.button.color.floatingHoverBgColor,
      cx.button.size.xs,
      cx.button.style.opacity,
    );
    expect(btn).toHaveClass("absolute");
  });

  it("variant primary size icon applies icon style and icon size", () => {
    render(<Button variant="primary" size="icon">+</Button>);
    const btn = screen.getByRole("button");
    expectClasses(btn,
      "inline-flex",
      "items-center",
      "justify-center",
      cx.button.style.iconBorderRadius,
      cx.button.style.iconFontWeight,
      cx.button.style.iconHorizontalMargin,
      cx.button.style.iconVerticalMargin,
      cx.button.style.cursor,
      cx.button.color.primaryBgColor,
      cx.button.color.primaryTextColor,
      cx.button.size.icon,
      cx.button.style.opacity,
    );
  });

  it("variant danger size icon applies icon style and icon size", () => {
    render(<Button variant="danger" size="icon">−</Button>);
    const btn = screen.getByRole("button");
    expectClasses(btn,
      "inline-flex",
      "items-center",
      "justify-center",
      cx.button.style.iconBorderRadius,
      cx.button.style.iconFontWeight,
      cx.button.style.iconHorizontalMargin,
      cx.button.style.iconVerticalMargin,
      cx.button.style.cursor,
      cx.button.color.dangerBgColor,
      cx.button.color.dangerTextColor,
      cx.button.size.icon,
      cx.button.style.opacity,
    );
  });

  it("size icon uses iconBorderRadius/iconFontWeight not borderRadius/fontWeight", () => {
    render(<Button variant="primary" size="icon">+</Button>);
    const btn = screen.getByRole("button");
    splitClasses(cx.button.style.borderRadius).forEach((cls) => {
      expect(btn).not.toHaveClass(cls);
    });
    splitClasses(cx.button.style.fontWeight).forEach((cls) => {
      expect(btn).not.toHaveClass(cls);
    });
    expectClasses(btn, cx.button.style.iconBorderRadius, cx.button.style.iconFontWeight);
  });

  it("floating variant always uses xs size regardless of size prop", () => {
    render(<Button variant="floating" size="md">↻</Button>);
    const btn = screen.getByRole("button");
    expectClasses(btn, cx.button.size.xs);
    splitClasses(cx.button.size.md).forEach((cls) => {
      expect(btn).not.toHaveClass(cls);
    });
  });

  it("merges extra className", () => {
    render(<Button variant="primary" className="w-full text-left">X</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("w-full");
    expect(btn).toHaveClass("text-left");
  });

  it("forwards onClick", async () => {
    const onClick = jest.fn();
    render(<Button variant="primary" onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards aria-label", () => {
    render(<Button variant="primary" aria-label="my-action">Go</Button>);
    expect(screen.getByRole("button", { name: "my-action" })).toBeInTheDocument();
  });

  it("forwards title", () => {
    render(<Button variant="primary" title="My Title">Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("title", "My Title");
  });

  it("forwards disabled", () => {
    render(<Button variant="primary" disabled>Go</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies disabled style classes", () => {
    render(<Button variant="primary" disabled>Go</Button>);
    const btn = screen.getByRole("button");
    expectClasses(btn, cx.button.style.opacity, cx.button.style.cursor);
  });
});
