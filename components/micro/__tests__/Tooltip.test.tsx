import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("top-start position: has bottom-full, left-1/2, and -translate-x-1/4", () => {
    render(
      <Tooltip text="Help text" position="top-start">
        <span>child</span>
      </Tooltip>,
    );
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveClass("bottom-full");
    expect(tip).toHaveClass("left-1/2");
    expect(tip).toHaveClass("-translate-x-1/4");
    expect(tip).not.toHaveClass("-translate-x-1/2");
  });

  it("start position: has left-1/2 and -translate-x-1/4 but no bottom-full or top-full", () => {
    render(
      <Tooltip text="Help text" position="start">
        <span>child</span>
      </Tooltip>,
    );
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveClass("left-1/2");
    expect(tip).toHaveClass("-translate-x-1/4");
    expect(tip).not.toHaveClass("bottom-full");
    expect(tip).not.toHaveClass("top-full");
    expect(tip).not.toHaveClass("-translate-x-1/2");
  });

  it("no-transform position: has no position or transform classes", () => {
    render(
      <Tooltip text="Help text" position="no-transform">
        <span>child</span>
      </Tooltip>,
    );
    const tip = screen.getByRole("tooltip");
    expect(tip).not.toHaveClass("bottom-full");
    expect(tip).not.toHaveClass("top-full");
    expect(tip).not.toHaveClass("left-1/2");
    expect(tip).not.toHaveClass("-translate-x-1/2");
  });

  describe("noTouch prop", () => {
    it("when noTouch is set, wrapper span has touch-action: none style", () => {
      const { container } = render(
        <Tooltip text="Help text" noTouch>
          <button>Click me</button>
        </Tooltip>,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.touchAction).toBe("none");
    });

    it("when noTouch is not set, wrapper span does not have touch-action: none style", () => {
      const { container } = render(
        <Tooltip text="Help text">
          <button>Click me</button>
        </Tooltip>,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.touchAction).not.toBe("none");
    });
  });

  describe("portal mode", () => {
    it("renders tooltip text in the document when portal is true", () => {
      render(
        <Tooltip text="Portal tip" portal>
          <button>Trigger</button>
        </Tooltip>,
      );
      expect(screen.getByRole("tooltip")).toHaveTextContent("Portal tip");
    });

    it("portal tooltip has opacity-0 when not hovered", () => {
      render(
        <Tooltip text="Portal tip" portal>
          <button>Trigger</button>
        </Tooltip>,
      );
      expect(screen.getByRole("tooltip")).toHaveClass("opacity-0");
    });

    it("portal tooltip becomes opacity-100 on mouse enter", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip text="Portal tip" portal>
          <button>Trigger</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button", { name: "Trigger" }));
      expect(screen.getByRole("tooltip")).toHaveClass("opacity-100");
    });

    it("portal tooltip returns to opacity-0 on mouse leave", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip text="Portal tip" portal>
          <button>Trigger</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button", { name: "Trigger" }));
      await user.unhover(screen.getByRole("button", { name: "Trigger" }));
      expect(screen.getByRole("tooltip")).toHaveClass("opacity-0");
    });

    it("portal top-start: transform is translate(-25%, -100%)", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip text="Portal tip" position="top-start" portal>
          <button>Trigger</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button", { name: "Trigger" }));
      expect(screen.getByRole("tooltip")).toHaveStyle({ transform: "translate(-25%, -100%)" });
    });

    it("portal start: transform is translateX(-25%)", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip text="Portal tip" position="start" portal>
          <button>Trigger</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button", { name: "Trigger" }));
      expect(screen.getByRole("tooltip")).toHaveStyle({ transform: "translateX(-25%)" });
    });

    it("portal no-transform: no transform style", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip text="Portal tip" position="no-transform" portal>
          <button>Trigger</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button", { name: "Trigger" }));
      expect(screen.getByRole("tooltip")).not.toHaveStyle({ transform: "translate(-50%, -100%)" });
      expect(screen.getByRole("tooltip")).not.toHaveStyle({ transform: "translateX(-50%)" });
    });

    describe("portal mode with noTouch", () => {
      it("does not show tooltip when touchstart precedes mouseenter", () => {
        render(
          <Tooltip text="Portal tip" portal noTouch>
            <button>Trigger</button>
          </Tooltip>,
        );
        const wrapper = screen.getByRole("button").parentElement!;
        fireEvent.touchStart(wrapper);
        fireEvent.mouseEnter(wrapper);
        expect(screen.getByRole("tooltip")).toHaveClass("opacity-0");
      });

      it("still shows tooltip on plain mouse hover after a prior touch interaction", () => {
        render(
          <Tooltip text="Portal tip" portal noTouch>
            <button>Trigger</button>
          </Tooltip>,
        );
        const wrapper = screen.getByRole("button").parentElement!;
        // Simulate touch sequence (should be suppressed)
        fireEvent.touchStart(wrapper);
        fireEvent.mouseEnter(wrapper);
        fireEvent.mouseLeave(wrapper);
        // Simulate plain mouse hover
        fireEvent.mouseEnter(wrapper);
        expect(screen.getByRole("tooltip")).toHaveClass("opacity-100");
      });
    });
  });
});
