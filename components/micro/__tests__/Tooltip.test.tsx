import React from "react";
import { render, screen } from "@testing-library/react";
import { Tooltip } from "../Tooltip";

describe("Tooltip", () => {
  it("renders children", () => {
    render(
      <Tooltip text="Help text">
        <button>Click me</button>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("renders tooltip text in the DOM", () => {
    render(
      <Tooltip text="Help text">
        <span>child</span>
      </Tooltip>,
    );
    expect(screen.getByRole("tooltip")).toHaveTextContent("Help text");
  });

  it("tooltip element has opacity-0 (visually hidden by default)", () => {
    render(
      <Tooltip text="Help text">
        <span>child</span>
      </Tooltip>,
    );
    expect(screen.getByRole("tooltip")).toHaveClass("opacity-0");
  });

  it("defaults to top position (has bottom-full class)", () => {
    render(
      <Tooltip text="Help text">
        <span>child</span>
      </Tooltip>,
    );
    expect(screen.getByRole("tooltip")).toHaveClass("bottom-full");
  });

  it("supports bottom position (has top-full class)", () => {
    render(
      <Tooltip text="Help text" position="bottom">
        <span>child</span>
      </Tooltip>,
    );
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveClass("top-full");
    expect(tip).not.toHaveClass("bottom-full");
  });
});
