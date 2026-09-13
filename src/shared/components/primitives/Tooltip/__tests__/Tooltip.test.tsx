import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "../Tooltip";

function createRect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  };
}

describe("Tooltip", () => {
  it("renders children", () => {
    render(
      <Tooltip text="Help text">
        <button>Click me</button>
      </Tooltip>,
    );
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
    expect(button.parentElement).toHaveClass(
      "group",
      "relative",
      "inline-flex",
    );
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
    expect(screen.getByRole("tooltip")).toHaveClass(
      "absolute",
      "whitespace-nowrap",
      "opacity-0",
    );
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
    expect(tip).not.toHaveClass("Stryker");
  });

  describe("viewport-aware positioning", () => {
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalInnerWidth,
      });
    });

    it("shifts a tooltip right when it would cross the left viewport gutter", () => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 320,
      });
      render(
        <Tooltip text="Compute and update the optical system" position="bottom">
          <button>Update</button>
        </Tooltip>,
      );

      const wrapper = screen.getByRole("button", { name: "Update" })
        .parentElement!;
      const tooltip = screen.getByRole("tooltip");
      jest
        .spyOn(wrapper, "getBoundingClientRect")
        .mockReturnValue(createRect(0, 80, 32, 32));
      jest
        .spyOn(tooltip, "getBoundingClientRect")
        .mockReturnValue(createRect(-80, 116, 240, 24));

      fireEvent.mouseEnter(wrapper);

      expect(tooltip).toHaveStyle({ marginLeft: "88px" });
    });

    it("uses the wide-content path when content is wider than the available viewport", () => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 320,
      });
      render(
        <Tooltip text="A wide tooltip" position="bottom">
          <button>Update</button>
        </Tooltip>,
      );

      const wrapper = screen.getByRole("button", { name: "Update" })
        .parentElement!;
      const tooltip = screen.getByRole("tooltip");
      jest
        .spyOn(wrapper, "getBoundingClientRect")
        .mockReturnValue(createRect(0, 80, 32, 32));
      jest
        .spyOn(tooltip, "getBoundingClientRect")
        .mockReturnValue(createRect(-80, 116, 320, 24));

      fireEvent.mouseEnter(wrapper);

      expect(tooltip).toHaveStyle({ marginLeft: "88px" });
    });

    it("shifts a tooltip left when it would cross the right viewport gutter", () => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 320,
      });
      render(
        <Tooltip text="Compute and update the optical system" position="bottom">
          <button>Update</button>
        </Tooltip>,
      );

      const wrapper = screen.getByRole("button", { name: "Update" })
        .parentElement!;
      const tooltip = screen.getByRole("tooltip");
      jest
        .spyOn(wrapper, "getBoundingClientRect")
        .mockReturnValue(createRect(288, 80, 32, 32));
      jest
        .spyOn(tooltip, "getBoundingClientRect")
        .mockReturnValue(createRect(220, 116, 160, 24));

      fireEvent.mouseEnter(wrapper);

      expect(tooltip).toHaveStyle({ marginLeft: "-68px" });
    });

    it("distinguishes a narrow viewport from wide content near the right edge", () => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 320,
      });
      render(
        <Tooltip text="A wide tooltip" position="bottom">
          <button>Update</button>
        </Tooltip>,
      );

      const wrapper = screen.getByRole("button", { name: "Update" })
        .parentElement!;
      const tooltip = screen.getByRole("tooltip");
      jest
        .spyOn(wrapper, "getBoundingClientRect")
        .mockReturnValue(createRect(288, 80, 32, 32));
      jest
        .spyOn(tooltip, "getBoundingClientRect")
        .mockReturnValue(createRect(220, 116, 200, 24));

      fireEvent.mouseEnter(wrapper);

      expect(tooltip).toHaveStyle({ marginLeft: "-108px" });
    });

    it("uses both viewport gutters when a tooltip is just wider than the safe area", () => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 320,
      });
      render(
        <Tooltip text="A wide tooltip" position="bottom">
          <button>Update</button>
        </Tooltip>,
      );

      const wrapper = screen.getByRole("button", { name: "Update" })
        .parentElement!;
      const tooltip = screen.getByRole("tooltip");
      jest
        .spyOn(wrapper, "getBoundingClientRect")
        .mockReturnValue(createRect(100, 80, 32, 32));
      jest
        .spyOn(tooltip, "getBoundingClientRect")
        .mockReturnValue(createRect(100, 116, 308, 24));

      fireEvent.mouseEnter(wrapper);

      expect(tooltip).toHaveStyle({ marginLeft: "-92px" });
    });

    it("remeasures while hovered and resets the horizontal correction on leave", () => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 320,
      });
      render(
        <Tooltip text="Compute and update the optical system" position="bottom">
          <button>Update</button>
        </Tooltip>,
      );

      const wrapper = screen.getByRole("button", { name: "Update" })
        .parentElement!;
      const tooltip = screen.getByRole("tooltip");
      jest
        .spyOn(wrapper, "getBoundingClientRect")
        .mockReturnValue(createRect(0, 80, 32, 32));
      const tooltipRect = jest.spyOn(tooltip, "getBoundingClientRect");
      tooltipRect.mockReturnValue(createRect(-80, 116, 240, 24));

      fireEvent.mouseEnter(wrapper);
      expect(tooltip).toHaveStyle({ marginLeft: "88px" });

      tooltipRect.mockReturnValue(createRect(308, 116, 160, 24));
      fireEvent.resize(window);
      expect(tooltip).toHaveStyle({ marginLeft: "-68px" });

      tooltipRect.mockReturnValue(createRect(-148, 116, 240, 24));
      fireEvent.scroll(window);
      expect(tooltip).toHaveStyle({ marginLeft: "88px" });

      fireEvent.mouseLeave(wrapper);
      expect(tooltip).toHaveStyle({ marginLeft: "0px" });
    });

    it("constrains and wraps content to the viewport width", () => {
      render(
        <Tooltip text="A long tooltip message">
          <button>Update</button>
        </Tooltip>,
      );

      expect(screen.getByRole("tooltip")).toHaveStyle({
        maxWidth: "calc(100vw - 16px)",
        whiteSpace: "normal",
        overflowWrap: "break-word",
      });
    });

    it("registers and removes resize and captured scroll listeners while hovered", () => {
      const addEventListener = jest.spyOn(window, "addEventListener");
      const removeEventListener = jest.spyOn(window, "removeEventListener");
      const { unmount } = render(
        <Tooltip text="Help text">
          <button>Update</button>
        </Tooltip>,
      );
      const wrapper = screen.getByRole("button", { name: "Update" })
        .parentElement!;

      fireEvent.mouseEnter(wrapper);

      expect(addEventListener).toHaveBeenCalledWith(
        "resize",
        expect.any(Function),
      );
      expect(addEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
        true,
      );
      unmount();
      expect(removeEventListener).toHaveBeenCalledWith(
        "resize",
        expect.any(Function),
      );
      expect(removeEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
        true,
      );

      addEventListener.mockRestore();
      removeEventListener.mockRestore();
    });

    it("stops remeasurement after the pointer leaves", () => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: 320,
      });
      render(
        <Tooltip text="Compute and update the optical system" position="bottom">
          <button>Update</button>
        </Tooltip>,
      );

      const wrapper = screen.getByRole("button", { name: "Update" })
        .parentElement!;
      const tooltip = screen.getByRole("tooltip");
      jest
        .spyOn(wrapper, "getBoundingClientRect")
        .mockReturnValue(createRect(0, 80, 32, 32));
      jest
        .spyOn(tooltip, "getBoundingClientRect")
        .mockReturnValue(createRect(-80, 116, 240, 24));

      fireEvent.mouseEnter(wrapper);
      fireEvent.mouseLeave(wrapper);
      jest
        .spyOn(tooltip, "getBoundingClientRect")
        .mockReturnValue(createRect(220, 116, 160, 24));
      fireEvent.resize(window);

      expect(tooltip).toHaveStyle({ marginLeft: "0px" });
    });
  });

  describe("noTouch prop", () => {
    it("when noTouch is set, wrapper span does not have touch-action: none style", () => {
      const { container } = render(
        <Tooltip text="Help text" noTouch>
          <button>Click me</button>
        </Tooltip>,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.touchAction).not.toBe("none");
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
    it("uses fixed non-interactive portal positioning", () => {
      render(
        <Tooltip text="Portal tip" portal>
          <button>Trigger</button>
        </Tooltip>,
      );

      const wrapper = screen.getByRole("button", { name: "Trigger" })
        .parentElement!;
      const tooltip = screen.getByRole("tooltip");
      expect(wrapper).toHaveClass("relative", "inline-flex");
      expect(tooltip).toHaveClass("pointer-events-none", "fixed", "z-[9999]");
    });

    it.each([
      ["top", 196],
      ["top-start", 196],
      ["start", 200],
      ["no-transform", 200],
      ["bottom", 234],
    ] as const)(
      "places the portal at the trigger coordinates for %s",
      (position, top) => {
        render(
          <Tooltip text="Portal tip" position={position} portal>
            <button>Trigger</button>
          </Tooltip>,
        );
        const wrapper = screen.getByRole("button", { name: "Trigger" })
          .parentElement!;
        jest
          .spyOn(wrapper, "getBoundingClientRect")
          .mockReturnValue(createRect(100, 200, 40, 30));

        fireEvent.mouseEnter(wrapper);

        expect(screen.getByRole("tooltip")).toHaveStyle({
          left: "120px",
          top: `${top}px`,
        });
      },
    );

    it("uses the position-specific top and bottom transforms", () => {
      const { unmount } = render(
        <Tooltip text="Portal tip" position="top" portal>
          <button>Top</button>
        </Tooltip>,
      );
      fireEvent.mouseEnter(
        screen.getByRole("button", { name: "Top" }).parentElement!,
      );
      expect(screen.getByRole("tooltip")).toHaveStyle({
        transform: "translate(-50%, -100%)",
      });
      unmount();

      render(
        <Tooltip text="Portal tip" position="bottom" portal>
          <button>Bottom</button>
        </Tooltip>,
      );
      fireEvent.mouseEnter(
        screen.getByRole("button", { name: "Bottom" }).parentElement!,
      );
      expect(screen.getByRole("tooltip")).toHaveStyle({
        transform: "translateX(-50%)",
      });
    });

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
      expect(screen.getByRole("tooltip")).toHaveStyle({
        transform: "translate(-25%, -100%)",
      });
    });

    it("portal start: transform is translateX(-25%)", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip text="Portal tip" position="start" portal>
          <button>Trigger</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button", { name: "Trigger" }));
      expect(screen.getByRole("tooltip")).toHaveStyle({
        transform: "translateX(-25%)",
      });
    });

    it("portal no-transform: no transform style", async () => {
      const user = userEvent.setup();
      render(
        <Tooltip text="Portal tip" position="no-transform" portal>
          <button>Trigger</button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole("button", { name: "Trigger" }));
      expect(screen.getByRole("tooltip")).not.toHaveStyle({
        transform: "translate(-50%, -100%)",
      });
      expect(screen.getByRole("tooltip")).not.toHaveStyle({
        transform: "translateX(-50%)",
      });
      expect(screen.getByRole("tooltip").style.transform).toBe("");
    });

    describe("portal mode with noTouch", () => {
      it("does not apply touch-action: none to the wrapper span", () => {
        render(
          <Tooltip text="Portal tip" portal noTouch>
            <button>Trigger</button>
          </Tooltip>,
        );
        const wrapper = screen.getByRole("button").parentElement!;
        expect(wrapper.style.touchAction).not.toBe("none");
      });

      it("does not show tooltip when touchstart precedes mouseenter", () => {
        render(
          <Tooltip text="Portal tip" portal noTouch>
            <button>Trigger</button>
          </Tooltip>,
        );
        const wrapper = screen.getByRole("button").parentElement!;
        act(() => {
          fireEvent.touchStart(wrapper);
          fireEvent.mouseEnter(wrapper);
        });
        expect(screen.getByRole("tooltip")).toHaveClass("opacity-0");
      });

      it("still shows tooltip on plain mouse hover after a prior touch interaction", () => {
        render(
          <Tooltip text="Portal tip" portal noTouch>
            <button>Trigger</button>
          </Tooltip>,
        );
        const wrapper = screen.getByRole("button").parentElement!;
        act(() => {
          // Simulate touch sequence (should be suppressed)
          fireEvent.touchStart(wrapper);
          fireEvent.mouseEnter(wrapper);
          fireEvent.mouseLeave(wrapper);
          // Simulate plain mouse hover
          fireEvent.mouseEnter(wrapper);
        });
        expect(screen.getByRole("tooltip")).toHaveClass("opacity-100");
      });

      it("clears the touch marker after suppressing a synthetic mouse enter", () => {
        render(
          <Tooltip text="Portal tip" portal noTouch>
            <button>Trigger</button>
          </Tooltip>,
        );
        const wrapper = screen.getByRole("button").parentElement!;

        fireEvent.touchStart(wrapper);
        fireEvent.mouseEnter(wrapper);
        fireEvent.mouseEnter(wrapper);

        expect(screen.getByRole("tooltip")).toHaveClass("opacity-100");
      });
    });
  });
});
